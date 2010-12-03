var {setInterval} = require('ringo/scheduler');

module.shared = true

exports.httpConfig = {
  staticDir: './static',
  host: "127.0.0.1",
  port: 8787,
};

exports.urls = [
    [ '/', require('./actions') ]
];

exports.macros = [
    'ringo/skin/macros',
    'ringo/skin/filters',
    './macros',
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
 * How often should sitestats recalculate the statistics?
 */
var statsUpdateInterval = 30; // minutes

/**
 * How often should sitestats update the clickgraph
 */
var clickGraphUpdateInterval = 6 * 60; // minutes

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
 * Cronjob creating the statistics
 */
if (!crons) {
   var crons = exports.crons = {
      aggregator: setInterval(require('./cron').updatestats, 1000 * 60 * statsUpdateInterval),
      clickGraphUpdater: setInterval(require('./cron').updateClickGraph, 1000 * 60 * clickGraphUpdateInterval),
   }
};

/**
 * generates site click graphs
 */
var {join} = require('fs');
exports.clickGraphSettings = {
	// where to store png & dot files, and under which url they are reachable
	directory: join(module.directory, './static/clickgraphs/'),
	url: './static/clickgraphs/',
	
	// per site config, sites not mentioned here don't get a sitegraph
	sites: {
		'example': {
		},
	}
};


exports.app = 'ringo/webapp';
