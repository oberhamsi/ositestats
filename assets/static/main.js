
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
   $('.tabheading > li').click(function() {
      $('.tab').hide();
      $('.tabheading > li').removeClass('active');
      var $tab = $($(this).data('tab'));
      $tab.show();
      $(this).addClass('active');
   });
   setupGraph();
   $('.tabheading > li:first').click();
   return;
});



