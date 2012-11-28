exports.keytodate = function(value) {
   return new Date(value.substring(0,4), parseInt(value.substring(4,6), 10) + 1, value.substring(6,8) || 0) || new Date();
}
