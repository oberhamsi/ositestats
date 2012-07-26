// custom
var {dateToKey} = require('../helpers');
var {clickGraph} = require('../clickgraph');
var config = require('../config').data;
var store = config.store;

var log = require('ringo/logging').getLogger(module.id);
var {setInterval} = require('ringo/scheduler');

/**
 * Create HitAggregations and Distributions.
 * If there are unprocessed hits: update aggregation & distribution for the
 * appropriate timekeys.
 */
var updateStats = function() {
   for each (var site in store.query('from Site')) {
      site.aggregate(log);
   } // each site
   return;
};

var updateClickgraph = function() {
   for each (var site in store.query('from Site')) {
      var siteKey = site.title;
		if (config.clickgraph.sites.indexOf(siteKey) != -1) {
			clickGraph(dateToKey(new Date(), 'month'), site);
			log.info('Clickgraph written for ' + siteKey);
		}
	}
	return;
};

var isRunning = false;
function onmessage() {
   if (isRunning) {
      return;
   }
   isRunning = true;
   setInterval(function() {
      try {
         updateStats();
      } catch (e) {
         log.error (e);
      }
   }, config.interval.statistics * 1000);

   setInterval(function() {
      try {
         updateClickgraph();
      } catch (e) {
         log.error (e);
      }
   }, config.interval.clickgraph * 1000);
   log.info('Started');

}

