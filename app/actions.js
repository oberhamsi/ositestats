include('core/string');

var {Response, jsonResponse} = require('ringo/webapp/response');
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
exports.aggregate = function(req) {
   var txtStarttime = parseInt(req.params.starttime, 10);
   var txtDuration = req.params.duration || 'hour';

   var [hits, stime, etime] = Hit.forRange(txtStarttime, txtDuration);

   // memory
   var uniques = [];
   for each (var hit in hits) {
      var unique = hit.unique;
      print (unique);
      if (! unique in uniques) uniques.push(unique);
   }

   (new HitAggregate({
      'starttime': stime.getTime(),
      'endtime': etime.getTime(),
      'duration': txtDuration, // day, week, month
      'uniques': uniques.length,
      'pageimpression': hits.length,
   })).save();

   return jsonResponse({
      'starttime': stime.getTime(),
      'endtime': etime.getTime(),
      'duration': txtDuration, // day, week, month
      'uniques': uniques.length,
      'pageimpression': hits.length,
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
   if (!key in ['userAgent', 'referer', 'page']) {
      key = 'userAgent';
   }

   var NORMALIZER = {
      'userAgent': function(rawKey) {

      },
      'referer': function(rawKey) {

      },
      'page': function(rawKey) {

      },
   };

   var [hits, stime, etime] = Hit.forRange(txtStartime, txtDuration);

   var hitsLength = hits.length;
   var counter = {};
   var normalize = NORMALIZER[key];
   var totalCount = 0;
   // FIXME smarter sample taking
   for (var i=0;i < Math.min(hitsLength * 0.8, 1000);i++) {
      var hit = hits[i];
      var nKey = normalize(hit[k]);
      var count = counter[nKey];
      if (count === undefined) count = 0;
      count++;
      totalCount++;
   }


   // calc distributions
   var distributions = {};
   for (var cKey in counter) {
      distributions[cKey] = parseInt((counter[cKey] / totalCount) * 1000, 10);
   }

   (new Distribution({
      'key': key,
      'duration': txtDuration,
      'starttime': stime,
      'endtime': etime,
      'distributions': distributions,
   })).save();

   return jsonResponse({
      "distributions": distributions,
   });
}
