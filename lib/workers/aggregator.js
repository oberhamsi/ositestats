// custom
var {Site, Hit, HitAggregate, Distribution, keyToDate, dateToKey, getTodoKey} = require('../model');
var {clickGraph} = require('../clickgraph');
var config = require('../config').data;

var log = require('ringo/logging').getLogger(module.id);
var {setInterval} = require('ringo/scheduler');

/**
 * Create HitAggregations and Distributions.
 * If there are unprocessed hits: update aggregation & distribution for the
 * appropriate timekeys.
 */
var updateStats = function() {
   for each (var site in Site.query().select()) {
      for each (var entity in [HitAggregate, Distribution]) {
         for each (var duration in ['day', 'month']) {
            if (entity == Distribution && duration === 'day') continue;

            // first key for which we need to calculate distribution & aggregation
            var startKey = getTodoKey(entity, duration, site);
            if (!startKey) continue;

            // increase key by duration and create dist & agg for each key
            // until we are at current time.
            var currentKey = startKey;
            var currentDate = keyToDate(startKey);
            var now = dateToKey(new Date(), duration);
            while (currentKey <= now) {
               var item = entity.create(currentKey, site);
               log.info(item.toString());
               if (duration === 'day') {
                  currentDate.setDate(currentDate.getDate()+1);
               } else {
                  currentDate.setMonth(currentDate.getMonth()+1);
               }
               currentKey = dateToKey(currentDate, duration);
            }
         }
      }
   } // each site
   return;
};

var updateClickgraph = function() {
   for each (var site in Site.query().select()) {
      var siteKey = site.title;
		if (config.clickgraph.sites.indexOf(siteKey) != -1) {
			clickGraph(dateToKey(new Date(), 'month'), site);
			log.info('Clickgraph written for ' + siteKey);
		}
	}
	return;
};

/**
 *
 */
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
