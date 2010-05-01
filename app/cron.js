var {HitAggregate} = require('./model');
var log = require('ringo/logging').getLogger(module.id);

exports.aggregate = function() {
   for each (var duration in ['hour', 'day', 'month']) {
      var starttime = HitAggregate.getTodoStarttime(duration);
      if (!starttime) continue;

      HitAggregate.create(starttime, duration);
      log.info('[cron.aggregate] Created {} - Aggregate starting at {} ', duration, starttime);
   }
   return;
};
