var log = require("ringo/logging").getLogger(module.id);
var term = require("ringo/term");
var system = require('system');

exports.addsite = function aggregate(args) {
   var config = require('../config');
   if (!args[0] || !args[1] || !args[2]) {
      help();
      return;
   }
   var path = args[0];
   config.init(path);
   var store = config.data.store;
   var site = store.query('from Site where Site.title = :site limit 1', {site: args[1]});
   if (site.length > 0) {
      term.writeln('Site', args[1], 'already exists.');
      system.exit();
   }
   var {Site} = require('../model');
   site = new Site({title: args[1].trim(), domain: args[2].trim()});
   site.save();
   system.exit();
}

exports.info = function info() {
    term.writeln(term.BOLD, "\taddsite", term.RESET, "-", "Adds a site to a ositestats instance");
    return;
};

exports.help = function help() {
    term.writeln("Adds a site with domain to the counting sites.\n");
    term.writeln("Example:");
    term.writeln("\tositestats addsite /var/www/ositestats-foo/ site-foo example.com");
    term.writeln();
    term.writeln("Seperate multiple domains with ',':");
    term.writeln("\tositestats addsite /var/www/ositestats-foo/ site-foo example.com,foo.example.com")
    term.writeln();
    return;
};
