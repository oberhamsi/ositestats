var {store} = require('../config').data;
var {Hit} = require('./hit');
var {keyToDate, dateToKey} = require('../helpers');
var $f = require('ringo/utils/strings').format;

var MAPPING_HITAGGREGATE = {
   table: 'hitaggregate',
   properties: {
      hits: {type: 'long'},
      uniques: {type: 'long'},
      duration: {type: 'string'},
      day: {type: 'string'},
      month: {type: 'string'},
      year: {type: 'string'},
      site: {
         type: 'object',
         entity: 'Site',
      }
   }
};

var unique = function(array) {
   return array.filter(function(item, idx) {
      return idx === array.lastIndexOf(item);
   });
};


/**
 * HitAggregates exist for days and months. They hold the amount of uniques
 * and hits for their duration.
 */
var HitAggregate = exports.HitAggregate = store.defineEntity('HitAggregate', MAPPING_HITAGGREGATE);

HitAggregate.getNewest = function(site, duration) {
   return store.query('from HitAggregate where HitAggregate.site = :site and HitAggregate.duration = :duration order by HitAggregate.day desc limit 1', {
      site: site._id,
      duration: duration
   })[0];
}

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
   return $f('[HitAggregate: {} {}, {} hits: {}, uniques: {}]',
         this.duration, this[this.duration], this.site, this.hits, this.uniques);
};

/**
 * Serialize the HitAggregate so it can be stringified.
 */
HitAggregate.prototype.serialize = function() {
   return {
      site: this.site.title,
      duration: this.duration,
      day: this.day,
      month: this.month,
      uniques: this.uniques,
      hits: this.hits,
   };
};

/**
 * Creates or updates the HitAggregate for the given timeKey.
 * @param {String} dayOrMonth a timeKey string, e.g. '201004', '20100405'
 */
HitAggregate.create = function(dayOrMonth, site) {
   var keyDayOrMonth = dayOrMonth.length === 6 ? 'month' : 'day';
   var otherKey = dayOrMonth.length === 6 ? 'day' : 'month';
   // FIXME count(distinct) not yet supported
   /*
   var result = store.query('select count(distinct) as uniques, count(Hit.id) as hits from Hit where Hit.' + keyDayOrMonth + ' = :dayOrMonth and Hit.site = :site', {
      dayOrMonth: dayOrMonth,
      site: site._id
   })[0]
*/

   var uniquesOfHits = store.query('select Hit.unique from Hit where Hit.' + keyDayOrMonth+ ' = :dayOrMonth and Hit.site = :site', {
      site: site._id,
      dayOrMonth: dayOrMonth
   });
   var uniqueList = unique(uniquesOfHits);

   var uCount = 0;

   var date = keyToDate(dayOrMonth);
   var hitAggregate = store.query('from HitAggregate where HitAggregate.duration = :keyDayOrMonth and \
      HitAggregate.' + keyDayOrMonth + ' = :dayOrMonth and HitAggregate.site = :site limit 1', {
         keyDayOrMonth: keyDayOrMonth,
         dayOrMonth: dayOrMonth,
         site: site._id
   })[0] || new HitAggregate();

   hitAggregate.site = site;
   hitAggregate.duration = keyDayOrMonth;
   hitAggregate.year = dateToKey(date, 'year');
   hitAggregate.uniques = uniqueList.length;
   hitAggregate.hits = uniquesOfHits.length;

   hitAggregate[keyDayOrMonth] = dayOrMonth;
   hitAggregate[otherKey] = dateToKey(date, otherKey);

   hitAggregate.save();
   return hitAggregate;
}