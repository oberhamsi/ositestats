include('core/array');
include('core/number');
var $f = require('ringo/utils').format;
export('Hit', 'HitAggregate', 'Distribution');
module.shared = true;

var {store, log} = require('./config');

// FIXME would getLast/getFirst would be super fast with
//       access to berkley cursors
var getLast = exports.getLast = function(entity, duration) {
   var items = [];
   if (entity === Hit) {
      items = entity.query().select();
   } else {
      items = entity.query().equals('duration', duration).select();
   }
   return items[items.length-1];
};

var getFirst = exports.getFirst = function(entity, duration) {
   var items = [];
   if (entity === Hit) {
      items = entity.query().select();
   } else {
      items = entity.query().equals('duration', duration).select();
   }
   return items[0];
};

/**
 * Distribution
 */
var Distribution = store.defineClass('Distribution');

Distribution.prototype.toString = function() {

   return $f("[Distribution: {}, {} - {}", 
         this.key, this[this.duration], this.distributions && this.distributions.toSource());
};

/**
 * normalizer values before calculation distribution
 */
Distribution.Normalizer = {
   'userAgent': function(rawKey) {
      rawKey = rawKey.toLowerCase();
      var os;
      // order is significant
      var oses = ['mac', 'linux', 'blackberry', 'iphone', 'windows'];
      var os = 'windows';
      for each (o in oses) {
         if (rawKey.indexOf(o) > -1) os = o;
      }
      var browsers = ['firefox', 'safari', 'opera', 'chrome'];
      var browser = 'ie'
      for each (b in browsers) {
         if (rawKey.indexOf(b) > -1) browser = b;
      }
      return browser + ', ' + os;
   },
   'referer': function(rawKey) {
      return rawKey.split('/').slice(0,3).join('/')
   },
   'page': function(rawKey) {
      return rawKey;
   },
};

Distribution.create = function(monthKey) {
   
   var hits = Hit.query().
      equals('month', monthKey).select();
   var hitsCount = hits.length;
   var date = keyToDate(monthKey);
   var newDistributions = [];
   for each (var key in ['userAgent', 'referer', 'page']) {
      var counter = {};
      var normalize = Distribution.Normalizer[key];
      // FIXME smarter sample taking, don't check them all
      for (var i=0; i<hitsCount; i++) {
         var hit = hits[i];
         var distributionKey = normalize(hit[key]);
         if (counter[distributionKey] === undefined) counter[distributionKey] = 0;
         counter[distributionKey]++;
      }

      // calc distributions
      var distributions = {};
      for (var cKey in counter) {
         distributions[cKey] = parseInt((counter[cKey] / hitsCount) * 1000, 10);
      }
      var distribution = Distribution.query().
         equals('duration', 'month').
         equals('month', monthKey).
         equals('key', key).select()[0] || new Distribution();

      distribution.duration = 'month';
      distribution.key = key;
      distribution.distributions = distributions;
      distribution.month = monthKey;
      distribution.year = dateToKey(date, 'year');
      distribution.save();
      newDistributions.push(distribution.serialize());
   };
   return newDistributions;
}

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
   return $f('[HitAggregate: {} {} , hits: {}, uniques: {}]', 
         this.duration, this[this.duration], this.hits, this.uniques);
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

/**
 * @returns the latest starttime for a duration aggregate
 * which is not yet created. or null if all have been created.
 */
HitAggregate.getTodoKey = function(duration) {
   var ha = getLast(HitAggregate, duration);
   var starttime = null;
   
   if (ha) {
      var hit = getLast(Hit, duration);
      if (hit[duration] >= ha[duration]) {
         starttime = ha[duration];
      }
   } else { 
      hit = getFirst(Hit, duration);
      if (hit) starttime = hit[duration];
   }
   
   return starttime;
}

/**
 * create or update the HitAggregate for the given timeKey
 */
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

/**
 * Hit
 */
var Hit = store.defineClass('Hit');

Hit.prototype.toString = function() {
   return $f('[{} - {} - {} - {}]', this.ip, new Date(this.timestamp), this.page, this.userAgent);
};

/**
 * `key` helpers
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
      var day = parseInt(key.substr(6,2), 10);
      month = parseInt(key.substr(4,2), 10);
      date.setDate(day);
   // month
   } else if (key.length == 6) {
      date.setDate(1);
      month = parseInt(key.substr(4,2), 10);
   // year
   } else if (key.length == 4) {
      date.setDate(1);
   }
   date.setYear(year);
   date.setMonth(month);
   date.setHours(0);
   date.setMinutes(0);
   date.setSeconds(0);
   date.setMilliseconds(0);
   return date;
}
