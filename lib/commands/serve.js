// stdlib
var {Application} = require('stick');
var {Server} = require('ringo/httpserver');
var {join} = require('fs');
var {Worker} = require('ringo/worker');
var term = require("ringo/term");

exports.serve = function(args) {
   // init instance config
   var config = require('../config');
   var path = args[0];
   config.init(path);

   var actions = require('../actions');
   // custom
   var app = Application();
   app.configure('static', 'basicauth', 'cookies', 'params', 'route', 'requestlog', 'notfound');

   // auth
   app.basicauth('/stats', config.data.auth.user, config.data.auth.password_sha1);

   app.static(module.resolve('../../assets/static/'));
   if (config.data.http.staticDir) {
      app.static(config.data.http.staticDir)
   }
   // dashboard
   app.get('/', actions.index.GET);
   app.post('/', actions.index.POST);

   // counter pixel
   app.get('/hit', actions.hit);
   app.get('/blank', actions.blank);

   // detail page
   app.get('/stats/:siteKey/:timeKey?', actions.stats);

   // json
   app.get('/alldata/:siteKey/:timeKey', actions.alldata);
   app.get('/aggregatedata/:siteKey/:timeKey', actions.aggregatedata);
   app.get('/distributiondata/:siteKey/:distributionKey/:timeKey', actions.distributiondata);

   // startup server & aggregator worker
   var aggregator = new Worker(module.resolve('../workers/aggregator'));
   // start workers
   aggregator.postMessage();
   config.data.hitQueue.postMessage();
   var server = server || new Server({host: config.data.http.host, port: config.data.http.port, app: app});
   server.start();
}

exports.help = function help() {
   term.writeln("\nServe an ositestats instance.\n");
   term.writeln("Usage:");
   term.writeln("  ositestats serve /var/www/ositestats-foo/");
   return;
};

exports.info = function info() {
   term.writeln(term.BOLD, "\tserve", term.RESET, "-", "Serve an ositestats instance");
}