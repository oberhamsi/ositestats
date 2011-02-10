exports.unique = function(array) {
   return array.filter(function(item, idx) {
      return idx === array.lastIndexOf(item);
   });
};

function sum(array) {
   var s= 0;
   array.forEach(function(i) {
      s += i;
   });
   return s;
};

exports.getMovingAverages = function(array, len) {
   var averaged = [];
   var chunk = [];
   array.forEach(function(item) {
      chunk.push(item);
      if (chunk.length > len) {
         averaged.push(sum(chunk) / chunk.length);
         chunk = [];
      }
   });
   return averaged;
};

exports.getAverage = function(array) {
   if (!array || array.length < 1) {
      return 0;
   }
   
   return parseInt(array.reduce(function(x,y) { return x+y;}) / array.length, 10);
};
