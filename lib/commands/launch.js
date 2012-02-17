// stdlib
var {Application} = require('stick');
var {Server} = require('ringo/httpserver');
var {join} = require('fs');
var {Worker} = require('ringo/worker');
var term = require("ringo/term");

exports.launch = function(args) {
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
   app.static(module.resolve('../assets/static'));

   // startup server & aggregator worker
   var aggregator = new Worker(module.resolve('../workers/aggregator'));   
   var server = server || new Server({port: config.data.http.port, app: app});
   server.start();
}

exports.help = function help() {
   term.writeln("\nLaunch an ositestats instance.\n");
   term.writeln("Usage:");
   term.writeln("  ositestats launch /var/www/ositestats-foo/");
   return;
};

exports.info = function info() {
   term.writeln(term.BOLD, "\tlaunch", term.RESET, "-", "Launch an ositestats instance");
}