var {clickGraphSettings} = require('./config');
var {keyToDate} = require('./model');

exports.clickGraphPath_macro = function(tag) {
	var site = tag.parameters[0];
	return clickGraphSettings.url + '/' + site + '/';
};

exports.keyToDate_filter = function(input) {
   return keyToDate(String(input));
};
