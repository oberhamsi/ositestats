var log = require("ringo/logging").getLogger(module.id);
var term = require("ringo/term");
var shell = require("ringo/shell");
var fs = require('fs');

exports.create = function create(args) {
    var path = args[0]
    if (!path || !fs.exists(path) || !fs.isDirectory(path)) {
        term.writeln(term.RED, path + ' does not exist or is not a directory');
        exports.help();
        return;
    }
    fs.copy(getResource('../../assets/config.json'), fs.join(path, 'config.json'));
    return;
};

exports.help = function help() {
    term.writeln("\nCreates a new ositesats instance.\n");
    term.writeln("Usage:");
    term.writeln("  ositestats create /var/www/ositestats-foo/");
    return;
};

exports.info = function info() {
    term.writeln(term.BOLD, "\tcreate", term.RESET, "-", "Creates a new ositestats instance");
};
