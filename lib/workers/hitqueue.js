var log = require('ringo/logging').getLogger(module.id);

var config = require('../config').data;
var store = config.store;
var {Hit, ProcessedHit} = require('../model');

var onmessage = function(event) {
   process(event.data);
};

var process = function(data) {
   log.info('Processing HitQueue (length={})', hitQueue.length);
   hitQueue.forEach(function(data) {
      data.site = store.query('from Site where Site.title = :siteTitle', {siteTitle: data.siteTitle})[0];
      var hit = new Hit(data);
      hit.save();
      var processedHit = ProcessedHit.create(hit);
      processedHit.save();
   });
};
