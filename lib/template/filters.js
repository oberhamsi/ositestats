var {keyToDate} = require('./helpers');

exports.keyToDate_filter = function(input) {
   return keyToDate(String(input));
};


exports.percent = function(value, arg) {
   return (value / arg) * 100;
}