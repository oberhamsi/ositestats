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
      'uniques': this.uniques,
      'hits': this.hits,
   }
};

HitAggregate.create = function(txtStarttime, txtDuration) {
   var [hits, stime, etime] = Hit.getForRange(txtStarttime, txtDuration);
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
   txtDuration = txtDuration || 'day';
   var stime = txtStarttime && new Date(txtStarttime) || new Date();
   stime = floorTime(stime, txtDuration);
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
            equals('starttime', stime.getTime()).select(),
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
         starttime = ceilTime(new Date(ha.endtime)).getTime();
      }
   } else { 
      hit = Hit.getFirst();
      starttime = hit && hit.timestamp && 
               floorTime(new Date(hit.timestamp), duration).getTime();
   }

   // only aggregate history timeranges
   // DEUBG deactivated for DEBUG
   if (floorTime(new Date(starttime), duration).getTime() < floorTime(new Date(), duration).getTime()) {
      return starttime || null;
   }
   
   return null;
}

HitAggregate.getLatest = function(duration) {
   var hitAggregates = HitAggregate.query().equals('duration', duration).select();
   var latestStarttime = 0;
   var latestAggregate = null;
   for each (var ha in hitAggregates) {
      if (ha.starttime > latestStarttime) {
         latestAggregate = ha;
      }
   }
   return latestAggregate;
}

Hit.getForRange = function(txtStarttime, txtDuration) {
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
   for each (var hit in hits) {
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
   for each (var hit in hits) {
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

var ceilTime = function(time, duration) {
   if ('month' == duration) {
      time = new Date(time.getTime());
      // FIXME wrap around newyear
      time.setMonth(time.getMonth()+1);
   } else if ('day' == duration) {
      time = new Date(time.getTime() + (1000 * 60 * 60 * 24));
   } else { // hour, default
      time = new Date(time.getTime() + (1000 * 60 * 60));
   }
   return time;

}

var getStartEndTime = function(txtStarttime, txtDuration) {
   var stime = txtStarttime ? new Date(txtStarttime) : new Date();
   var stime = floorTime(stime, txtDuration);
   var etime = ceilTime(stime, txtDuration);
   return [stime, etime];
}


