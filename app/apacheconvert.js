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
      date.setDate(parseInt(tparts[0].slice(1,3), 10));
      date.setHours(parseInt(tparts[1], 10));
      date.setMinutes(parseInt(tparts[2], 10));
      date.setSeconds(parseInt(tparts[3], 10));
      var day = dateToKey(date, 'day');
      var month = dateToKey(date, 'month');
      (new Hit({
         timestamp: date.getTime(),
         ip: ip,
         userAgent: ua,
         unique: ip,
         referer: ref,
         page: page,

         day: day,
         month: month,
      })).save();
   }
}

for (var i=1;i<=22;i++) {
   print (' >' + i);
   importLog('/home/simon/access_log.' + i);
}
