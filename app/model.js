var numbers = require('ringo/utils/numbers');
var $f = require('ringo/utils/strings').format;

export('Hit', 'HitAggregate', 'Distribution', 'Site', 'dateToKey', 'keyToDate');

var {store} = require('./config');

var MAPPING_SITE = {
   table: 'site',
   properties: {
      title: {type: 'string'},
      domain: {type: 'string'},
   }
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

var MAPPING_HIT = {
   table: 'hit',
   properties: {
      timestamp: {type: 'long'},
      site: {
         type: 'object',
         entity: 'Site',
      },
      ip: {type: 'string'},
      userAgent: {type: 'string'},
      unique: {type: 'string'},
      referer: {type: 'string'},
      page: {type: 'string'},
      
      day: {type: 'string'},
      month: {type: 'string'},
   }
};

/**
 * Site
 */
var Site = store.defineEntity('Site', MAPPING_SITE);
Site.prototype.toString = function() {
   return '[Site] ' + this.title + ' (' + this.domain + ')';
};

// too lazy to do relation table
Site.prototype.getDomains = function() {
   return this.domain.split(',');
};

/**
 * A Distribution stores the monthly distribution of a Hit attribute. For example
 * we create a Distribution for the attribute userAgent.
 */
var Distribution = store.defineEntity('Distribution', MAPPING_DISTRIBUTION);

Distribution.getNewest = function(site, duration) {
   return Distribution.query().equals('site', site).equals('duration', duration).orderBy('month desc').limit(1).select()[0];
}


/**
 * String rep
 */
Distribution.prototype.toString = function() {

   return $f("[Distribution: {} {}, {}", 
         this.key, this[this.duration], this.site);
};

// helper for normalizers, removes ?, & parts of url
function removeQueryParams(rawKey) {
	if (!rawKey) return rawKey;

   var idx = 0;
   ['?', '&'].some(function(qp) {
   	if (rawKey.indexOf(qp) > -1) {
   		idx = rawKey.indexOf(qp);
   		return true;
   	}
   });
   if (idx > 0) {
   	rawKey = rawKey.slice(0, idx);
   }
   return rawKey;
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
      if (isLocalDomain) return 'localDomain';
      
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
   
   var hits = Hit.query().
      equals('month', monthKey).
      equals('site', site).
      select();
   var date = keyToDate(monthKey);
   var newDistributions = [];
   var hitsCount = hits.length;
   for each (var key in ['userAgent', 'referer', 'page']) {
      // hits that have the site itself as referrer won't be counted
      // for refererr stats
      var counter = {};
      var normalize = Distribution.Normalizer[key];
      for (var i=0; i<hitsCount; i++) {
         var hit = hits[i];
         var distributionKey = normalize(hit[key], site.getDomains());
         if (counter[distributionKey] === undefined) counter[distributionKey] = 0;
         counter[distributionKey]++;
      }

      // drop low distributions for nicer stats
      var distributions = {};
      for (let cKey in counter) {
         let percent = parseInt((counter[cKey] / hitsCount) * 1000, 10);
         /// also drop localDomain referers
         if (percent > 0.001 && cKey !== 'localDomain') {
            distributions[cKey] = counter[cKey];
         }
      }
      var distribution = Distribution.query().
         equals('duration', 'month').
         equals('month', monthKey).
         equals('key', key).
         equals('site', site).
         select()[0] || new Distribution();

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

/**
 * HitAggregates exist for days and months. They hold the amount of uniques
 * and hits for their duration.
 */
var HitAggregate = store.defineEntity('HitAggregate', MAPPING_HITAGGREGATE);

HitAggregate.getNewest = function(site, duration) {
   return HitAggregate.query().equals('site', site).equals('duration', duration).orderBy('day desc').limit(1).select()[0];
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
      site: this.site,
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
   var hits = Hit.query().
      equals(keyDayOrMonth, dayOrMonth).
      equals('site', site).
      select();

   var uCount = 0;
   var uniques = {};
   // TODO replace with `distinct(unique)` sql
   for each (var hit in hits) {
      if (!uniques[hit.unique]) {
         uniques[hit.unique] = true;
         uCount++;
      }
   }

   var date = keyToDate(dayOrMonth);
   var hitAggregate = HitAggregate.query().
      equals('duration', keyDayOrMonth).
      equals(keyDayOrMonth, dayOrMonth).
      equals('site', site).
      select()[0] || new HitAggregate();

   hitAggregate.site = site;
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
var Hit = store.defineEntity('Hit', MAPPING_HIT);

/**
 * String rep
 */
Hit.prototype.toString = function() {
   return $f('[{} - {} - {} - {}]', this.ip, new Date(this.timestamp), this.page, this.userAgent);
};

Hit.getNewest = function(site) {
   return Hit.query().equals('site', site).orderBy('timestamp desc').limit(1).select()[0];
};

Hit.getOldest = function(site) {
   return Hit.query().equals('site', site).orderBy('timestamp').limit(1).select()[0];
}

/**
 * Converts a Date to a timeKey.
 * @param {Date} date the date to convert
 * @param {String} duration the kind of key we want: 'day', 'month', or 'year'.
 * @returns {String} the key for the given date and duration
 *
 */
function dateToKey(date, duration) {
   if (duration === 'day') {
      return [date.getFullYear(), 
              numbers.format(date.getMonth(), "00"), 
              numbers.format(date.getDate(), "00")
             ].join('');
   } else if (duration === 'month') {
      return [date.getFullYear(),
              numbers.format(date.getMonth(), "00")
             ].join('');
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
function keyToDate (key) {
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
};

exports.extractDomain = function extractDomain(uri) {
   try {
      uri = new java.net.URL(uri);
   } catch(e) {
      //java.net.MalformedURLException
      return null;
   }
   if (!uri || !uri.getHost()) return null;
   
   // FIXM not really.. breaks on test.com.vn
   return uri.getHost().split('.').splice(-2).join('.');
}

function extractPath(uri) {
   try {
      var uri = new java.net.URL(uri);
   } catch(e) {
      //java.net.MalformedURLException
      return null;
   }
   return uri.getPath();
};
