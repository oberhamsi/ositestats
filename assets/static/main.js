
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
   // Rendering arrow shape is achieved by using SVG markers, part of the SVG
   // standard: http://www.w3.org/TR/SVG/painting.html#Markers
   var createMarker = function(id) {
           return Viva.Graph.svg('marker')
                      .attr('id', id)
                      .attr('viewBox', "0 0 10 10")
                      .attr('refX', "10")
                      .attr('refY', "5")
                      .attr('markerUnits', "userSpaceOnUse")
                      .attr('markerWidth', "30")
                      .attr('markerHeight', "10")
                      .attr('stroke', '#999')
                      .attr('fill', 'white')
                      .attr('orient', "auto");
    };
   window.graphics = graphics;

   var marker = createMarker('Triangle');
   marker.append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z');

   // Marker should be defined only once in <defs> child element of root <svg> element:

   var defs = graphics.getSvgRoot().append('defs');
   defs.append(marker);
   graphics.graphCenterChanged(300, 250)
}

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

var setupCharts = function() {
   var days = $('#tab-aggregate table tr th').slice(3).map(function() { return $(this).text()}).get();
   var pages = $('#tab-aggregate table tr td:nth-child(2)').map(function() { return parseInt($(this).text(), 10)}).get();
   var uniques = $('#tab-aggregate table tr td:nth-child(3)').map(function() { return parseInt($(this).text(), 10)}).get();
   pages.reverse();
   uniques.reverse();
   days.reverse();
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
   loadGraph(settings.pageTimeKey)
   setupCharts();
   $('.tabheading > li:first').click();
   return;
});



