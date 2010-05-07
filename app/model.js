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
 * A Distribution stores the monthly distribution of a Hit attribute. For example
 * we create a Distribution for the attribute userAgent.
 */
var Distribution = store.defineClass('Distribution');

/**
 * String rep
 */
Distribution.prototype.toString = function() {

   return $f("[Distribution: {}, {} - {}", 
         this.key, this[this.duration], this.distributions && this.distributions.toSource());
};

/**
 * Hit attributes should be normalized before we calculate their distribution to
 * keep the amount of different values sane (e.g. we only differentiate between
 * IE, FF, safari but not their versions).
 */
Distribution.Normalizer = {
   'userAgent': function(rawKey) {
      rawKey = rawKey.toLowerCase();
      var os;
      // order is significant
      var oses = ['mac', 'linux', 'blackberry', 'iphone', 'windows'];
      var os = 'windows';
      for each (var o in oses) {
         if (rawKey.indexOf(o) > -1) os = o;
      }
      var browsers = ['firefox', 'safari', 'opera', 'chrome'];
      var browser = 'ie'
      for each (var b in browsers) {
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

/**
 * Creates or updates several Distributions for the given month.
 * @param {String} montKey
 * @returns {Array} array of serialized distributions created/updated
 */
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
      newDistributions.push(distribution.toString());
   };
   return newDistributions;
}

/**
 * HitAggregates exist for days and months. They hold the amount of uniques
 * and hits for their duration.
 */
var HitAggregate = store.defineClass('HitAggregate');

Object.defineProperty(HitAggregate.prototype, 'starttime', {
   get: function() {
      return keyToDate(this[this.duration]);
   },
   configurable: true,
});

/**
 * String rep
 */
HitAggregate.prototype.toString = function() {
   return $f('[HitAggregate: {} {} , hits: {}, uniques: {}]', 
         this.duration, this[this.duration], this.hits, this.uniques);
};

/**
 * Serialize the HitAggregate so it can be stringified.
 */
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
 * Creates or updates the HitAggregate for the given timeKey.
 * @param {String} dayOrMonth a timeKey string, e.g. '201004', '20100405'
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
 * Hit. A single PageView by a client.
 */
var Hit = store.defineClass('Hit');

/**
 * String rep
 */
Hit.prototype.toString = function() {
   return $f('[{} - {} - {} - {}]', this.ip, new Date(this.timestamp), this.page, this.userAgent);
};

/**
 * Converts a Date to a timeKey.
 * @param {Date} date the date to convert
 * @param {String} duration the kind of key we want: 'day', 'month', or 'year'.
 * @returns {String} the key for the given date and duration
 *
 */
var dateToKey = exports.dateToKey = function(date, duration) {
   if (duration === 'day') {
      return [date.getFullYear(), date.getMonth().format("00"), date.getDate().format("00")].join('');
   } else if (duration === 'month') {
      return [date.getFullYear(), date.getMonth().format("00")].join('');
   } else if (duration === 'year') {
      return ""+date.getFullYear();
   } else {
      throw new Error('unknown duration');
   }
}

/**
 * Converts a timeKey to a Date
 * @param {String} key the key to convert
 * @return {Date} date for the key
 */
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
