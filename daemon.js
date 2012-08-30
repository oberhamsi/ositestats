var engine = require("ringo/engine");
var log = require("ringo/logging").getLogger(module.id);
var system = require("system");

/**
 * Called when the application starts
 */
var start = function() {
    log.info("Starting application");
    system.args.shift();
    require('./lib/commands/serve').serve(system.args)
    // register shutdown hook to stop ftp server
    engine.addShutdownHook(function() {
        stop();
    });
};

/**
 * Called when the engine is shut down
 */
var stop = function() {
    var config = require("./lib/config");
    config.data.store.connectionPool.stopScheduler();
    config.data.store.connectionPool.closeConnections();
    log.info("Stopped application");
};

//Script run from command line
if (require.main === module) {
    start();
}
