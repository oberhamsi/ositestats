// stdlib
var strings = require('ringo/utils/strings');
var {ByteString} = require('binary');
var {Response} = require('ringo/webapp/response');
var {Request} = require('ringo/webapp/request');
var objects = require('ringo/utils/objects');
var log = require('ringo/logging').getLogger(module.id);

// custom
var {Site, Hit, HitAggregate, Distribution, dateToKey, extractDomain} = require('./model');
var {getMovingAverages, getAverage} = require('./helpers');
var config = require('./config');

var COOKIE_NAME = 'ositestats';

/**
 * hit action puts new hit-data into hitQueue, processed by different thread
 */
var HitQueue = exports.HitQueue = {
   entries: [],
   
   add: sync(function(entry) {
      this.entries.push(entry);
   }, this),
   
   splice: sync(function() {
      return this.entries.splice(0);
   }, this),
   
   process: function() {
      log.info('processing HitQueue, length = ', this.entries.length);
      this.splice().forEach(function(hit) {
         (new Hit(hit)).save();
      });
   }
};

/**
 * Main action logging a Hit. Redirects to /blank if hit was registered.
 
 * The request must pass the following checks before it is registered:
 *    * non-bot User-Agent header
 *    * Referer header set
 *    * site query parameter
 *    * Referer url machtes a domain registered for that site
 */
exports.hit = function(req) {
   var req = new Request(req);
   var ignoreResponse = {
      status: 401,
      headers: {'Content-Type': 'text/html'},
      body: ['']
   };
   // drop spiders
   var userAgent = req.getHeader("User-Agent").toLowerCase();
   if (strings.contains(userAgent, "bot") || strings.contains(userAgent, "spider")) {
      ignoreResponse.body = ['no bots'];
      return ignoreResponse;
   }
   // drop empty referers - hotlinked countpixel
   var page = req.getHeader('Referer');
   if (!page) {
      ignoreResponse.body = ['missing referer'];
      return ignoreResponse;
   }
   // drop if missing site
   if (!req.params.site) {
      ignoreResponse.body = ['missing site'];
      return ignoreResponse;
   }

   var site = req.params.site;
   // drop if not one of the domains we count for that site
   var domain = extractDomain(page);
   var matchingSites = Site.query().equals('title', site).equals('domain', domain).select();
   if (matchingSites.length <= 0) {
      ignoreResponse.body = ['domain not registered for site ' + site];
      return ignoreResponse;
   }
   var site = matchingSites[0];
   // success response redirects to /blank gif
   var redirectResponse = new Response('See other: /blank');
   redirectResponse.status = 302;
   redirectResponse.setHeader('Location', '/blank');
   redirectResponse.setHeader('Content-Type', 'application/x-javascript');

   var ip = req.remoteAddress;
   var forwardedFor = req.getHeader("X-Forwarded-For");
   if (forwardedFor != null && typeof(forwardedFor) === "string") {
      if (strings.contains(forwardedFor, ",") === true) {
         ip = forwardedFor.trim().split(/\s*,\s*/)[0];
      } else {
         ip = forwardedFor;
      }
   }

   var unique;
   if (!req.cookies[COOKIE_NAME]) {
      unique = strings.digest(ip + "/" +  Math.random() + "/" + userAgent);
      redirectResponse.setCookie(COOKIE_NAME, unique, 365);
   } else {
      unique = req.cookies[COOKIE_NAME];
   }

   var now = new Date();
   HitQueue.add({
      timestamp: now.getTime(),
      site: site,
      ip: ip,
      userAgent: userAgent,
      unique: unique || null,
      referer: unescape(req.params.referer) || null,
      page: page || null,

      day: dateToKey(now, 'day'),
      month: dateToKey(now, 'month'),
   });
   return redirectResponse;
};

exports.blank = function(req) {
   return {
      status: 200,
      headers: {'Content-Type': 'applicaton/x-javascript', 'Connection': 'close'},
      body: ['{}'],
   };
}

