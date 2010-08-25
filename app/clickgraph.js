var {write, join} = require('fs');

var {Hit, Site, Distribution} = require('./model');
var {command} = require('bsubprocess');
var {clickGraphSettings} = require('./config');
var dates = require('ringo/utils/dates');
export('clickGraph');

/**
 * creates a png clickgraph for the given duration & site.
 * see clickGraphSettings in config-example.js
 */ 
function clickGraph(dayOrMonth, siteKey) {
   var keyDayOrMonth = dayOrMonth.length === 6 ? 'month' : 'day';
   var hits = Hit.query().
      equals(keyDayOrMonth, dayOrMonth).
      equals('site', siteKey).
      select();
   var site = Site.query().equals('title', siteKey).select()[0];
	
	var graph = {}; // {page: 'xy', hits: 4, referers: ['abc': 5, 'def': 7]}
	var maxRefs = 0;
	hits.forEach(function(hit) {
		var page = Distribution.Normalizer.page(hit.page, site.domains);
		var referer = Distribution.Normalizer.referer(hit.referer, site.domains);
		if (referer !== 'localDomain') return;
		
		referer = Distribution.Normalizer.page(hit.referer, site.domains);
		var node = graph[page] || {hits: 0, referers: {}};
		node.hits++;
		node.referers[referer] = (node.referers[referer] || 0 ) + 1;
		if (maxRefs < node.referers[referer]) maxRefs = node.referers[referer];
		graph[page] = node;
	});
	maxRefs = maxRefs / 2;
	
	var minHits = clickGraphSettings.sites[siteKey].minHits;
	var dot = ['digraph "' + siteKey + '" {\nrankdir=LR\nlabel="Last updated: ' + dates.format(new Date(), 'dd.MMM HH:mm') + '. Only connections with min. ' + minHits + ' clicks displayed"\n'];
	//var externals = [];
	for (var pageKey in graph) {
		var node = graph[pageKey];
		for (var refKey in node.referers) {
			let weight = node.referers[refKey];
			if (weight < (minHits || 10)) continue;
			
			//if (refKey.substr(0,4) === 'http') {
			//	externals.push('"' + refKey + '"');
			//}
			dot.push('"' + refKey + '" -> "' + pageKey + '" [style="setlinewidth(' + Math.max(1, parseInt(10*(weight/maxRefs))) + ')", label=' + weight + ']');
		};
	}
	//externals.push(' '); // so last node gets attributes when joined
	//dot.push('subgraph externalsites {');
	//dot.push(externals.join(' [color=blue]\n'));
	//dot.push('}');
	dot.push('}');
	// FIXME do this with streams, no need to write .dot file
	var dotFile = join(clickGraphSettings.directory, siteKey, dayOrMonth + '.dot');
	var imgFile = join(clickGraphSettings.directory, siteKey, dayOrMonth + '.png');
	try {
		write(dotFile, dot.join('\n'));
		write(imgFile, command('/usr/bin/dot', '-Tpng', dotFile), 'wb');
	} catch (e) {
		print (e);
	}
	return;
};

