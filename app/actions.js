include('core/string');

var {Response, jsonResponse, skinResponse} = require('ringo/webapp/response');
var {Hit, HitAggregate, Distribution} = require('./model');

exports.index = function(req) {
   var userAgent = req.getHeader("User-Agent").toLowerCase();
   if (userAgent.contains("bot") || userAgent.contains("spider")) {
      return new Response('bot;');
   }
   
   var response = new Response('okay;');
   var unique;
   if (!req.cookies.stss) {
      unique = req.env.REMOTE_HOST + "/" +  Math.random() + "/" + userAgent;
      response.setCookie('stss', unique.digest());
   }
   
   (new Hit({
      'timestamp': Date.now(),
      'ip': req.env.REMOTE_HOST,
      'userAgent': userAgent,
      'unique': unique || req.cookies.stss || null,
      'referer': unescape(req.params.referer) || null,
      'page': req.getHeader('Referer') || null,
   })).save();

   return response;
   
};


/**
 * ?duration = day
 * &starttime = startdate
 * // optional: endtime, wenn nicht angegeben nur 1 obj zurückgeben
 */
exports.stats = function(req, duration) {
   var txtStarttime = parseInt(req.params.starttime, 10);
   var txtDuration = duration || req.params.duration;
   var txtEndtime = parseInt(req.params.endtime, 10);

   var [hitAggregates, stime, etime] = HitAggregate.getForRange(txtStarttime, txtDuration, txtEndtime);
   return skinResponse('./skins/stats.html', {
      duration: txtDuration,
      starttime: stime,
      endtime: etime,
      hitAggregates: [ha.serialize() for each (ha in hitAggregates) if (ha.serialize)],
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
