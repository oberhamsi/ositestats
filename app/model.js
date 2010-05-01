require('core/array');
export('Hit', 'HitAggregate', 'Distribution');
module.shared = true;

var store = require('./config').store

var Hit = store.defineClass('Hit');
var HitAggregate = store.defineClass('HitAggregate');
var Distribution = store.defineClass('Distribution');

HitAggregate.prototype.serialize = function() {
   return {
      'starttime': this.starttime,
      'endtime': this.endtime,
      'duration': this.duration,
      'uniques': this.unique,
      'hits': this.hits,
   }
};

HitAggregate.create = function(txtStarttime, txtDuration) {
   var [hits, stime, etime] = Hit.forRange(txtStarttime, txtDuration);
   var uniques = [];
   for each (var hit in hits) {
      var unique = hit.unique;
      if (!uniques.contains(unique)) uniques.push(unique);
   }

   var hitAggregrate = new HitAggregate({
      'starttime': stime.getTime(),
      'endtime': etime.getTime(),
      'duration': txtDuration, // day, month, hour
      'uniques': uniques.length,
      'hits': hits.length,
   });
   hitAggregrate.save();
   return hitAggregrate;
}

/**
 * @param {String} txtEndtime optional endtime
 */
HitAggregate.getForRange = function(txtStarttime, txtDuration, txtEndtime) {
   var stime = txtStarttime && new Date(txtStarttime) || new Date();
   stime = floorTime(stime);
   var etime;
   if (txtEndtime) {
      etime = new Date(txtEndtime);
   } else {
      var tmp;
      [tmp, etime] = getStartEndTime(stime, txtDuration);
   }
   return [
         HitAggregate.query().
            equals('duration', txtDuration).
            greaterEquals('timestamp', stime.getTime()).
            less('timestamp', etime.getTime()).select(),
         stime,
         etime
   ];
};

/**
 * @returns the latest starttime for a duration aggregate
 * which is not yet created. or null if all have been created.
 */
HitAggregate.getTodoStarttime = function(duration) {
   var ha = HitAggregate.getLatest(duration);
   var starttime = null;
   
   if (ha) {
      var hit = Hit.getLatest(duration);
      if (hit.timestamp > ha.endtime) {
         starttime = ha.endtime;
         if ('hour' == duration) {
            starttime = new Date(starttime + (1000 * 60 * 60)).getTime();
         } else if ('day' == duration) {
            starttime = new Date(starttime + (1000 * 60 * 60 * 24)).getTime();
         } else {
            starttime = new Date(starttime);
            // FIXME wrap year
            starttime.setMonth(starttime.getMonth()+1);
            starttime = starttime.getTime();
         }

      }
   } else { 
      hit = Hit.getFirst();
      starttime = hit && hit.timestamp && floorTime(new Date(hit.timestamp), duration).getTime();
   }

   // only aggregate history timeranges
   //if (floorTime(new Date(hit.timestamp), duration).getTime() < floorTime(new Date(), duration).getTime()) {
      return starttime || null;
   //}
   
   return null;
}

HitAggregate.getLatest = function(duration) {
   var hitAggregates = HitAggregate.query().equals('duration', duration).select();
   var latestStarttime = 0;
   var latestAggregate = null;
   for each (ha in hitAggregates) {
      if (ha.starttime > latestStarttime) {
         latestAggregate = ha;
      }
   }
   return latestAggregate;
}

Hit.forRange = function(txtStarttime, txtDuration) {
   var [stime, etime] = getStartEndTime(txtStarttime, txtDuration);
   return [
      Hit.query().
         greaterEquals('timestamp', stime.getTime()).
         less('timestamp', etime.getTime()).select(),
      stime,
      etime
   ];
};

Hit.getLatest = function() {
   var hits = Hit.query().select();
   var latestStarttime = 0;
   var latestHit = null;
   for each (hit in hits) {
      if (hit.timestamp > latestStarttime) {
         latestHit = hit;
      }
   }
   return latestHit;
}

Hit.getFirst = function() {
   var hits = Hit.query().select();
   var latestStarttime = Infinity;
   var latestHit = null;
   for each (hit in hits) {
      if (hit.timestamp < latestStarttime) {
         latestHit = hit;
      }
   }
   return latestHit;
}

var floorTime = function(time, duration) {
   time.setMinutes(0);
   time.setSeconds(0);
   time.setMilliseconds(0);
   if ('month' == duration) {
      time.setDate(0);
      time.setHours(0);
   } else if ('day' == duration) {
      time.setHours(0);
   }
   return time;

}

var getStartEndTime = function(txtStarttime, txtDuration) {
   var stime = txtStarttime ? new Date(txtStarttime) : new Date();
   stime = floorTime(stime, txtDuration);
   if ('month' == txtDuration) {
      etime = new Date(stime.getTime());
      // FIXME wrap around newyear
      etime.setMonth(stime.getMonth()+1);
   } else if ('day' == txtDuration) {
      etime = new Date(stime.getTime() + (1000 * 60 * 60 * 24));
   } else { // hour, default
      etime = new Date(stime.getTime() + (1000 * 60 * 60));
   }
   return [stime, etime];
}


