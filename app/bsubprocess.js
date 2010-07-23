/**
 * ringo subprocess but with binary streams not textstreams
 */

include('io');

function createProcess(args) {
    // make command either a single string or an array of strings
    var command = args.length == 1 ? String(args[0]) : Array.map(args, String);
    return java.lang.Runtime.getRuntime().exec(command);
}

function connect(process, output, errput) {
    spawn(function() {
        (new Stream(process.inputStream)).copy(output);
    }).get();
    spawn(function() {
        (new Stream(process.errorStream)).copy(errput);
    }).get();
}

/**
 * executes a given command and returns the
 * standard output.  If the exit status is non-zero,
 * throws an Error.
 * @param {String} command and optional arguments as individual strings
 * @returns String the standard output of the command
 */
exports.command = function() {
    var process = createProcess(arguments);
    var output = new MemoryStream();
    var error = new MemoryStream();
    connect(process, output, error);
    var status = process.waitFor();
    if (status != 0) {
        throw new Error("(" + status + ") " + error.content);
    }
    return output.content;
};
