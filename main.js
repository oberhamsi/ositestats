// stdlib
var {Application} = require('stick');
var {Server} = require('ringo/httpserver');
var {join} = require('fs');
var {Worker} = require('ringo/worker');
require("ringo/logging").setConfig(getResource("./log4j.properties"));

// custom
var actions = require('./actions');
var config = require('./config');

var app = Application();
app.configure('static', 'basicauth', 'cookies', 'params', 'route', 'requestlog', 'notfound');

// auth
app.basicauth('/stats', config.auth.user, config.auth.password_sha1);

// dashboard
app.get('/', actions.index.GET);
app.post('/', actions.index.POST);

// counter pixel
app.get('/hit', actions.hit);
app.get('/blank', actions.blank);

// detail page
app.get('/stats/:siteKey/:timeKey?', actions.stats);

// json
app.get('/aggregatedata/:siteKey/:timeKey', actions.aggregatedata);
app.get('/distributiondata/:siteKey/:distributionKey/:timeKey', actions.distributiondata);

// static
app.static(module.resolve('./static'));

// startup server & aggregator worker
if (require.main === module) {
   var aggregator = new Worker(module.resolve('./workers/aggregator'));
   // FIXME ringo
   require('./workers/aggregator');
   aggregator.postMessage();
   config.hitQueue = module.singleton('hitqueue', function() {
      return (new Worker(module.resolve('./workers/hitqueue')));
   });
   // FIXME ringo
   require('./workers/hitqueue');
   config.hitQueue.postMessage();
   var server = server || new Server({port: config.http.port, app: app});
   server.start();
}
