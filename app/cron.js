var {Hit, HitAggregate, dateToKey, keyToDate} = require('./model');
var {store, log} = require('./config');

/**
 * @returns the latest starttime for a duration aggregate
 * which is not yet created. or null if all have been created.
 */
var getTodoKey = exports.getTodoKey = function(duration) {
   var ha = HitAggregate.getLast(duration);
   var starttime = null;
   
   if (ha) {
      var hit = Hit.getLast(duration);
      if (hit[duration] >= ha[duration]) {
         starttime = ha[duration];
      }
   } else { 
      hit = Hit.getFirst(duration);
      if (hit) starttime = hit[duration];
   }
   
   return starttime;
}

exports.hits = function() {
   store.beginTransaction();
   log.info('[cron.hits] checking');
   for each (var duration in ['day', 'month']) {
      var startKey = getTodoKey(duration);
      if (!startKey) continue;

      var currentKey = startKey;
      var currentTs = keyToDate(startKey).getTime();
      var now = dateToKey(new Date(), duration);
      while (currentKey <= now) {
         var ha = HitAggregate.create(currentKey);
         log.info('[cron.aggregate] create or update {}', ha);
         // FIX date calculation
         if (duration === 'day') {
            currentTs += (1000 * 60 * 60 * 24);
         } else {
            currentTs += (1000 * 60 * 60 * 24 * 33);
         }
         currentKey = dateToKey(new Date(currentTs), duration);
      }
   }
   store.commitTransaction();
   return;
};

exports.distributions = function() {
  if (!key in ['userAgent', 'referer', 'page']) {
      key = 'userAgent';
   }

   var NORMALIZER = {
      'userAgent': function(rawKey) {

      },
      'referer': function(rawKey) {

      },
      'page': function(rawKey) {

      },
   };

   var [hits, stime, etime] = Hit.getForRange(txtStartime, txtDuration);

   var hitsLength = hits.length;
   var counter = {};
   var normalize = NORMALIZER[key];
   var totalCount = 0;
   // FIXME smarter sample taking
   for (var i=0;i < Math.min(hitsLength * 0.8, 1000);i++) {
      var hit = hits[i];
      var nKey = normalize(hit[k]);
      var count = counter[nKey];
      if (count === undefined) count = 0;
      count++;
      totalCount++;
   }


   // calc distributions
   var distributions = {};
   for (var cKey in counter) {
      distributions[cKey] = parseInt((counter[cKey] / totalCount) * 1000, 10);
   }

   (new Distribution({
      'key': key,
      'duration': txtDuration,
      'starttime': stime,
      'endtime': etime,
      'distributions': distributions,
   })).save();

}
