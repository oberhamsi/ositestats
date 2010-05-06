include('./model');
var {store, log} = require('./config');

/**
 * entity either Distribution or HitAggregate
 */
var getTodoKey = exports.getTodoKey = function(entity, duration) {
   var item = getLast(entity, duration);
   var starttime = null;
   
   if (item) {
      var hit = getLast(Hit, duration);
      if (hit[duration] >= item[duration]) {
         starttime = item[duration];
      }
   } else { 
      hit = getFirst(Hit, duration);
      if (hit) starttime = hit[duration];
   }
   
   return starttime;
};

exports.createstats = function() {
   store.beginTransaction();
   log.info('[cron] starting...');
   for each (var entity in [HitAggregate, Distribution]) {
      for each (var duration in ['day', 'month']) {
         if (entity == Distribution && duration === 'day') continue;
         
         var startKey = getTodoKey(entity, duration);
         if (!startKey) continue;

         var currentKey = startKey;
         var currentTs = keyToDate(startKey).getTime();
         var now = dateToKey(new Date(), duration);
         while (currentKey <= now) {
            var item = entity.create(currentKey);
            log.info('[cron] created/updated {}', item);
            // FIX date calculation
            if (duration === 'day') {
               currentTs += (1000 * 60 * 60 * 24);
            } else {
               currentTs += (1000 * 60 * 60 * 24 * 33);
            }
            currentKey = dateToKey(new Date(currentTs), duration);
         }
      }
   }
   store.commitTransaction();
   log.info('[cron] >done');
   return;
};

exports.distributions = function() {


}
