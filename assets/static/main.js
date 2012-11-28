
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

var setupCharts = function() {
   var days = $('#tab-aggregate table tr th').slice(3).map(function() { return $(this).text()}).get();
   var pages = $('#tab-aggregate table tr td:nth-child(2)').map(function() { return parseInt($(this).text(), 10)}).get();
   var uniques = $('#tab-aggregate table tr td:nth-child(3)').map(function() { return parseInt($(this).text(), 10)}).get();
   pages.reverse();
   uniques.reverse();
   days.reverse();
   console.log(days, uniques)
   new Ico.LineGraph(
      "aggregategraph",
      [pages, uniques],
      {
         //labels: {values: days, angle: 90, add_padding: true, grid:false},
         colors: ['#B53B80', '#3C80B5'],
         font_size: 10,
         axis: true,
         curve_amount: 0,
         x_padding_left: 40,
         y_padding_bottom: 40,
         width: 700,
         height: 300
      }
   );
}

$(document).ready(function() {
   $('.tabheading > li').click(function() {
      $('.tab').hide();
      $('.tabheading > li').removeClass('active');
      var $tab = $($(this).data('tab'));
      $tab.show();
      $(this).addClass('active');
   });
   setupGraph();
   setupCharts();
   $('.tabheading > li:first').click();
   return;
});



