var databasePath = "/home/simon/db.sitestats.copy/";
var {Store} = require('ringo/storage/berkeleystore');
var h2store = new Store(databasePath, {enableTransactions: false});

var H2Hit = h2store.defineEntity('Hit201005');

var {Hit, Site} = require('../model');

//Hit200807
//Hit200806

var h2hits = H2Hit.query().select();
print ('total hits #' + h2hits.length);
h2hits.forEach(function(hhit) {
   var site = Site.query().equals('title', hhit.site).select()[0];
   if (!site) return;
   
   var hit = new Hit({
      timestamp: hhit.timestamp,
      site: site,
      ip: hhit.ip,
      userAgent: hhit.userAgent,
      unique: hhit.unique,
      referer: hhit.referer,
      page: hhit.page,
      day: hhit.day,
      month: hhit.month,
   });
   hit.save();
});
