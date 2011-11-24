var {setInterval} = require('ringo/scheduler');
var log = require('ringo/logging').getLogger(module.id);
var {Hit} = require('../model');

var config = require('../config');
var hitQueue = [];

var onmessage = function(hitData) {
   if (hitData) {
      hitQueue.push(hitData);
   }
};

// save to disk

var process = function() {
   if (hitQueue.length) {
      log.info('Processing HitQueue (length={})', hitQueue.length);
   }
   hitQueue.splice(0).forEach(function(hitData) {
      (new Hit(hitData)).save();
   });
};

/**
 *
 */
setInterval(process, 1000 * config.interval.hitqueue);
log.info('Started');
