var {setInterval} = require('ringo/scheduler');
var log = require('ringo/logging').getLogger(module.id);
var {Hit} = require('../model');

var config = require('../config');
var hitQueue = [];

var onmessage = function(event) {
   if (event.data) {
      hitQueue.push(event.data);
   }
};

// save to disk

var process = function() {
   if (hitQueue.length) {
      log.info('Processing HitQueue (length={})', hitQueue.length);
      hitQueue.forEach(function(data) {
         (new Hit(data)).save();
      });
   }
   hitQueue = [];
};

/**
 *
 */
setInterval(process, 1000 * config.interval.hitqueue);
log.info('Started');
