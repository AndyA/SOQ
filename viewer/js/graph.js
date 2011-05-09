(function($) {
  var methods = {
    init: function(options) {
      var data = {
        settings: {},
        ds: [],
        meta: []
      };

      if (options) {
        $.extend(data.settings, options);
      }

      this.data('graph', data);
      return this;
    },
    addSeries: function(ds) {
      var data = this.data('graph');
      data.ds.push(ds);
      data.meta.push({
        show: 1.0
      });
      return this;
    },
    showSeries: function(n, show) {
      var data = this.data('graph');
      if (show === undefined) show = 1.0;
      data.meta[n].show = show;
      return this;
    },
    colourForPath: function(path) {
      switch (path[path.length - 1]) {
      case 'R':
        return new Colour(255, 0, 0);
      case 'G':
        return new Colour(0, 200, 0);
      case 'B':
        return new Colour(0, 0, 255);
      default:
        return new Colour(0, 0, 0);
      }
    },
    getBounds: function() {
      var data = this.data('graph');
      var w, h;
      for (var i in data.ds) {
        var sb = data.ds[i].getBounds();
        if (i == 0) {
          w = sb.len;
          h = sb.max;
        }
        else {
          w = Math.max(w, sb.len);
          h = Math.max(h, sb.max);
        }
      }
      return {
        w: w,
        h: h
      };
    },
    getAxisScales: function() {
      var b = this.graph('getBounds');
      var y = this.graph('niceCeiling', b.h);
      return {
        x: b.w,
        y: y
      };
    },
    getGraphArea: function() {
      var cav = this.get(0);
      var inset = 10;
      return {
        x: inset,
        y: inset,
        w: cav.width - inset * 2,
        h: cav.height - inset * 2
      };
    },
    niceCeiling: function(n) {
      var seq = [2, 2.5, 2];
      var sp = 0;
      var nn = 0.001;
      while (nn < n) {
        nn *= seq[sp++];
        if (sp == seq.length) sp = 0;
      }
      return nn;
    },
    getTransform: function() {
      var ga = this.graph('getGraphArea');
      var ax = this.graph('getAxisScales');
      var xf = [ga.w / ax.x, 0, 0, -ga.h / ax.y, ga.x, ga.h + ga.y];
      return xf;
    },
    lineMaker: function(ctx, scale) {
      var xf = this.graph('getTransform');
      var first = true;
      return function(x, y) {
        var xx = scale * x * xf[0] + y * xf[2] + xf[4];
        var yy = scale * x * xf[1] + y * xf[3] + xf[5];
        if (first) {
          ctx.moveTo(xx, yy);
          first = false;
        }
        else {
          ctx.lineTo(xx, yy);
        }
      }
    },
    renderPaper: function(cav, ctx, ga) {
      ctx.fillStyle = new Colour(240, 240, 240).css();
      ctx.fillRect(ga.x, ga.y, ga.w, ga.h);
      // Deferred portion: draw after the graph data layer
      return function() {
        ctx.strokeStyle = new Colour(0, 0, 0).css();
        ctx.beginPath();
        ctx.moveTo(ga.x, ga.y);
        ctx.lineTo(ga.x, ga.y + ga.h);
        ctx.lineTo(ga.x + ga.w, ga.y + ga.h);
        ctx.stroke();
      }
    },
    withGraphArea: function(cb) {
      var cav = this.get(0);
      var ctx = cav.getContext('2d');
      var ga = this.graph('getGraphArea');

      ctx.save();

      // Make lines with integer coordinates line up on pixel boundaries.
      ctx.translate(0.5, 0.5);
      var after = this.graph('renderPaper', cav, ctx, ga);
      cb.apply(this, [cav, ctx, ga]);
      after.apply(this);

      ctx.restore();
    },
    render: function() {
      var data = this.data('graph');
      var $this = this;
      this.graph('withGraphArea', function(cav, ctx, ga) {
        for (var i in data.ds) {
          var meta = data.meta[i];
          if (meta.show == 0) continue;
          data.ds[i].eachSeries(function(path, series) {
            var pcol = $this.graph('colourForPath', path).alpha(meta.show);
            var scaled = series.scaledInstance(cav.width / 4);
            var pts = scaled.getPoints();
            var sc = scaled.getScale();
            if (scaled.isComplex()) {
              ctx.beginPath();
              var lm = $this.graph('lineMaker', ctx, sc);
              for (var j in pts) {
                lm(j, pts[j]['max']);
              }
              for (var j in pts) {
                var jj = pts.length - 1 - j;
                lm(jj, pts[jj]['min']);
              }
              ctx.closePath();
              var pcolf = pcol.alpha(0.2).lighter(30);
              ctx.fillStyle = pcolf.css();
              ctx.strokeStyle = pcolf.css();
              ctx.fill();
            }
            ctx.beginPath();
            var lm = $this.graph('lineMaker', ctx, sc);
            for (var j in pts) {
              lm(j, pts[j]['avg']);
            }
            ctx.strokeStyle = pcol.css();
            ctx.stroke();
          });
        }

      });
      return this;
    }
  };

  $.fn.graph = function(method) {
    if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === 'object' || !method) {
      return methods.init.apply(this, arguments);
    } else {
      $.error('Method ' + method + ' does not exist on jQuery.graph');
    }
  };

})(jQuery);
