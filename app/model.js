include('core/array');
include('core/number');
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

Object.defineProperty(HitAggregate.prototype, 'starttime', {
   get: function() {
      return keyToDate(this[this.duration]);
   },
   configurable: true,
});

HitAggregate.prototype.toString = function() {
   return $f('[{}: {} , hits: {}, uniques: {}]', 
         this.duration, this.day || this.month, this.hits, this.uniques);
};

HitAggregate.prototype.serialize = function() {
   return {
      'duration': this.duration,
      'day': this.day,
      'month': this.month,
      'uniques': this.uniques,
      'hits': this.hits,
   };
};

HitAggregate.create = function(dayOrMonth) {
   var keyDayOrMonth = dayOrMonth.length === 6 ? 'month' : 'day';
   var otherKey = dayOrMonth.length === 6 ? 'day' : 'month';
   var hits = Hit.query().
      equals(keyDayOrMonth, dayOrMonth).select();

   var uCount = 0;
   var uniques = {};
   for each (var hit in hits) {
      if (!uniques[hit.unique]) {
         uniques[hit.unique] = true;
         uCount++;
      }
   }

   var date = keyToDate(dayOrMonth);
   var hitAggregate = HitAggregate.query().
      equals('duration', keyDayOrMonth).
      equals(keyDayOrMonth, dayOrMonth).select()[0] || new HitAggregate();
   hitAggregate.duration = keyDayOrMonth;
   hitAggregate.year = dateToKey(date, 'year');
   hitAggregate.uniques = uCount;
   hitAggregate.hits = hits.length;
   
   hitAggregate[keyDayOrMonth] = dayOrMonth;
   hitAggregate[otherKey] = dateToKey(date, otherKey);

   hitAggregate.save();
   return hitAggregate;
}

HitAggregate.getLast = function(duration) {
   var hitAggregates = HitAggregate.query().equals('duration', duration).select();
   var latestStarttime = "";
   var latestAggregate = null;
   for each (var ha in hitAggregates) {
      if (ha[duration] > latestStarttime) {
         latestAggregate = ha;
         latestStarttime = ha[duration];
      }
   }
   return latestAggregate;
}

/**
 * Hit
 */
var Hit = store.defineClass('Hit');

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

Hit.getLast = function(duration) {
   var hits = Hit.query().select();
   var latestStarttime = 0;
   var latestHit = null;
   for each (var hit in hits) {
      if (hit[duration] > latestStarttime) {
         latestHit = hit;
         latestStarttime = hit[duration];
      }
   }
   return latestHit;
}

Hit.getFirst = function(duration) {
   var hits = Hit.query().select();
   var latestStarttime = Infinity;
   var latestHit = null;
   for each (var hit in hits) {
      if (hit[duration] < latestStarttime) {
         latestHit = hit;
         latestStarttime = hit[duration];
      }
   }
   return latestHit;
}

/**
 * 
 */

var dateToKey = exports.dateToKey = function(date, duration) {
   if (duration === 'day') {
      return [date.getFullYear(), date.getMonth().format("00"), date.getDate().format("00")].join('');
   } else if (duration === 'month') {
      return [date.getFullYear(), date.getMonth().format("00")].join('');
   } else if (duration === 'year') {
      return ""+date.getFullYear();
   }
}

var keyToDate = exports.keyToDate = function(key) {
   var date = new Date();
   var year = parseInt(key.substr(0,4), 10);
   var month = 0;
   // day
   if (key.length === 8) {
      var day = parseInt(key.substr(7,2), 10);
      month = parseInt(key.substr(5,2), 10);
      date.setDate(day);
   // month
   } else if (key.length == 6) {
      date.setDate(0);
      month = parseInt(key.substr(5,2), 10);
   // year
   } else if (key.length == 4) {
      date.setDate(0);
   }
   date.setYear(year);
   date.setMonth(month);
   date.setHours(0);
   date.setMinutes(0);
   date.setSeconds(0);
   date.setMilliseconds(0);
   return date;
}
