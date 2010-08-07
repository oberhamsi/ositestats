var STRING = require('ringo/utils/strings');

var {Response, jsonResponse, skinResponse} = require('ringo/webapp/response');
var {Site, Hit, HitAggregate, Distribution, dateToKey} = require('./model');
var config = require('./config');

/**
 * Main action logging a Hit.
 *
 * req.params.referer the referer of the page this Hit comes from
 *
 * req.params.site the site for which this Hit will be logged
 */
exports.hit = function(req) {
   var userAgent = req.getHeader("User-Agent").toLowerCase();
   if (STRING.contains(userAgent, "bot") || STRING.contains(userAgent, "spider")) {
      return new Response();
   }
   
   var response = new Response('');
   var ip = req.env.REMOTE_HOST;
   var forwardedFor = req.getHeader("X-Forwarded-For");
   if (forwardedFor != null && typeof(forwardedFor) === "string") {
      if (STRING.contains(forwardedFor, ",") === true) {
         ip = forwardedFor.trim().split(/\s*,\s*/)[0];
      } else {
         ip = forwardedFor;
      }
   }
   
   var unique;
   if (!req.cookies.stss) {
      unique = STRING.digest(ip + "/" +  Math.random() + "/" + userAgent);
      response.setCookie('stss', unique);
   } else {
      unique = req.cookies.stss;
   }
   var now = new Date();
   (new Hit({
      timestamp: now.getTime(),
      site: unescape(req.params.site) || config.defaultSite,
      ip: ip,
      userAgent: userAgent,
      unique: unique || null,
      referer: unescape(req.params.referer) || null,
      page: req.getHeader('Referer') || null,

      day: dateToKey(now, 'day'),
      month: dateToKey(now, 'month'),
   })).save();

   return response;
   
};

exports.index = function(req) {

   if (req.isPost) {
      // FIXME error handling
      var title = req.params.newSiteTitle || "";
      title = title.trim();
      var domains = req.params.newSiteDomains || "";
      domains = domains.split(/[\n\r]/);
      (new Site({
         title: title,
         domains: domains,
      })).save();
   }

   var sites = Site.query().select();
   sites = sites.map(function(site) {
      var aggs = HitAggregate.query().
            equals('duration', 'day').
            equals('site', site.title).
            select().slice(0, 14);
      aggs.reverse();
      var sparkValues = [agg.hits for each (agg in aggs)];
      return {
         title: site.title,
         sparkValues: sparkValues.join(','),
      };
   });

   return skinResponse('./skins/dashboard.html', {
      rootUrl: config.baseUri,
      sites: sites,
   });
};


/**
 * Show statistic overview
 * @param {String} timeKey the month timekey for which to show statistics
 */
exports.stats = function(req, siteKey, timeKey) {
   var siteKey = siteKey || req.params.siteKey || config.defaultSite;
   var timeKey = timeKey || req.params.timeKey;  
   var duration;
   if (!timeKey) {
      var now = new Date();
      timeKey = dateToKey(now, 'month');
   }
   if (timeKey.length === 6) {
      duration = 'month';
   } else if (timeKey.length == 4){
      duration == 'year'
   }
   
   var aggregateTimeKeys = HitAggregate.query().
      equals('site', siteKey).
      equals('duration', duration).
      select(duration);
   
   return skinResponse('./skins/stats.html', {
      site: siteKey,
      duration: duration,
      timeKey: timeKey,
      timeKeys: aggregateTimeKeys
   });
};


exports.aggregatedata = function(req, siteKey, timeKey) {
   var siteKey = siteKey || req.params.siteKey || config.defaultSite;
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
      duration == 'year'
   }

   var hitAggregates = HitAggregate.query().
         equals('duration', aggregateDuration).
         equals(duration, timeKey).
         equals('site', siteKey).
         select();
   
   hitAggregates.sort(function(a, b) {
      return a[aggregateDuration] - b[aggregateDuration];
   });

   return jsonResponse({
      site: siteKey,
      timeKey: timeKey,
      aggregates: [ha.serialize() for each (ha in hitAggregates)],
   });
}

/**
 * Returns distribution data for the given key and month. Use by
 * stats skin to load distribution via ajax.
 *
 */
exports.distributiondata = function(req, siteKey, distributionKey, timeKey) {
   var siteKey = siteKey || req.params.site || config.defaultSite;
   var distributionKey = distributionKey || req.params.distributionKey || 'userAgent';
   var timeKey = timeKey || req.params.timeKey;  
   if (!timeKey) {
      var now = new Date();
      timeKey = dateToKey(now, 'month');
   }

   var distributions = Distribution.query().
      equals('duration', 'month').
      equals('key', distributionKey).
      equals('month', timeKey).
      equals('site', siteKey).
      select();

   distributions.sort(function(a, b) {
      if (a.day < b.day) return 1;
      return -1;
   });
 
   return jsonResponse({
      site: siteKey,
      timeKey: timeKey,
      distributionKey: distributionKey,
      distributions: distributions,
   });
}
