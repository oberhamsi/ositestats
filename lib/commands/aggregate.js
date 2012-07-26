var log = require("ringo/logging").getLogger(module.id);
var term = require("ringo/term");
var shell = require("ringo/shell");
var fs = require('fs');

exports.aggregate = function aggregate(args) {
   var config = require('../config');
   if (!args[0] || !args[1]) {
      help();
      return;
   }
   var path = args[0];
   config.init(path);
   var store = config.data.store;
   var site = store.query('from Site where Site.title = :site limit 1', {site: args[1]})[0]
   store.executeUpdate('DELETE from distribution where distribution.site = ' + site._id, [], store.getConnection());
   store.executeUpdate('DELETE from hitaggregate where hitaggregate.site = ' + site._id, [], store.getConnection());
   site.aggregate(log);
}

exports.help = function help() {
    term.writeln("\nDrops all aggregated data for a site and recalculates it.\n");
    term.writeln("Usage:");
    term.writeln("  ositestats aggregate /var/www/ositestats-foo/ site-foo");
    return;
};

exports.info = function info() {
    term.writeln(term.BOLD, "\tcreate", term.RESET, "-", "Creates a new ositestats instance");
};
