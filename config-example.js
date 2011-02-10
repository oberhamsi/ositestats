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
});

/**
 * Statistic settings
 */
exports.stats = {
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
