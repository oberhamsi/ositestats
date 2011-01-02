var config = require('./config');
var {keyToDate} = require('./model');

exports.keyToDate_filter = function(input) {
   return keyToDate(String(input));
};
