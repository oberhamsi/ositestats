var numbers = require('ringo/utils/numbers');

/**
 * Converts a Date to a timeKey.
 * @param {Date} date the date to convert
 * @param {String} duration the kind of key we want: 'day', 'month', or 'year'.
 * @returns {String} the key for the given date and duration
 *
 */
var dateToKey = exports.dateToKey = function (date, duration) {
   if (duration === 'day') {
      return [date.getFullYear(),
              numbers.format(date.getMonth(), "00"),
              numbers.format(date.getDate(), "00")
             ].join('');
   } else if (duration === 'month') {
      return [date.getFullYear(),
              numbers.format(date.getMonth(), "00")
             ].join('');
   } else if (duration === 'year') {
      return ""+date.getFullYear();
   } else {
      throw new Error('unknown duration');
   }
}


var extractDomain = exports.extractDomain = function(uri) {
   try {
      uri = new java.net.URL(uri);
   } catch(e) {
      //java.net.MalformedURLException
      return null;
   }
   if (!uri || !uri.getHost()) return null;

   var domainParts = uri.getHost().split('.');
   if (domainParts.length > 2) {
      domainParts.splice(0,1);
   }
   return domainParts.join('.');
}


/**
 * Converts a timeKey to a Date
 * @param {String} key the key to convert
 * @return {Date} date for the key
 */
var keyToDate = exports.keyToDate = function (key) {
   var date = new Date();
   var year = parseInt(key.substr(0,4), 10);
   var month = 0;
   // day
   if (key.length === 8) {
      var day = parseInt(key.substr(6,2), 10);
      month = parseInt(key.substr(4,2), 10);
      date.setDate(day);
   // month
   } else if (key.length == 6) {
      date.setDate(1);
      month = parseInt(key.substr(4,2), 10);
   // year
   } else if (key.length == 4) {
      date.setDate(1);
   }
   date.setYear(year);
   date.setMonth(month);
   date.setHours(0);
   date.setMinutes(0);
   date.setSeconds(0);
   date.setMilliseconds(0);
   return date;
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
