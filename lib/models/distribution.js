var {store} = require('../config').data;
var {Hit} = require('./hit');
var {keyToDate, dateToKey} = require('../helpers');
var $f = require('ringo/utils/strings').format;


var MAPPING_DISTRIBUTION = {
   table: 'distribution',
   properties: {
      key: {type: 'string'},
      duration: {type: 'string'},
      // unused day: {type: 'string'},
      month: {type: 'string'},
      year: {type: 'string'},

      distributions: {type: 'text'}, // json
      site: {
         type: 'object',
         entity: 'Site',
      }
   }
};


/**
 * A Distribution stores the monthly distribution of a Hit attribute. For example
 * we create a Distribution for the attribute userAgent.
 */
var Distribution = exports.Distribution = store.defineEntity('Distribution', MAPPING_DISTRIBUTION);

Distribution.getNewest = function(site, duration) {
   return store.query('from Distribution where Distribution.site = :site and \
         Distribution.duration = :duration order by Distribution.month desc limit 1', {
      site: site._id,
      duration: duration
   })[0];
};


/**
 * String rep
 */
Distribution.prototype.toString = function() {
   return $f("[Distribution: {} {}, {}", this.key, this[this.duration], this.site);
};


Distribution.createAge = function(monthKey, site, newDistributions) {
   var uniquesAge = store.query("SELECT MAX(ProcessedHit.month) as monthMax, MIN(ProcessedHit.month) as monthMin \
      from ProcessedHit WHERE ProcessedHit.site=:site \
      GROUP BY ProcessedHit.unique \
      HAVING MIN(ProcessedHit.month) != MAX(ProcessedHit.month) and MAX(ProcessedHit.month) = :monthKey order by ProcessedHit.unique", {
     site: site._id,
     monthKey: monthKey
   });
   var distributions = {};
   uniquesAge.forEach(function(row) {
      // either this or convert to Date...
      var minYear = parseInt((""+row.monthMin).substring(0,4), 10);
      var minMonth = parseInt((""+row.monthMin).substring(4,6), 10);
      var maxYear = parseInt((""+row.monthMax).substring(0,4), 10);
      var maxMonth = parseInt((""+row.monthMax).substring(4, 6), 10);

      var diffMonths = 0;
      if (minYear == maxYear) {
        diffMonths += (maxMonth - minMonth);
      } else {
        diffMonths += ((maxYear - minYear) - 1) * 12;
        diffMonths += (11 - minMonth) + 1;
        diffMonths += (maxMonth + 1);
      }

      if (!distributions[diffMonths]) {
         distributions[diffMonths] = 0;
      }
      distributions[diffMonths]++;
   });

   var data = Object.keys(distributions).map(function(key) {
      return {age: key, count: distributions[key]};
   })

   var key = 'age';
   var distribution = store.query('from Distribution where Distribution.duration = "month" and \
      Distribution.month = :monthKey and Distribution.key = :key and Distribution.site = :site limit 1', {
         monthKey: monthKey,
         key: key,
         site: site._id
   })[0] || new Distribution();

   distribution.site = site;
   distribution.duration = 'month';
   distribution.key = key;
   distribution.distributions = JSON.stringify(data);
   distribution.month = monthKey;
   var date = keyToDate(monthKey);
   distribution.year = dateToKey(date, 'year');
   distribution.save();
   return distribution;
}

/**
 * Creates or updates several Distributions for the given month.
 * @param {String} montKey
 * @returns {Array} array of serialized distributions created/updated
 */
Distribution.create = function(monthKey, site) {

   var newDistributions = [];
   var updateOrCreateDistribution = function(key, data) {
      var distribution = store.query('from Distribution where Distribution.duration = "month" and \
         Distribution.month = :monthKey and Distribution.key = :key and Distribution.site = :site limit 1', {
            monthKey: monthKey,
            key: key,
            site: site._id
      })[0] || new Distribution();
      distribution.site = site;
      distribution.duration = 'month';
      distribution.key = key;
      distribution.distributions = JSON.stringify(data);
      distribution.month = monthKey;
      distribution.year = dateToKey(keyToDate(monthKey), 'year');
      distribution.save();
      newDistributions.push(distribution.toString());
      return distribution;
   }

   for each (var key in ['userAgent', 'referer', 'page']) {

      // use agents
      var results = store.query('select ph.'+ key +' ' + key + ', \
                                 count(ph.' + key + ') as count \
                                 from ProcessedHit ph \
                                 where ph.month = :month and ph.site = :site \
                                 group by ph.' + key, {site: site._id, month: monthKey});

      updateOrCreateDistribution(key, results);
   }

   var dist = Distribution.createAge(monthKey, site, newDistributions);
   newDistributions.push(dist.toString());
   return newDistributions;
}
