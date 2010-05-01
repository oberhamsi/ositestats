require('core/array');
export('Hit', 'HitAggregate', 'Distribution');
module.shared = true;

var store = require('./config').store

var Hit = store.defineClass('Hit');
var HitAggregate = store.defineClass('HitAggregate');
var Distribution = store.defineClass('Distribution');

Hit.forRange = function(txtStarttime, txtDuration) {
   var [stime, etime] = getStartEndTime(txtStarttime, txtDuration);
   print([stime, etime]);
   return [
      Hit.query().greaterEquals('timestamp', stime.getTime()).
            less('timestamp', etime.getTime()).select(),
      stime,
      etime
   ];

};

var getStartEndTime = function(txtStarttime, txtDuration) {
   var stime = txtStarttime ? new Date(txtStarttime) : new Date();
   stime.setMinutes(0);
   stime.setSeconds(0);
   stime.setMilliseconds(0);
   var etime = null;
   if ('month' == txtDuration) {
      stime.setDate(0);
      stime.setHours(0);
      etime = new Date(stime.getTime());
      // FIXME wrap around newyear
      etime.setMonth(stime.getMonth()+1);
   } else if ('day' == txtDuration) {
      stime.setHours(0);
      etime = new Date(stime.getTime() + (1000 * 60 * 60 * 24));
   } else { // hour, default
      etime = new Date(stime.getTime() + (1000 * 60 * 60));
   }
   return [stime, etime];
}


