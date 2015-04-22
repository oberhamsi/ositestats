// stdlib
var {Server} = require('ringo/httpserver');
var {join} = require('fs');
var {Worker} = require('ringo/worker');
var term = require("ringo/term");

exports.serve = function(args) {
   // init instance config
   var config = require('../config');
   var path = args[0];
   config.init(path);

   // startup server & aggregator worker
   var aggregator = new Worker(module.resolve('../workers/aggregator'));
   // start workers
   aggregator.postMessage();
   config.data.hitQueue.postMessage();
   var server = new Server({
      host: config.data.http.host, 
      port: config.data.http.port, 
      appModule: module.resolve('../actions'),
      appName: 'app'
   });
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