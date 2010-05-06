include('./model');
module.shared = true;

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

exports.updatestats = function() {
   store.beginTransaction();
   log.info('[cron] starting...');
   for each (var entity in [HitAggregate, Distribution]) {
      for each (var duration in ['day', 'month']) {
         if (entity == Distribution && duration === 'day') continue;
         
         var startKey = getTodoKey(entity, duration);
         if (!startKey) continue;

         var currentKey = startKey;
         var currentDate = keyToDate(startKey);
         var now = dateToKey(new Date(), duration);
         while (currentKey <= now) {
            var item = entity.create(currentKey);
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
   store.commitTransaction();
   log.info('[cron] >done');
   return;
};

exports.distributions = function() {


}
