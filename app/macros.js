var {clickGraphSettings} = require('./config');

exports.clickGraphImgUrl_macro = function(tag) {
	var site = tag.parameters[0];
	var month = tag.parameters[1];
	return clickGraphSettings.url + site + '_' + month + '.png';
};
