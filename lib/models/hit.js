var {store} = require('../config').data;
var $f = require('ringo/utils/strings').format;
var {dateToKey, extractDomain} = require('../helpers');

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
   }
};

var MAPPING_PROCESSED_HIT = {
   table: 'processedhit',
   properties: {
      site: {
         type: 'object',
         entity: 'Site'
      },
      userAgent: {type: 'string'},
      unique: {type: 'string'},
      referer: {type: 'string'},
      page: {type: 'string'},

      day: {type: 'string'},
      month: {type: 'string'}
   }
};

/**
 * Hit. A single PageView by a client.
 */
var Hit = exports.Hit = store.defineEntity('Hit', MAPPING_HIT);

/**
 * String rep
 */
Hit.prototype.toString = function() {
   return $f('[{} - {} - {} - {}]', this.ip, new Date(this.timestamp), this.page, this.userAgent);
};


var ProcessedHit = exports.ProcessedHit = store.defineEntity('ProcessedHit', MAPPING_PROCESSED_HIT);

ProcessedHit.getNewest = function(site) {
   return store.query('from ProcessedHit where ProcessedHit.site = :site order by ProcessedHit.day desc limit 1', {site: site._id})[0];
};

ProcessedHit.getOldest = function(site) {
   return store.query('from ProcessedHit where ProcessedHit.site = :site order by ProcessedHit.day asc limit 1', {site: site._id})[0]
}

ProcessedHit.create = function(hit) {
   var date = new Date(hit.timestamp);
   return new ProcessedHit({
      site: hit.site,
      unique: hit.unique,
      userAgent: Normalizer.userAgent(hit.userAgent),
      referer: Normalizer.referer(hit.referer, hit.site.getDomains()),
      page: Normalizer.page(hit.page),
      day: dateToKey(date, 'day'),
      month: dateToKey(date, 'month')
   });
};


function extractPath(uri) {
   try {
      var uri = new java.net.URL(uri);
   } catch(e) {
      //java.net.MalformedURLException
      return null;
   }
   return uri.getPath();
};


/**
 * Hit attributes should be normalized before we calculate their distribution to
 * keep the amount of different values sane (e.g. we only differentiate between
 * IE, FF, safari but not their versions).
 */
var Normalizer = {
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
      if (isLocalDomain) return null;
      if (domain === null) return null;
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