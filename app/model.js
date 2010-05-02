require('core/array');
include('datejs');
var $f = require('ringo/utils').format;
export('Hit', 'HitAggregate', 'Distribution');
module.shared = true;

var store = require('./config').store

/**
 * Distribution
 */
var Distribution = store.defineClass('Distribution');

/**
 * HitAggregate
 */
var HitAggregate = store.defineClass('HitAggregate');

Object.defineProperty(HitAggregate.prototype, 'enddatetime', {
   get: function() {
      return this.endtime ? new Date(this.endtime) : null;
   },
   set: function(val) {
      this.endtime = val ? val.getTime() : null;
      return
   },
   configurable: true,
});

Object.defineProperty(HitAggregate.prototype, 'startdatetime', {
   get: function() {
      return this.starttime ? new Date(this.starttime) : null;
   },
   configurable: true,
});


HitAggregate.prototype.toString = function() {
   return $f('[{}: {} - {}, hits: {}, uniques: {}]', 
         this.duration, this.startdatetime, this.enddatetime, this.hits, this.uniques);
};

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
      'starttime': stime,
      'endtime': etime,
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
            equals('starttime', stime).select(),
         stime,
         etime
   ];
};

/**
 * @returns the latest starttime for a duration aggregate
 * which is not yet created. or null if all have been created.
 */
HitAggregate.getTodoStarttime = function(duration) {
   var ha = HitAggregate.getLast(duration);
   var starttime = null;
   
   if (ha) {
      var hit = Hit.getLast();
      if (hit.datetime.isAfter(ha.enddatetime)) {
         starttime = ha.enddatetime;
      }
   } else { 
      hit = Hit.getFirst();
      starttime = hit && hit.datetime && 
               floorTime(hit.datetime, duration);
   }

   // only aggregate history timeranges
   // DEUBG deactivated for DEBUG
   if (starttime.isBefore(floorTime(new Date(), duration))) {
      return starttime || null;
   }
   
   return null;
}

HitAggregate.getLast = function(duration) {
   var hitAggregates = HitAggregate.query().equals('duration', duration).select();
   var latestStarttime = new Date(0);
   var latestAggregate = null;
   for each (var ha in hitAggregates) {
      if (ha.startdatetime.isAfter(latestStarttime)) {
         latestAggregate = ha;
         latestStarttime = ha.startdatetime;
      }
   }
   return latestAggregate;
}

/**
 * Hit
 */
var Hit = store.defineClass('Hit');
Hit.getForRange = function(txtStarttime, txtDuration) {
   var [stime, etime] = getStartEndTime(txtStarttime, txtDuration);
   return [
      Hit.query().
         greaterEquals('timestamp', stime).
         less('timestamp', etime).select(),
      stime,
      etime
   ];
};

/**
 * timestamp getter/setter
 */
Object.defineProperty(Hit.prototype, "datetime", {
   get: function() {
      return this.timestamp ? new Date(this.timestamp) : null;
   },
   set: function(val) {
      this.timestamp = val ? val.getTime() : null;
   },
   configurable: true,
});

Hit.prototype.toString = function() {
   return $f('[{} - {} - {} - {}]', this.ip, this.datetime, this.page, this.userAgent);
};

Hit.getLast = function() {
   var hits = Hit.query().select();
   var latestStarttime = new Date(0);
   var latestHit = null;
   for each (var hit in hits) {
      if (hit.datetime.isAfter(latestStarttime)) {
         latestHit = hit;
         latestStarttime = hit.datetime;
      }
   }
   return latestHit;
}

Hit.getFirst = function() {
   var hits = Hit.query().select();
   var latestStarttime = new Date();
   var latestHit = null;
   for each (var hit in hits) {
      if (hit.datetime.isBefore(latestStarttime)) {
         latestHit = hit;
         latestStarttime = hit.datetime;
      }
   }
   return latestHit;
}

/** 
 * helpers
 *
 */

var floorTime = exports.floorTime = function(atime, duration) {
   var time = new Date(atime);
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

var ceilTime = exports.ceilTime = function(atime, duration) {
   var time = new Date(atime);
   time.setMinutes(0);
   time.setSeconds(0);
   time.setMilliseconds(0);
   if ('month' == duration) {
      time.addMonths(1);
   } else if ('day' == duration) {
      time.addDays(1);
   } else {
      time.addHours(1);
   }
   return time;

}

var getStartEndTime = exports.getStartEndTime = function(txtStarttime, txtDuration) {
   var stime = txtStarttime ? new Date(txtStarttime) : new Date();
   var stime = floorTime(stime, txtDuration);
   var etime = ceilTime(stime, txtDuration);
   return [stime, etime];
}


