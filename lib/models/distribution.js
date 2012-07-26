var {store} = require('../config').data;
var {Hit} = require('./hit');
var {keyToDate, dateToKey, extractDomain} = require('../helpers');
var $f = require('ringo/utils/strings').format;

function extractPath(uri) {
   try {
      var uri = new java.net.URL(uri);
   } catch(e) {
      //java.net.MalformedURLException
      return null;
   }
   return uri.getPath();
};


var MAPPING_DISTRIBUTION = {
   table: 'distribution',
   properties: {
      key: {type: 'string'},
      duration: {type: 'string'},
      // unused day: {type: 'string'},
      month: {type: 'string'},
      year: {type: 'string'},

      distributions: {type: 'string'}, // json
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

/**
 * Hit attributes should be normalized before we calculate their distribution to
 * keep the amount of different values sane (e.g. we only differentiate between
 * IE, FF, safari but not their versions).
 */
Distribution.Normalizer = {
   userAgent: function(rawKey) {
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
   referer: function(rawKey, localDomains) {
      var domain = extractDomain(rawKey);
      // if it's null or undef its certainly no localdomain
      var isLocalDomain = domain && localDomains.some(function(ld) {
         return domain.indexOf(ld) > -1;
      });
      if (isLocalDomain) return 'localReferer';
      if (domain === null) return 'nullReferer'
      return domain;

   },
   page: function(rawKey) {
      var path = extractPath(rawKey);
      if (path) {
         path = path.toLowerCase();
         if (path.substr(-1) !== '/') {
            path = path + '/';
         }
      }
      return path;
   },
};
/**
 * Creates or updates several Distributions for the given month.
 * @param {String} montKey
 * @returns {Array} array of serialized distributions created/updated
 */
Distribution.create = function(monthKey, site) {

   var hits = store.query('from Hit where Hit.month = :monthKey and Hit.site = :site', {
      monthKey: monthKey,
      site: site._id
   })
   var date = keyToDate(monthKey);
   var newDistributions = [];
   var hitsCount = hits.length;
   for each (var key in ['userAgent', 'referer', 'page']) {
      // hits that have the site itself as referrer won't be counted
      // for refererr stats
      var counter = {};
      var normalize = Distribution.Normalizer[key];
      var usedUniques = {};
      for (var i=0; i<hitsCount; i++) {
         var hit = hits[i];
         if (!usedUniques[hit.unique] || key === 'page') {
            var distributionKey = normalize(hit[key], site.getDomains());
            if (counter[distributionKey] === undefined) counter[distributionKey] = 0;
            counter[distributionKey]++;

            usedUniques[hit.unique] = true;
         }
      }

      // drop low distributions for nicer stats
      var distributions = {};
      for (let cKey in counter) {
         let percent = parseInt((counter[cKey] / hitsCount) * 1000, 10);
         /// also drop localDomain referers
         if (percent > 0.001 && cKey !== 'localReferer' && cKey !== 'nullReferer') {
            distributions[cKey] = counter[cKey];
         }
      }

      var distribution = store.query('from Distribution where Distribution.duration = "month" and \
         Distribution.month = :monthKey and Distribution.key = :key and Distribution.site = :site limit 1', {
            monthKey: monthKey,
            key: key,
            site: site._id
      })[0] || new Distribution();

      distribution.site = site;
      distribution.duration = 'month';
      distribution.key = key;
      distribution.distributions = JSON.stringify(distributions);
      distribution.month = monthKey;
      distribution.year = dateToKey(date, 'year');
      distribution.save();
      newDistributions.push(distribution.toString());
   };
   return newDistributions;
}
