var {HitAggregate} = require('./model');
var {store} = require('./config');
var log = require('ringo/logging').getLogger(module.id);

exports.hits = function() {
   store.beginTransaction();
   log.info('[cron.hits] checking');
   for each (var duration in ['hour', 'day', 'month']) {
      var starttime = HitAggregate.getTodoStarttime(duration);
      if (!starttime) continue;

      var now = new Date();
      var rmObj = {};
      rmObj[duration + 's'] = -1;
      now.add(rmObj);
      while (starttime.isBefore(now)) {
         var ha = HitAggregate.create(starttime, duration);
         log.info('[cron.aggregate] Created {}', ha);
         var addObj = {}
         addObj[duration + 's'] = 1;
         starttime.add(addObj);
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
