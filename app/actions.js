include('core/string');

var {Response, jsonResponse, skinResponse} = require('ringo/webapp/response');
var {Hit, HitAggregate, Distribution, dateToKey} = require('./model');
var config = require('./config');

/**
 * Main action logging a Hit.
 * req.params.referer the referer of the page this Hit comes from
 * req.params.site the site for which this Hit will be logged
 */
exports.index = function(req) {
   var userAgent = req.getHeader("User-Agent").toLowerCase();
   if (userAgent.contains("bot") || userAgent.contains("spider")) {
      return new Response();
   }
   
   var response = new Response('');
   var ip = req.env.REMOTE_HOST;
   var forwardedFor = req.getHeader("X-Forwarded-For");
   if (forwardedFor != null && typeof(forwardedFor) === "string") {
      if (forwardedFor.contains(",") === true) {
         ip = forwardedFor.trim().split(/\s*,\s*/)[0];
      } else {
         ip = forwardedFor;
      }
   }
   
   var unique;
   if (!req.cookies.stss) {
      unique = (ip + "/" +  Math.random() + "/" + userAgent).digest();
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


/**
 * Show statistic overview
 * @param {String} timeKey the month timekey for which to show statistics
 */
exports.stats = function(req, siteKey, timeKey) {
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
   return skinResponse('./skins/stats.html', {
      site: siteKey,
      duration: duration,
      timeKey: timeKey,
      hitAggregates: [ha.serialize() for each (ha in hitAggregates)],
   });
};

exports.distributions = function(req) {
   return skinResponse('./skins/distributions.html');
};

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
