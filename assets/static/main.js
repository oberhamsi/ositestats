
/**
 * Main
 */
var graph = null;
var setupGraph = function() {
   graph = Viva.Graph.graph();
   var layout = Viva.Graph.Layout.forceDirected(graph, {
      springLength : 180,
      springCoeff : 0.000005,
   });
   var graphics = Viva.Graph.View.svgGraphics();
   graphics.link(function(node) {
   var svg = Viva.Graph.svg('line')
         .attr('stroke', '#999')
         .attr('stroke-width', Math.max(1, node.data.relativeWeight))
         .attr("marker-end", "url(#Triangle)");
      return svg;
   });
   graphics.node(function(node) {
      var svg = Viva.Graph.svg('text')
         .text(node.id);
      return svg;
   });
   var renderer = Viva.Graph.View.renderer(graph, {
      layout: layout,
      graphics: graphics,
      container: $('#clickgraph')[0]
   });
   renderer.run();
   graphics.graphCenterChanged(300, 250)
}

$(document).ready(function() {
   // templates
   $.template('distribution', $('[template=distribution]'));
   $.template('aggregate', $('[template=aggregate]'));
   $.template('agedistribution', $('[template=agedistribution]'));

   setupGraph();

   $('#timeKeys > div').click(onTimeKeyChange)
   var timeKey = document.location.hash.length > 1 && document.location.hash.substr(1) || settings.timeKey;
   if (timeKey) {
      $('div[data-timekey=' + timeKey + ']').click();
   } else {
      $('#timeKeys > div:last-child').click();
   }
   return;
});

function loadGraph(timeKey) {
   graph.clear();
   $.ajax({
      url: '/clickgraphs/' + settings.site + '/' + timeKey + '.json',
      success: function(data) {
         data.links.forEach(function(link) {
            graph.addLink(link.from, link.to, link);
         });
      }
   });
}

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

   loadGraph(timeKey);

   // inject distribution data in callback
   $.get('/alldata/' + settings.site + '/' + timeKey, function(data) {

      ['referer', 'userAgent', 'page'].forEach(function(key) {
         $tabs.append(renderDistTable(JSON.parse(data['distributiondata/' + key].body)));
      });
      $tabs.append(renderAgeDistTable(JSON.parse(data['distributiondata/age'].body)));
      $tabs.append(renderAggregateTable(JSON.parse(data['aggregatedata'].body)));

      var yearData = JSON.parse(data['aggregatedata/year'].body);
      var currentMonthAggregate = null;
      yearData.aggregates.some(function(aggregate) {
         if (aggregate.month == timeKey) {
            currentMonthAggregate = aggregate;
            return true;
         }
         return false;
      });
      if (currentMonthAggregate) {
         $("#monthUniques").html(currentMonthAggregate.uniques);
         $("#monthHits").html(currentMonthAggregate.hits);
         $("#monthHuman").text($monthButton.text())
      }

      if (!activeTab) {
         $('.tabheading > li:first').trigger('click');
      } else {
         $('.tabheading > li[data-tab=' + activeTab + ']').trigger('click')
      }
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
   var lastKey = null;
   keys.forEach(function(k, idx) {
      k = parseInt(k, 10)
      for (var missingK = lastKey+1; missingK < k; missingK++) {
         distData.push({key: missingK, value: 0});
      }
      distData.push({key: k, value: distributions[k]});
      maxValue = Math.max(maxValue, distributions[k]);
      sum += distributions[k];
      lastKey = k;
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

