// stdlib
var strings = require('ringo/utils/strings');
var {ByteString} = require('binary');
var Response = require('ringo/jsgi/response');
var objects = require('ringo/utils/objects');
var {to_html} = require('ringo/mustache');
var {read} = require('fs');
var log = require('ringo/logging').getLogger(module.id);
var {setCookie} = require('ringo/utils/http');
var {Worker} = require('ringo/worker');
// custom
var {Site, Hit, HitAggregate, Distribution, dateToKey, extractDomain} = require('./model');
var {getMovingAverages, getAverage} = require('./helpers');
var config = require('./config');

var COOKIE_NAME = 'ositestats';

/**
 * Main action logging a Hit. Redirects to /blank if hit was registered.

 * The request must pass the following checks before it is registered:
 *    * non-bot User-Agent header
 *    * Referer header set
 *    * site query parameter
 *    * Referer url machtes a domain registered for that site
 */
var ignoreResponse = {
   status: 401,
   headers: {'Content-Type': 'text/html'},
   body: ['']
};
exports.hit = function(req) {
   // drop spiders
   var userAgent = req.headers["user-agent"].toLowerCase();
   if (strings.contains(userAgent, "bot") || strings.contains(userAgent, "spider")) {
      ignoreResponse.body = ['no bots'];
      return ignoreResponse;
   }
   // drop empty referers - hotlinked countpixel
   var page = req.headers.referer;
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
   var redirectResponse = {
      body: ['See other: /blank'],
      headers: {
         'Location': '/blank',
         'Content-Type': 'application/x-javascript'
      },
      status: 302
   };

   var ip = req.remoteAddress;
   var forwardedFor = req.headers["x-forwarded-for"];
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
      redirectResponse.headers['Set-Cookie'] = setCookie(COOKIE_NAME, unique, 365);
   } else {
      unique = req.cookies[COOKIE_NAME];
   }

   var now = new Date();
   config.hitQueue.postMessage({
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
      headers: {'Content-Type': 'application/x-javascript', 'Connection': 'close'},
      body: ['({})'],
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

      return Response.html(to_html(read(module.resolve('skins/dashboard.html')), {
         baseUri: config.http.baseUri,
         sites: sites,
      }));
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
   return Response.html(to_html(read(module.resolve('skins/stats.html')), {
      site: siteKey,
      duration: duration,
      timeKey: timeKey,
      timeKeys: aggregateTimeKeys
   }) + read(module.resolve('skins/templates.skin')));
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
