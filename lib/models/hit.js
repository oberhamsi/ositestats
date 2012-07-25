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
   return store.query('from Hit where Hit.site = :site order by Hit.timestamp desc limit 1', {site: site._id})[0];
};

Hit.getOldest = function(site) {
   return store.query('from Hit where Hit.site = :site order by Hit.timestamp asc limit 1', {site: site._id})[0]
}