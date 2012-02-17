var {write, join, exists, makeDirectory} = require('fs');
var {command} = require('ringo/subprocess');
var dates = require('ringo/utils/dates');

var {Hit, Site, Distribution} = require('./model');
var config = require('./config');

/**
 * creates a png clickgraph for the given duration & site.
 */
var clickGraph = exports.clickGraph = function (dayOrMonth, site) {
   var keyDayOrMonth = dayOrMonth.length === 6 ? 'month' : 'day';
   var hits = Hit.query().
      equals(keyDayOrMonth, dayOrMonth).
      equals('site', site).
      select('*');
	var graph = {}; // {page: 'xy', hits: 4, referers: ['abc': 5, 'def': 7]}
	var maxRefs = 0;
	hits.forEach(function(hit) {
		var page = Distribution.Normalizer.page(hit.page, site.getDomains());
		var referer = Distribution.Normalizer.referer(hit.referer, site.getDomains());
		if (referer !== 'localDomain') return;

		referer = Distribution.Normalizer.page(hit.referer, site.getDomains());
		var node = graph[page] || {hits: 0, referers: {}};
		node.hits++;
		node.referers[referer] = (node.referers[referer] || 0 ) + 1;
		if (maxRefs < node.referers[referer]) {
		   maxRefs = node.referers[referer];
	   }
		graph[page] = node;
	});
	maxRefs = maxRefs / 2;
	var minHits = maxRefs / 2;
	var dot = ['digraph "' + site.title + '" {\nrankdir=LR\nlabel="Last updated: ' + dates.format(new Date(), 'dd.MMM HH:mm') + '. Only connections with min. ' + minHits + ' clicks displayed"\n'];
	//var externals = [];
	// FIXME count number of nodes -- thre must be a maximum
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
	// does the directory exist?
	var siteDir = join(config.clickgraph.directory, site.title);
	if (!exists(siteDir)) {
	   makeDirectory(siteDir);
	}
	var dotFile = join(siteDir, dayOrMonth + '.dot');
	write(dotFile, dot.join('\n'));

	var imgFile = join(siteDir, dayOrMonth + '.png');
   var imgData = command('/usr/bin/dot', '-Tpng', dotFile, {binary: true});
   write(imgFile, imgData, 'wb');
	return;
};