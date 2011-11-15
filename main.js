// stdlib
var {Application} = require('stick');
var {Server} = require('ringo/httpserver');
var {join} = require('fs');
var {setInterval} = require('ringo/scheduler');

// custom
var actions = require('./actions');
var config = require('./config');

var app = Application();
app.configure('static', 'basicauth', 'cookies', 'params', 'route', 'requestlog', 'notfound');

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
var engine = require("ringo/engine").getRhinoEngine();
var cronWorker = engine.getWorker();
cronWorker.scheduleInterval(config.stats.update.statistics * 1000 * 60, this, require('./cron').updatestats);
cronWorker.scheduleInterval(config.stats.update.clickgraph * 1000 * 60, this, require('./cron').updateClickGraph);
var hitQueueWorker = engine.getWorker();
var HitQueue = require('./actions').HitQueue;
hitQueueWorker.scheduleInterval(config.stats.update.hitqueue * 1000 * 60, HitQueue , HitQueue.process);

// go!
var server = server || new Server({port: config.http.port, app: app});
server.start();
