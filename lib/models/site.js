var {store} = require('../config').data;
var {Hit, HitAggregate, Distribution, ProcessedHit} = require('../model');
var {keyToDate, dateToKey} = require('../helpers');

var MAPPING_SITE = {
   table: 'site',
   properties: {
      title: {type: 'string'},
      domain: {type: 'string'}
   }
};

/**
 * Returns the first timeKey for which the given entity has
 * Hits to process. This is used by updatestats() to determine
 * which aggregations need processing.
 * @param {Prototype} entity either Distribution or HitAggregate
 * @param {String} duration 'hour' or 'month'
 */
var getTodoKey = exports.getTodoKey = function(entity, duration, site) {
   var item = entity.getNewest(site, duration);
   var starttime = null;

   if (item) {
      var hit = ProcessedHit.getNewest(site, duration);
      if (hit && hit[duration] >= item[duration]) {
         starttime = item[duration];
      }
   } else {
      hit = ProcessedHit.getOldest(site);
      if (hit) {
         starttime = hit[duration];
      }
   }

   return starttime;
};


/**
 * Site
 */
var Site = exports.Site = store.defineEntity('Site', MAPPING_SITE);
Site.prototype.toString = function() {
   return '[Site] ' + this.title + ' (' + this.domain + ')';
};

// too lazy to do relation table
Site.prototype.getDomains = function() {
   if (!this._domains) {
      this._domains = this.domain.split(',').map(function(domain) { return domain.trim(); });
   }
   return this._domains;
};

Site.prototype.aggregate = function(log) {
   for each (var entity in [HitAggregate, Distribution]) {
      for each (var duration in ['day', 'month']) {
         if (entity == Distribution && duration === 'day') {
            continue;
         }

         // first key for which we need to calculate distribution & aggregation
         var startKey = getTodoKey(entity, duration, this);
         if (!startKey) {
            continue;
         }

         // increase key by duration and create dist & agg for each key
         // until we are at current time.
         var currentKey = startKey;
         var currentDate = keyToDate(startKey);
         var now = dateToKey(new Date(), duration);
         while (currentKey <= now) {
            var item = entity.create(currentKey, this);
            log.info(item.toString());
            if (duration === 'day') {
               currentDate.setDate(currentDate.getDate()+1);
            } else {
               currentDate.setMonth(currentDate.getMonth()+1);
            }
            currentKey = dateToKey(currentDate, duration);
         }
      }
   }
}

Site.prototype.processHits = function(log) {
   var hits = store.query('from Hit where Hit.site = :site', {site: this._id});
   hits.forEach(function(hit, idx) {
      var ph = ProcessedHit.create(hit);
      ph.save();
      if (idx % 300) {
         log.info('Processed 300 hits for ', this);
      }
   }, this);
}