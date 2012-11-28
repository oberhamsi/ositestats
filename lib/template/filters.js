exports.keytodate = function(value) {
   return new Date(value.substring(0,4), value.substring(4,6), value.substring(6,8) || 0) || new Date();
}
