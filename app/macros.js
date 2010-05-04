
exports.getKey_filter = function getKey_filter(input, tag) {
   print( 'got key ', tag.parameters[0]);
   return input[tag.key];
}
