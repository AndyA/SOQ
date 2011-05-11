$(function() {

  var url = new URLParser(window.location.href, {});
  var ds = new DataSet('root');

  function withSortedByValue(kv, cb) {
    var ol = [];
    $.each(kv, function(k, v) {
      ol.push(k);
    });
    var ool = ol.sort(function(a, b) {
      if (kv[a] < kv[b]) return -1;
      if (kv[a] > kv[b]) return 1;
      return 0;
    });
    for (var i in ool) {
      cb(ool[i], kv[ool[i]]);
    }
  }

  function optionList(ctl, kv) {
    var ol = [];
    var sel = {};
    $.each(ctl.multiselect('getChecked'), function(k, v) {
      sel[v.value] = true;
    });
    withSortedByValue(kv, function(k, v) {
      var selAttr = k in sel ? 'selected="selected" ' : '';
      ol.push('<option ' + selAttr + 'value="' + k + '">' + v);
    });
    var foo = ol.join('');
    return foo;
  }

  function typeOptions(ctl, ds) {
    var opt = {};
    ds.each(function(n, s) {
      opt[n] = n.toUpperCase();
    });
    return optionList(ctl, opt);
  }

  function dataOptions(ctl, ds) {
    var opt = {};
    var seen = {};
    ds.each(function(n, s) {
      s.each(function(n2, s2) {
        if (! (n2 in seen)) {
          opt[n2] = n2;
          seen[n2] = true;
        }
      });
    });
    return optionList(ctl, opt);
  }

  function buildUI(ds) {

    var $type = $("#type");
    var $primary = $("#primary");
    var $others = $("#others");
    var $graph = $('#graph');

    // Resize canvas
    $graph.get(0).width = $('#content').width();

    $graph.bind('regionselected.graph', function(e, lx, rx) {
      console.log('region: ' + lx + ' => ' + rx);
    });

    function updateGraph() {
      var i;

      $graph.graph('reset');

      var typeSet = $type.multiselect('getChecked');
      var primarySet = $primary.multiselect('getChecked');
      var othersSet = $others.multiselect('getChecked');

      if (typeSet.length && primarySet.length) {
        var type = typeSet[0].value;
        var primary = primarySet[0].value;
        $.each(othersSet, function(k, v) {
          var dsn = v.value;
          if (dsn != primary) {
            var idx = $graph.graph('addSeries', ds.get(type).get(dsn));
            $graph.graph('showSeries', idx, 0.3);
          }
        });

        $graph.graph('addSeries', ds.get(type).get(primary));
        $graph.graph('render');
      }
    }

    $graph.graph();

    $type.multiselect({
      multiple: false,
      header: "Select type",
      selectedList: 1,
      noneSelectedText: "Select..."
    }).bind("multiselectopen", function(event, ui) {
      $type.html(typeOptions($type, ds)).multiselect('refresh');
    }).bind("multiselectclick", function(event, ui) {
      updateGraph();
    });

    $primary.multiselect({
      multiple: false,
      header: "Select primary data",
      selectedList: 1,
      noneSelectedText: "Select..."
    }).bind("multiselectopen", function(event, ui) {
      $primary.html(dataOptions($primary, ds)).multiselect('refresh');
    }).bind("multiselectclick", function(event, ui) {
      updateGraph();
    });

    $others.multiselect({
      header: "Select other data",
      noneSelectedText: "Select..."
    }).bind("multiselectopen", function(event, ui) {
      $others.html(dataOptions($others, ds)).multiselect('refresh');
    }).bind("multiselectclick", function(event, ui) {
      updateGraph();
    });
  }

  buildUI(ds);

  if ('source' in url.args) {
    var source = url.makeAbsolute(url.args.source);
    console.log("source=" + source);
    var type = url.part('frag') || 'psnr';
    ds.load(source, function() {
      console.log("data loaded");
      // TODO enable controls
    });
  }
});
