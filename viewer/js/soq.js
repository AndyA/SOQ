$(function() {
  var $graph = $('#graph');
  $graph.graph();

  var url = new URLParser(window.location.href, {});

  function showSet(type) {
    console.log("displaying " + type);
    $graph.graph('init');
    $graph.graph('addSeries', ds.get('media/cycling/q200.csv').get(type));
    //      $graph.graph('addSeries', ds.get('media/cycling/q800.csv').get(type));
    $graph.graph('addSeries', ds.get('media/cycling/q1600.csv').get(type));
    $graph.graph('showSeries', 0, 0.3);
    $graph.graph('render');
    url.part('frag', type);
    window.location.href = url.toString();
  }

  if ('source' in url.args) {
    var source = url.makeAbsolute(url.args.source);
    console.log("source=" + source);
    var ds = new DataSet('root');
    var type = url.part('frag') || 'psnr';
    ds.load(source, function() {
      console.log("data loaded");
      showSet(type);
      $('input[name=type][value=' + type + ']:radio').attr('checked', true);
      $('input[name=type]:radio').click(function(e) {
        showSet(this.value);
      });
    });
  }
});
