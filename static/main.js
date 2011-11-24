
/**
 * Main
 */
$(document).ready(function() {
   // templates
   $.template('distribution', $('[template=distribution]'));
   $.template('aggregate', $('[template=aggregate]'));

   // user changes drop down time key
   $('#timeKey').change(onTimeKeyChange);
   var timeKey = document.location.hash && document.location.hash.substr(1) || settings.timeKey;
   $('#timeKey').val(timeKey);
   $('#timeKey').trigger('change');

   return;
});


/**
 * timeKey change handler (user changed month in drop down)
 */
function onTimeKeyChange() {
   var timeKey = $(this).val();
   document.location.hash = timeKey;

   var humanReadable = $(this).children("option:selected").text();
   $('#monthTimeKey').html(humanReadable);

   var $tabs = $('#tabs');
   // clear old data
   $tabs.empty();

   // clickgraph img src update
   updateClickGraph(timeKey);

   // aggregates hits, uniques
   $.get('/aggregatedata/' + settings.site + '/' + timeKey, function(data) {
      $tabs.append(renderAggregateTable(data));
      $('.tabheading > li:first').trigger('click');
   });

   // aggregates hits, uniques for whole month
   $.get('/aggregatedata/' + settings.site + '/' + timeKey.substr(0,4), function(data) {
      var currentMonthAggregate = null;
      data.aggregates.some(function(aggregate) {
         if (aggregate.month == timeKey) {
            currentMonthAggregate = aggregate;
            return true;
         }
         return false;
      });
      if (!currentMonthAggregate) {
         return;
      }

      $("#monthUniques").html(currentMonthAggregate.uniques);
      $("#monthHits").html(currentMonthAggregate.hits);

      // inject into distribution data in callback

      var UNIQUES = currentMonthAggregate.uniques;
      $.get('/distributiondata/' + settings.site + '/referer/' + timeKey, function(data) {
         data.totalUniques = UNIQUES;
         $tabs.append(renderDistTable(data, $("table#referer")));
      });
      $.get('/distributiondata/' + settings.site + '/userAgent/' + timeKey, function(data) {
         data.totalUniques = UNIQUES;
         $tabs.append(renderDistTable(data, $("table#useragents")));
      });
      $.get('/distributiondata/' + settings.site + '/page/' + timeKey, function(data) {
         data.totalUniques = UNIQUES;
         $tabs.append(renderDistTable(data, $("table#page")));
      });

   });
};

/**
 * @returns {jQuery} rendered template
 */
function renderDistTable(data) {

   var distributions = JSON.parse(data.distributions[0].distributions);
   var keys = [];
   for (var key in distributions) {
      keys.push(key);
   }
   keys.sort(function(a, b) {
      return ( (distributions[b] || 0) - (distributions[a] || 0));
   });

   var distData = [];
   keys.forEach(function(k) {
      distData.push({key: k, value: distributions[k]});
   });

   return $.tmpl('distribution', {
      distributionKey: data.distributionKey,
      title: data.title,
      distributions: distData,
   },{
      getPercent: function(idx) {
         return String(this.data.distributions[idx].value / data.totalUniques * 100).match(/.?.\.?.?.?/);
      },
   });
};

/**
 * @returns {jQuery} rendered template
 */
function renderAggregateTable(data) {

   var aggData = [];

   var maxValue = 0;

   var date = new Date();
   date.setYear(data.timeKey.substr(0, 4));
   date.setMonth(data.timeKey.substring(4));
   data.aggregates.forEach(function(aggregate) {
      date.setDate(aggregate.day.substr(6,8));
      aggData.push({
         weekend: date.getDay() === 0 || date.getDay() === 6,
         date: date.getDate() + '.',
         hits: aggregate.hits || "0",
         uniques: aggregate.uniques || "0"
      });
      maxValue = Math.max(maxValue, aggregate.uniques, aggregate.hits);
   });

   var MAX_WIDTH = 400;
   return $.tmpl('aggregate', {
         aggregates: aggData
      }, {
      getPixelWidth: function(key, idx) {
         return parseInt(this.data.aggregates[idx][key] / maxValue * MAX_WIDTH, 10);
      },
   });
};

/**
 * update clickgraph img src
 */
function updateClickGraph(timeKey) {
   $clickgraph = $("#clickgraph");
   var url = $clickgraph.attr("data-stat-graphpath") + timeKey + ".png";
   $clickgraph.attr("src", url);
   return;
};
