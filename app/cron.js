include('./model');

var {clickGraph} = require('./clickgraph');
var {store, log, clickGraphSettings} = require('./config');

/**
 * Returns the first timeKey for which the given entity has
 * Hits to process. This is used by updatestats() to determine
 * which Hits need processing.
 * @param {Prototype} entity either Distribution or HitAggregate
 * @param {String} duration 'hour' or 'month'
 */
var getTodoKey = exports.getTodoKey = function(entity, duration, siteKey) {
   var item = getLast(entity, duration, siteKey);
   var starttime = null;
   
   if (item) {
      var hit = getLast(Hit, duration, siteKey);
      if (hit[duration] >= item[duration]) {
         starttime = item[duration];
      }
   } else { 
      hit = getFirst(Hit, duration, siteKey);
      if (hit) starttime = hit[duration];
   }
   
   return starttime;
};

/**
 * create HitAggregations and Distributions.
 */
exports.updatestats = function() {
   store.beginTransaction();
   log.info('[cron] starting...');
   for each (var site in Site.query().select()) {
      var siteKey = site.title;
      var siteDomains = site.domains;      
      for each (var entity in [HitAggregate, Distribution]) {
         for each (var duration in ['day', 'month']) {
            if (entity == Distribution && duration === 'day') continue;
            
            var startKey = getTodoKey(entity, duration, siteKey);
            if (!startKey) continue;

            var currentKey = startKey;
            var currentDate = keyToDate(startKey);
            var now = dateToKey(new Date(), duration);
            while (currentKey <= now) {
               var item = entity.create(currentKey, siteKey);
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
   store.commitTransaction();
   log.info('[cron] >done');
   return;
};

exports.updateClickGraph = function() {
	log.info('[cron] updating clickgraphs');
   for each (var site in Site.query().select()) {
      var siteKey = site.title;
		if (clickGraphSettings.sites[siteKey]) {
			clickGraph(dateToKey(new Date(), 'month'), siteKey);
			log.info('[cron] clickgraph written for ' + siteKey);
		}
	}
	log.info('[cron] > done');
	return;
}
