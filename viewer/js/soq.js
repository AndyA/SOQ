$(function() {
  var $graph = $('#graph');
  $graph.graph();

  var url = new URLParser(window.location.href);
  if ('source' in url.args) {
    var source = url.makeAbsolute(url.args.source);
    console.log("source=" + source);
    var ds = new DataSet(url);
    ds.load(source, function() {
      console.log("data loaded");
      var names = ds.names();
      ds.eachSeries(function(path, series) {
        var name = path.join('.');
        var bounds = series.getBounds();
        console.log(name + ": min=" + bounds.min + ", max=" + bounds.max);
        $graph.graph('addSeries', series);
      });
    });
  }
});
