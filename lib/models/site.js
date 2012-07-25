var {store} = require('../config').data;

var MAPPING_SITE = {
   table: 'site',
   properties: {
      title: {type: 'string'},
      domain: {type: 'string'},

      /**
       without accessName it's easier to query()
      aggregates: {
         type: 'collection',
         entity: 'HitAggregate',
         localProperty: 'id',
         foreignProperty: 'site',
      },

      distributions: {
         type: 'collection',
         entity: 'Distribution',
         localProperty: 'id',
         foreignProperty: 'site',
      },
      **/

   }
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
   return this.domain.split(',').map(function(domain) { return domain.trim(); });
};