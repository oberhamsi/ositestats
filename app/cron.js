var {Site, Hit, HitAggregate, Distribution, keyToDate, dateToKey} = require('./model');
var {clickGraph} = require('./clickgraph');
var {store, clickGraphSettings} = require('./config');
var log = require('ringo/logging').getLogger('cron');

/**
 * Returns the first timeKey for which the given entity has
 * Hits to process. This is used by updatestats() to determine
 * which Hits need processing.
 * @param {Prototype} entity either Distribution or HitAggregate
 * @param {String} duration 'hour' or 'month'
 */
var getTodoKey = exports.getTodoKey = function(entity, duration, site) {
   var item = entity.getNewest(site, duration);
   var starttime = null;
   
   if (item) {
      var hit = Hit.getNewest(site, duration);
      if (hit && hit[duration] >= item[duration]) {
         starttime = item[duration];
      }
   } else { 
      hit = Hit.getOldest(site);
      if (hit) starttime = hit[duration];
   }
   
   return starttime;
};

/**
 * Create HitAggregations and Distributions.
 * If there are unprocessed hits: update aggregation & distribution for the
 * appropriate timekeys.
 */
exports.updatestats = function() {
   //store.beginTransaction();
   log.info('[cron] starting...');
   for each (var site in Site.query().select()) {
      for each (var entity in [HitAggregate, Distribution]) {
         for each (var duration in ['day', 'month']) {
            if (entity == Distribution && duration === 'day') continue;
            
            // first key for which we need to calculate distribution & aggregation
            var startKey = getTodoKey(entity, duration, site);
            if (!startKey) continue;

            // increase key by duration and `create` dist & agg for each key
            // until we are at current time.
            var currentKey = startKey;
            var currentDate = keyToDate(startKey);
            var now = dateToKey(new Date(), duration);
            while (currentKey <= now) {
               var item = entity.create(currentKey, site);
               log.info('[cron] created/updated {}', item);
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
   //store.commitTransaction();
   
   // check if hits of last month are still in Hit model
   // if yes we move them into HitMMMM model.
   /*
   var lastMonth = new Date();
   lastMonth.setMonth(lastMonth.getMonth()-1);
   var monthKey = dateToKey(lastMonth, 'month');
   if (Hit.query().equals('month', monthKey).select().length > 0) {
      Hit.archive(monthKey);
      log.info('archived ' +  monthKey + ' hits');
   }
   */
   log.info('[cron] >done');
   return;
};

exports.updateClickGraph = function() {
	log.info('[cron] updating clickgraphs');
   for each (var site in Site.query().select()) {
      var siteKey = site.title;
		if (clickGraphSettings.sites[siteKey]) {
			clickGraph(dateToKey(new Date(), 'month'), site);
			log.info('[cron] clickgraph written for ' + siteKey);
		}
	}
	log.info('[cron] > done');
	return;
}
