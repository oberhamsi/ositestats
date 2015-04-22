// stdlib
var strings = require('ringo/utils/strings');
var {ByteString} = require('binary');
var Response = require('ringo/jsgi/response');
var objects = require('ringo/utils/objects');
var {read} = require('fs');
var log = require('ringo/logging').getLogger(module.id);
var {setCookie} = require('ringo/utils/http');
var {Reinhardt} = require('reinhardt');
var {Application} = require('stick');

// custom
var {getMovingAverages, getAverage, dateToKey, extractDomain} = require('./helpers');
var config = require('./config').data;
var store = config.store;

var COOKIE_NAME = 'ositestats';

var reinhardt = new Reinhardt({
   loader: [module.resolve("../assets/templates/")],
   filters: require('./template/filters')
});

// custom
var app = exports.app = Application();
app.configure('static', 'basicauth', 'cookies', 'params', 'route', 'requestlog', 'notfound');

// auth
app.basicauth('/stats', config.auth.user, config.auth.password_sha1);

app.static(module.resolve('../assets/static/'));
if (config.http.staticDir) {
   app.static(config.http.staticDir)
}

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

app.get('/hit', function(req) {
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

   var siteTitle = req.params.site;
   // drop if not one of the domains we count for that site
   var domain = extractDomain(page);
   var matchingSites = store.query('from Site where Site.title = :siteTitle and Site.domain = :domain', {siteTitle: siteTitle, domain: domain});
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
      siteTitle: siteTitle,
      ip: ip,
      userAgent: userAgent,
      unique: unique || null,
      referer: unescape(req.params.referer) || null,
      page: page || null
   });
   return redirectResponse;
});

app.get('/blank', function(req) {
   return {
      status: 200,
      headers: {'Content-Type': 'application/x-javascript', 'Connection': 'close'},
      body: ['({})'],
   };
});

app.get('/', function(req) {
   // output front line
   var sites = store.query('from Site');
   sites = sites.map(function(site) {
      var sparkValues = store.query("select HitAggregate.uniques from HitAggregate where \
         HitAggregate.duration='day' and HitAggregate.site=:site order by HitAggregate.day desc limit 350", {site: site._id});
      sparkValues.reverse();
      var avgSparkValues = sparkValues;
      return {
         title: site.title,
         sparkValues: avgSparkValues.join(','),
         sparkMin: parseInt(Math.min.apply(this, sparkValues), 10),
         sparkMax: parseInt(Math.max.apply(this, sparkValues), 10),
         sparkAvg: getAverage(sparkValues),
      };
   });

   return reinhardt.renderResponse('dashboard.html', {
      baseUri: config.http.baseUri,
      sites: sites
   });
});

app.post('/', function(req) {
   // FIXME error handling
   var title = req.params.newSiteTitle.trim();
   var domain = req.params.newSiteDomain.trim();
   (new Site({
      title: title,
      domain: domain,
   })).save();
   return Response.redirect('/');
});

/**
 * Show statistic overview
 * @param {String} timeKey the month timekey for which to show statistics
 */
// detail page
app.get('/stats/:siteKey/:timeKey?', function(req, siteKey, timeKey) {
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

   var site = store.query('from Site where Site.title = :siteKey limit 1', {siteKey: siteKey})[0];
   var aggregateTimeKeys = store.query('select HitAggregate.' + duration +' from HitAggregate \
      where HitAggregate.site = :site and HitAggregate.duration = :duration', {
      site: site._id,
      duration: duration
   });
   return reinhardt.renderResponse('stats.html', {
      site: siteKey,
      duration: duration,
      pageTimeKey: timeKey,
      timeKeys: aggregateTimeKeys,
      'aggregates': {
         daily: aggregatedata(siteKey, timeKey),
         monthly: aggregatedata(siteKey, timeKey.substring(0,4)).filter(function(ha) {
            return ha.month === timeKey;
         }),
      },
      'distributions': [
         distributiondata(siteKey, 'referer', timeKey),
         distributiondata(siteKey, 'userAgent', timeKey),
         distributiondata(siteKey, 'page', timeKey),
         distributiondata(siteKey, 'age', timeKey)
      ]
   });
});

/**
 * @returns aggregated hits & uniques in json
 */
var aggregatedata = function (siteKey, timeKey) {
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

   var site = store.query('from Site where Site.title = :siteKey limit 1', { siteKey: siteKey})[0];

   var hitAggregates = store.query('from HitAggregate where HitAggregate.duration = :duration \
      and HitAggregate.' + duration +' = :timeKey and HitAggregate.site = :site order by HitAggregate.' + aggregateDuration + ' desc', {
         timeKey: timeKey,
         site: site._id,
         duration: aggregateDuration
   });
   return [ha.serialize() for each (ha in hitAggregates)];
}

/**
 * @returns distribution data as json.
 */
var distributiondata = exports.distributiondata = function(siteKey, distributionKey, timeKey) {
   if (!timeKey) {
      var now = new Date();
      timeKey = dateToKey(now, 'month');
   }

   var site = store.query('from Site where Site.title = :siteKey limit 1', { siteKey: siteKey})[0];

   var distributions = store.query('from Distribution where Distribution.duration = "month" \
      and Distribution.key = :distributionKey and Distribution.month = :timeKey and Distribution.site = :site limit 1', {
         distributionKey: distributionKey,
         timeKey: timeKey,
         site: site._id
      });
   // FIXME CPU heavy - move to clientside?
   var data = JSON.parse(distributions[0].distributions);
   var counts = data.map(function(d) {
      return d.count;
   })
   var sum = counts.reduce(function(p, c){
      return p+c;
   }, 0);
   var maxCount = Math.max.apply(null, counts);
   return {
      key: distributionKey,
      maxCount: maxCount,
      sum: sum,
      data: data
   };
}
