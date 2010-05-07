var {setInterval} = require('ringo/scheduler');

module.shared = true

exports.httpConfig = {
  staticDir: './static',
  host: "127.0.0.1"
  port: 8787,
};

exports.urls = [
    [ '/', './actions' ]
];

exports.app = 'ringo/webapp';

exports.middleware = [
    'ringo/middleware/etag',
    'ringo/middleware/responselog',
];

var Store = require('ringo/storage/berkeleystore').Store;

/**
 * Path to database directory
var databasePath = "/usr/local/db.sitestats/
exports.store = new Store(databasePath, {enableTransactions: false});

exports.macros = [
    'ringo/skin/macros',
    'ringo/skin/filters',
];

exports.charset = 'UTF-8';
exports.contentType = 'text/html';

/**
 * base url of app, no trailing slash
 */
exports.baseUri = 'http://127.0.0.1:8787';
/**
 * default site to count if not extra site argument given
 */
exports.defaultSite = 'example';

if (!log) {
   var log = exports.log = require('ringo/logging').getLogger('sitestats');
}

/**
 * cronjob creating the statistics
 */
if (!crons) {
   var crons = exports.crons = {
      'aggregator': setInterval(require('./cron').updatestats, 1000 * 60 * 30),
   }
}
