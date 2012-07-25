var {store} = require('../config').data;
var $f = require('ringo/utils/strings').format;

var MAPPING_HIT = {
   table: 'hit',
   properties: {
      timestamp: {type: 'long'},
      site: {
         type: 'object',
         entity: 'Site',
      },
      ip: {type: 'string'},
      userAgent: {type: 'string'},
      unique: {type: 'string'},
      referer: {type: 'string'},
      page: {type: 'string'},

      day: {type: 'string'},
      month: {type: 'string'},
   }
};

/**
 * Hit. A single PageView by a client.
 */
var Hit = exports.Hit = store.defineEntity('Hit', MAPPING_HIT);

/**
 * String rep
 */
Hit.prototype.toString = function() {
   return $f('[{} - {} - {} - {}]', this.ip, new Date(this.timestamp), this.page, this.userAgent);
};

Hit.getNewest = function(site) {
   return Hit.query().equals('site', site).orderBy('timestamp desc').limit(1).select()[0];
};

Hit.getOldest = function(site) {
   return Hit.query().equals('site', site).orderBy('timestamp').limit(1).select()[0];
}