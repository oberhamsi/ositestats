var {setInterval} = require('ringo/scheduler');

module.share = true

exports.httpConfig = {
  staticDir: './static'
};

exports.urls = [
    [ '/', './actions' ]
];

exports.app = 'ringo/webapp';

exports.middleware = [
    'ringo/middleware/etag',
    'ringo/middleware/responselog'
];

var Store = require('ringo/storage/berkeleystore').Store;
exports.store = new Store('/home/simon/db.sitestats/');

exports.macros = [
    'ringo/skin/macros',
    'ringo/skin/filters'
];

exports.charset = 'UTF-8';
exports.contentType = 'text/html';

// FIXME safeguard against multi invocation
if (!crons) {
   var crons = exports.crons = {
      'aggregator': setInterval(require('./cron').hits, 1000 * 60 * 30),
   }
}
