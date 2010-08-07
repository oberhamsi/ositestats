var {clickGraphSettings} = require('./config');
var {keyToDate} = require('./model');

exports.clickGraphImgUrl_macro = function(tag) {
	var site = tag.parameters[0];
	var month = tag.parameters[1];
	return clickGraphSettings.url + site + '_' + month + '.png';
};

exports.keyToDate_filter = function(input) {
   return keyToDate(String(input));
};
