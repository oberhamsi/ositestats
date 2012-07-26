
/**
 * Main
 */
$(document).ready(function() {
   // templates
   $.template('distribution', $('[template=distribution]'));
   $.template('aggregate', $('[template=aggregate]'));
   $.template('agedistribution', $('[template=agedistribution]'));

   // user changes drop down time key
   $('#timeKeys > div').click(onTimeKeyChange)
   var timeKey = document.location.hash.length > 1 && document.location.hash.substr(1) || settings.timeKey;
   if (timeKey) {
      $('div[data-timekey=' + timeKey + ']').click();
   } else {
      $('#timeKeys > div:last-child').click();
   }
   return;
});


/**
 * timeKey change handler (user changed month in drop down)
 */
function onTimeKeyChange() {
   var $monthButton = $(this);
   var timeKey = "" + $monthButton.data('timekey');
   $('#timeKeys > div').removeClass('active');
   $monthButton.addClass('active');
   var activeTab = $('.tabheading > .active').data('tab');

   var $tabs = $('#tabs');
   $('#tab-referer, #tab-userAgent, #tab-aggregate, #tab-page, #tab-age').remove();

   // clickgraph img src update
   updateClickGraph(timeKey);

   // aggregates hits, uniques
   $.get('/aggregatedata/' + settings.site + '/' + timeKey, function(data) {
      $tabs.append(renderAggregateTable(data));
      if (!activeTab) {
         $('.tabheading > li:first').trigger('click');
      } else {
         $('.tabheading > li[data-tab=' + activeTab + ']').trigger('click')
      }
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
      $("#monthHuman").text($monthButton.text())

      // inject into distribution data in callback

      $.get('/distributiondata/' + settings.site + '/referer/' + timeKey, function(data) {
         $tabs.append(renderDistTable(data));
      });
      $.get('/distributiondata/' + settings.site + '/userAgent/' + timeKey, function(data) {
         $tabs.append(renderDistTable(data));
      });
      $.get('/distributiondata/' + settings.site + '/page/' + timeKey, function(data) {
         $tabs.append(renderDistTable(data));
      });
      $.get('/distributiondata/' + settings.site + '/age/' + timeKey, function(data) {
         $tabs.append(renderAgeDistTable(data));
      });
   });
};

/**
 * @returns {jQuery} rendered template
 */
function renderAgeDistTable(data) {

   var distributions = JSON.parse(data.distributions[0].distributions);
   var keys = [];
   for (var key in distributions) {
      keys.push(key);
   }
   keys.sort();

   var distData = [];
   var sum = 0;
   var maxValue = 0;
   keys.forEach(function(k) {
      distData.push({key: k, value: distributions[k]});
      maxValue = Math.max(maxValue, distributions[k]);
      sum += distributions[k];
   });

   var MAX_WIDTH = 100;
   return $.tmpl('agedistribution', {
      distributionKey: data.distributionKey,
      title: data.title,
      distributions: distData,
   },{
      getPercent: function(idx) {
         return String(this.data.distributions[idx].value / sum * 100).match(/.?.\.?.?.?/);
      },
      getPixelWidth: function(idx) {
         return parseInt(this.data.distributions[idx].value / maxValue * MAX_WIDTH, 10);
      },
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
   var sum = 0;
   keys.forEach(function(k) {
      distData.push({key: k, value: distributions[k]});
      sum += distributions[k];
   });


   return $.tmpl('distribution', {
      distributionKey: data.distributionKey,
      title: data.title,
      distributions: distData,
   },{
      getPercent: function(idx) {
         return String(this.data.distributions[idx].value / sum * 100).match(/.?.\.?.?.?/);
      },
      getSize: function(idx, minSize, maxSize) {
         var value = Math.max(minSize, (this.data.distributions[idx].value / sum) * maxSize);
         return value;
      }
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
