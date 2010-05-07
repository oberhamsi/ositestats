var {setInterval} = require('ringo/scheduler');

module.shared = true

exports.httpConfig = {
  staticDir: './static',
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
exports.store = new Store('/home/simon/db.sitestats/', {enableTransactions: false});

exports.macros = [
    'ringo/skin/macros',
    'ringo/skin/filters',
];

exports.charset = 'UTF-8';
exports.contentType = 'text/html';

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
