$(function() {
  var $graph = $('#graph');
  $graph.graph();

  var url = new URLParser(window.location.href, {
    type: 'ssim'
  });
  if ('source' in url.args) {
    var source = url.makeAbsolute(url.args.source);
    console.log("source=" + source);
    var ds = new DataSet('root');
    var type = url.args.type;
    ds.load(source, function() {
      console.log("data loaded");
      $graph.graph('addSeries', ds.get('media/cycling/q200.csv').get(type));
      $graph.graph('addSeries', ds.get('media/cycling/q1600.csv').get(type));
      $graph.graph('showSeries', 1, 0.3);
      $graph.graph('render');
    });
  }
});
