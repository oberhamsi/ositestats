var data = exports.data = module.singleton('data', function() {return {}; });
var fs = require('fs');

exports.init = function(path) {
  var fs = require('fs');

  var Store = require("ringo-sqlstore").Store;

  var config = JSON.parse(fs.read(fs.join(path, './config.json')));
  data.auth = config.auth || auth;
  data.interval = config.interval || {
   statistics: 30,      // update aggregation every x minutes
   clickgraph: 6 * 60,  // redraw clickgraph every x min
   hitqueue: 5          // write hitqueue to DB every x min
  };
  data.clickgraph = {
    directory: config.clickgraph.directory || fs.resolve(module.directory, '../assets/static/clickgraphs/'),
    dot: config.clickgraph.dot || '/usr/bin/dot',
    sites: config.clickgraph && config.clickgraph.sites || []
  }
  data.store = new Store(config.store, {
   maxConnections: 100,
   cacheSize: 0
  });
  // register all models
  require('./model');
  data.http = {
    staticDir: config.http.staticDir,
    host: config.http.host,
    port: config.http.port,
    baseUri: 'http://' + config.http.host + ':' + config.http.port
  }
  data.hitQueue = module.singleton('hitqueue', function() {
      return (new require("ringo/worker").Worker(module.resolve('./workers/hitqueue')));
  });
  return;
}