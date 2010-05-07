include('fs');
include('model');

var importLog = function(logfile) {
   var log = open(logfile)
   var lines = log.read().split('\n');
   for each (line in lines) {
      if (!line) continue;
      
      var parts = line.split(' ');
      var ip = parts[0];
      var time = parts[3];
      var page = parts[6];
      if (page.indexOf('stories') < 0) continue;
      
      var ref = parts[10];
      var ua = parts.slice(11).join(' ');
      if (!time) continue;
      var tparts = time.split(':')
      var date = new Date();
      if (tparts[0].slice(4,6) === 'Ap') {
         date.setMonth(3);
      } else {
         date.setMonth(4);
      }
      date.setDate(parseInt(tparts[0].slice(1,3), 10));
      date.setHours(parseInt(tparts[1], 10));
      date.setMinutes(parseInt(tparts[2], 10));
      date.setSeconds(parseInt(tparts[3], 10));
      var day = dateToKey(date, 'day');
      var month = dateToKey(date, 'month');
      (new Hit({
         timestamp: date.getTime(),
         ip: ip,
         site: 'nekapuzer',
         userAgent: ua,
         unique: ip,
         referer: ref,
         page: page,

         day: day,
         month: month,
      })).save();
   }
}

for (var i=16;i>=10;i--) {
   print (' >' + i);
   importLog('/home/simon/access_log.' + i);
}
