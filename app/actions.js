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
exports.stats = function(req, duration) {
   var duration = duration || req.params.duration || 'month';

   var aggregateDuration;
   if (duration === 'month') {
      aggregateDuration = "day";
   // year
   } else if (duration == 'year'){
      aggregateDuration = "month";
   }
   var now = new Date();
   var key = dateToKey(now, duration);
   var hitAggregates = HitAggregate.query().
         equals('duration', aggregateDuration).
         equals(duration, key).select();
   
   hitAggregates.sort(function(a, b) {
      return b[aggregateDuration] - a[aggregateDuration];
   });
   return skinResponse('./skins/stats.html', {
      duration: duration,
      starttime: key,
      hitAggregates: [ha.serialize() for each (ha in hitAggregates)],
   });
};


/**
 * ?key = 
 * &duration = day
 * &starttime =
 * // optiona; endtime, wenn nicht: dann nur 1 zurückgeben
 */
exports.distribution = function(req) {
   var txtStarttime = parseInt(req.params.starttime, 10);
   var txtDuration = req.params.duration || 'hour';
   
   var key = req.params.key;
 
   return jsonResponse({
      "distributions": distributions,
   });
}
