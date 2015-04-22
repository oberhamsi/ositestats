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
   //store.executeUpdate('DELETE from distribution where distribution.site = ' + site._id);
   log.info('Truncated distribution for', site)
   //store.executeUpdate('DELETE from hitaggregate where hitaggregate.site = ' + site._id);
   log.info('Truncated hitaggregate for', site)
   // this is only useful for ositestats developers
   // because the hits get processed by the hitqueue worker; so
   // no unprocessed hits should ever be in the DB
   if (false) {
      store.executeUpdate('DELETE from processedhit where processedhit.site = ' + site._id, [], store.getConnection());
      log.info('Truncated processedhits for', site)
      site.processHits(log);
   }
   site.aggregate(log);
   require('system').exit();
}

exports.help = function help() {
    term.writeln("\nDrops all aggregated data for a site and recalculates it.\n");
    term.writeln("Usage:");
    term.writeln("  ositestats aggregate /var/www/ositestats-foo/ site-foo");
    return;
};

exports.info = function info() {
    term.writeln(term.BOLD, "\aggregate", term.RESET, "-", "Aggregate data for a site");
};
