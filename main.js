// stdlib
var {Application} = require('stick');
var {Server} = require('ringo/httpserver');
var {join} = require('fs');
var {setInterval} = require('ringo/scheduler');

// custom
var actions = require('./actions');
var config = require('./config');

var app = Application();
app.configure('static', 'basicauth', 'params', 'route', 'requestlog', 'notfound');

// auth
app.basicauth('/stats', config.stats.user.name, config.stats.user.password_sha1);

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

// cron jobs updating stats
var crons = crons || {
   aggregator:
      setInterval(
         require('./cron').updatestats,
         config.stats.update.statistics * 1000 * 60
      ),
   clickGraphUpdater:
      setInterval(
         require('./cron').updateClickGraph,
         config.stats.update.clickgraph * 1000 * 60
      ),
   hitQueueProcessor:
      setInterval(
         function() {
            require('./actions').HitQueue.process();
         },
         config.stats.update.hitqueue * 1000 * 60
      ),
};
exports.crons = crons;

// go!
var server = server || new Server({port: config.http.port, app: app});
server.start();
