var config = require('./config');
var {keyToDate} = require('./helpers');

exports.keyToDate_filter = function(input) {
   return keyToDate(String(input));
};
