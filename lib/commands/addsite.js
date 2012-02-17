var term = require("ringo/term");

exports.info = function info() {
    term.writeln(term.BOLD, "\taddsite", term.RESET, "-", "Adds a site to a ositestats instance");
    return;
};
