$(function() {
  var $graph = $('#graph');
  $graph.graph();

  var url = new URLParser(window.location.href);
  if ('source' in url.args) {
    var source = url.makeAbsolute(url.args.source);
    console.log("source=" + source);
    var ds = new DataSet('root');
    ds.load(source, function() {
      console.log("data loaded");
      $graph.graph('addSeries', ds.get('media/cycling/q200.csv').get('ssim'));
      $graph.graph('addSeries', ds.get('media/cycling/q1600.csv').get('ssim'));
      $graph.graph('render');
    });
  }
});
