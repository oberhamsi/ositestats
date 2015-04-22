exports.Hit = require('./models/hit').Hit;
exports.ProcessedHit = require('./models/hit').ProcessedHit;
exports.HitAggregate = require('./models/hitaggregate').HitAggregate;
exports.Distribution = require('./models/distribution').Distribution;
exports.Site = require('./models/site').Site;

require('./config').data.store.syncTables();