exports.index = {
   GET: function(req) {
      // output front line
      var sites = Site.query().select();
      sites = sites.map(function(site) {
         var sparkValues = HitAggregate.query().
               equals('duration', 'day').
               equals('site', site).
               orderBy('day desc').
               select('uniques').slice(0,350);
         sparkValues.reverse();
         var avgSparkValues = getMovingAverages(sparkValues, 3);
         return {
            title: site.title,
            sparkValues: avgSparkValues.join(','),
            sparkMin: parseInt(Math.min.apply(this, sparkValues), 10),
            sparkMax: parseInt(Math.max.apply(this, sparkValues), 10),
            sparkAvg: getAverage(sparkValues),
         };
      });

      return Response.skin(module.resolve('skins/dashboard.html'), objects.merge({
         baseUri: config.http.baseUri,
         sites: sites,
      }, require('./macros')));
   },

   POST: function(req) {
      // FIXME error handling
      var title = req.params.newSiteTitle.trim();
      var domain = req.params.newSiteDomain.trim();
      (new Site({
         title: title,
         domain: domain,
      })).save();
      return Response.redirect('/');
   }
};

/**
 * Show statistic overview
 * @param {String} timeKey the month timekey for which to show statistics
 */
exports.stats = function(req, siteKey, timeKey) {
   var siteKey = siteKey || req.params.siteKey;
   var timeKey = timeKey || req.params.timeKey;
   var duration;
   if (!timeKey) {
      var now = new Date();
      timeKey = dateToKey(now, 'month');
   }
   if (timeKey.length == 6) {
      duration = 'month';
   } else if (timeKey.length == 4){
      duration == 'year'
   } else {
      throw new Error('invalid timeKey: ' + timeKey);
   }

   var site = Site.query().equals('title', siteKey).limit(1).select()[0];

   var aggregateTimeKeys = HitAggregate.query().
      equals('site', site).
      equals('duration', duration).
      select(duration);
   return Response.skin(module.resolve('skins/stats.html'), objects.merge({
      site: siteKey,
      duration: duration,
      timeKey: timeKey,
      timeKeys: aggregateTimeKeys
   }, require('./macros'),require('ringo/skin/filters')));
};

/**
 * @returns aggregated hits & uniques in json
 */
exports.aggregatedata = function(req, siteKey, timeKey) {
   var siteKey = siteKey || req.params.siteKey;
   var timeKey = timeKey || req.params.timeKey;
   var duration;
   var aggregateDuration;
   if (!timeKey) {
      var now = new Date();
      timeKey = dateToKey(now, 'month');
   }
   if (timeKey.length === 6) {
      duration = 'month';
      aggregateDuration = "day";
   } else if (timeKey.length == 4){
      aggregateDuration = "month";
      duration = 'year'
   } else {
      throw new Error('invalid timeKey: ' + timeKey);
   }

   var site = Site.query().
      equals('title', siteKey).
      limit(1).
      select()[0];

   var hitAggregates = HitAggregate.query().
      equals('duration', aggregateDuration).
      equals(duration, timeKey).
      equals('site', site).
      orderBy(duration + ' desc').
      select('*');

   hitAggregates.sort(function(a, b) {
      return a[aggregateDuration] - b[aggregateDuration];
   });

   return Response.json({
      site: siteKey,
      timeKey: timeKey,
      aggregates: [ha.serialize() for each (ha in hitAggregates)],
   });
}

/**
 * @returns distribution data as json.
 */
exports.distributiondata = function(req, siteKey, distributionKey, timeKey) {
   var siteKey = siteKey || req.params.site;
   var distributionKey = distributionKey || req.params.distributionKey || 'userAgent';
   var timeKey = timeKey || req.params.timeKey;
   if (!timeKey) {
      var now = new Date();
      timeKey = dateToKey(now, 'month');
   }

   var site = Site.query().equals('title', siteKey).limit(1).select()[0];

   var distributions = Distribution.query().
      equals('duration', 'month').
      equals('key', distributionKey).
      equals('month', timeKey).
      equals('site', site).
      select('*');
      
   distributions.sort(function(a, b) {
      if (a.day < b.day) return 1;
      return -1;
   });

   return Response.json({
      site: siteKey,
      timeKey: timeKey,
      distributionKey: distributionKey,
      distributions: distributions,
   });
}
