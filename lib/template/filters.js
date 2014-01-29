var {keyToDate} = require('../helpers');

exports.keytodate = function(input) {
   return keyToDate(String(input));
};


exports.percent = function(value, arg) {
   return (value / arg) * 100;
}
