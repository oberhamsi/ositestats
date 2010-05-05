include('core/string');

var {Response, jsonResponse, skinResponse} = require('ringo/webapp/response');
var {Hit, HitAggregate, Distribution, dateToKey} = require('./model');
var {log} = require('./config');

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
      unique = ip + "/" +  Math.random() + "/" + userAgent;
      response.setCookie('stss', unique.digest());
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
 * ?duration = day
 * &starttime = startdate
 * // optional: endtime, wenn nicht angegeben nur 1 obj zurückgeben
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
      return b[aggregateDuration] - a[aggregateDuration];
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
 * ?key = 
 * &duration = day
 * &starttime =
 * // optiona; endtime, wenn nicht: dann nur 1 zurückgeben
 */
exports.distributiondata = function(req, distributionKey, timeKey) {
   var distributionKey = distributionKey || req.params.distributionKey || 'userAgent';
   var timeKey = timeKey || req.params.timeKey;  
   if (!timeKey) {
      var now = new Date();
      timeKey = dateToKey(now, 'month');
   }
   var duration, distributionDuration;
   if (timeKey.length === 6) {
      duration = 'month';
      distributionDuration = "day";
   } else if (timeKey.length == 4){
      duration = "year";
      distributionDuration == 'month'
   }

   var distributions = Distribution.query().
      equals('duration', distributionDuration).
      equals('key', distributionKey).
      equals(duration, timeKey).select();

   distributions.sort(function(a, b) {
      if (a.day < b.day) return 1;
      return -1;
   });
 
   return jsonResponse({
      duration: duration,
      timeKey: timeKey,
      distributionKey: distributionKey,
      distributions: distributions,
   });
}
