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
exports.contentType = 'text/javascript';

// FIXME safeguard against multi invocation
/*exports.crons = {
   'aggregator': setInterval(require('./cron').aggregate, 1000 * 60),
}
*/
