include('core/string');

var {Response, jsonResponse, skinResponse} = require('ringo/webapp/response');
var {Hit, HitAggregate, Distribution, dateToKey} = require('./model');
var {log} = require('./config');

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
   var unique;
   var ip = req.env.REMOTE_HOST;
   var forwardedFor = req.getHeader("X-Forwarded-For");
   if (forwardedFor != null && typeof(forwardedFor) === "string") {
      if (forwardedFor.contains(",") === true) {
         ip = forwardedFor.trim().split(/\s*,\s*/)[0];
      } else {
         ip = forwardedFor;
      }
   }   
   if (!req.cookies.stss) {
      unique = (ip + "/" +  Math.random() + "/" + userAgent).digest();
      response.setCookie('stss', unique);
   }
   var now = new Date();
   var day = dateToKey(now, 'day');
   var month = dateToKey(now, 'month');
   (new Hit({
      timestamp: now.getTime(),
      ip: ip,
      userAgent: userAgent,
      unique: unique || req.cookies.stss || null,
      referer: unescape(req.params.referer) || null,
      page: req.getHeader('Referer') || null,

      day: day,
      month: month,
   })).save();

   return response;
   
};


/**
 * Show statistic overview
 * @param {String} timeKey the month timekey for which to show statistics
 */
exports.stats = function(req, timeKey) {
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
         equals(duration, timeKey).select();
   
   hitAggregates.sort(function(a, b) {
      return a[aggregateDuration] - b[aggregateDuration];
   });
   return skinResponse('./skins/stats.html', {
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
exports.distributiondata = function(req, distributionKey, timeKey) {
   var distributionKey = distributionKey || req.params.distributionKey || 'userAgent';
   var timeKey = timeKey || req.params.timeKey;  
   if (!timeKey) {
      var now = new Date();
      timeKey = dateToKey(now, 'month');
   }

   var distributions = Distribution.query().
      equals('duration', 'month').
      equals('key', distributionKey).
      equals('month', timeKey).select();

   distributions.sort(function(a, b) {
      if (a.day < b.day) return 1;
      return -1;
   });
 
   return jsonResponse({
      timeKey: timeKey,
      distributionKey: distributionKey,
      distributions: distributions,
   });
}
