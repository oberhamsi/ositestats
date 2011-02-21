var http = exports.http = {
  staticDir: './static',
  host: "127.0.0.1",
  port: 8787,
};
http.baseUri = 'http://' + http.host + ':' + http.port;

/**
 * Store settings
 */
var Store = require("ringo/storage/sql/store").Store;
var store = exports.store = new Store({
    "url": "jdbc:mysql://localhost/ositestats",
    "driver": "com.mysql.jdbc.Driver",
    "username": "root",
    "password": ""
}, {
   maxConnections: 100,
   cacheSize: 0
});

/**
 * Statistic settings
 */
exports.stats = {
   user: {
      name: 'stats',
      // require('ringo/utils/strings').digest('protected', 'sha1')
      password_sha1: '964cab4bb4a5111731b0c00dbb43f794698d8731' // 'protected'
   },
   update: {
      statistics: 30,   // minutes
      clickgraph: 6 * 60,
      hitqueue: 5
   },
   clickgraph: {
      directory: module.resolve('static/clickgraphs/'),
      sites: ['example'],
   },
};
