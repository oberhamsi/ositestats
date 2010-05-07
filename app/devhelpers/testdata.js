include('./model');

var timestamp = Date.now();
timestamp -= (1000 * 60 * 60 * 24 * 30);

// create a couple of uniques to choose from
var uniques = [];
for (var i=0;i<10;i++) {
   uniques.push("a0sdf80 " + Math.random() * 100000 + "as0d9f80");
}

for (var i=0;i<1000;i++) {
   var date = new Date(timestamp);
   var day = dateToKey(date, 'day');
   var month = dateToKey(date, 'month');
   var ip = [(Math.random()*256),(Math.random()*256),(Math.random()*256),(Math.random()*256)].join('.')
   if (Math.random() > 0.2) {
      uniques.push("a0sdf80 " + Math.random() * 100000 + "as0d9f80");
   }
   var unique = uniques[parseInt(Math.random() * uniques.length)];
   var refs = [
      'http://google.com?abc',
      'http://twitter.com',
      'http://orf.at',
      null,
   ];
   var pages = [
      '/start',
      '/aboutus',
      '/team',
      '/producst',
   ];
   var uas = [
      'Firefox',
      'IE',
      'Opera',
      'Safari'
   ];
   var referer = refs[parseInt(Math.random() * 3)];
   var page = pages[parseInt(Math.random() * 3)];
   var userAgent = uas[parseInt(Math.random() * 3)];
   (new Hit({
      timestamp: date.getTime(),
      ip: ip,
      userAgent: userAgent,
      unique: unique,
      referer: referer,
      page: page,

      day: day,
      month: month,
   })).save();
   timestamp += parseInt((1000 * 60 * (Math.random() * 600)));
}

include('cron')
updatestats()
