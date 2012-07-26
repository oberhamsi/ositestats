var {setInterval} = require('ringo/scheduler');
var log = require('ringo/logging').getLogger(module.id);

var config = require('../config').data;
var store = config.store;
var hitQueue = [];

var isRunning = false;
var onmessage = function(event) {
   if (isRunning) {
      if (event.data) {
         hitQueue.push(event.data);
      }
   } else {
      isRunning = true;
      setInterval(function() {
         try {
            process();
         } catch (e) {
            log.error (e);
         }
      }, 1000 * config.interval.hitqueue);
      log.info('Started');
   }
};

// save to disk

var process = function() {
   var {Hit} = require('../model');
   if (hitQueue.length) {
      log.info('Processing HitQueue (length={})', hitQueue.length);
      hitQueue.forEach(function(data) {
         data.site = store.query('from Site where Site.title = :siteTitle', {siteTitle: data.siteTitle})[0];
         (new Hit(data)).save();
      });
   }
   hitQueue = [];
};
