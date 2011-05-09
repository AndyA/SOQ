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
    getLayout: function() {
      var data = this.data('graph');
      if (!data.layout) {
        var cav = this.get(0);
        var ctx = cav.getContext('2d');
        var nf = new NumberFormatter();
        var tc = new Timecode();
        var lh = new LayoutHelper(ctx);
        var gb = this.graph('getBounds');
        var ny = this.graph('niceCeiling', gb.h);
        var inset = 10;

        // Top edge
        var insetTop = 10;

        // Bottom edge
        var insetBottom = 10;

        var paperHeight = cav.height - insetTop - insetBottom;

        // Left edge
        var nyTicks = this.graph('niceCeiling', paperHeight / 40);
        var yText = [];
        for (var i = 0; i <= nyTicks; i++) {
          var v = i * ny / nyTicks;
          yText.push(nf.format(v));
        }

        var insetLeft = lh.textBoundingMetrics(yText).width + 12;

        // Right edge
        var insetRight = 10;
        var paperWidth = cav.width - insetLeft - insetRight;

        data.layout = {
          paper: {
            x: insetLeft,
            y: insetTop,
            w: cav.width - insetLeft - insetRight,
            h: paperHeight
          },
          data: {
            x: gb.w,
            y: ny
          },
          render: function() {
            var i, x, y;
            ctx.fillStyle = new Colour(240, 240, 240).css();
            ctx.strokeStyle = new Colour(200, 200, 200).css();
            ctx.fillRect(this.paper.x, this.paper.y, this.paper.w, this.paper.h);
            for (i = 0; i <= nyTicks; i++) {
              x = this.paper.x;
              y = this.paper.y + this.paper.h - i * paperHeight / nyTicks;
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x + paperWidth, y);
              ctx.stroke();
            }
            return function() {
              ctx.strokeStyle = new Colour(0, 0, 0).css();
              ctx.beginPath();
              ctx.moveTo(this.paper.x, this.paper.y);
              ctx.lineTo(this.paper.x, this.paper.y + this.paper.h);
              ctx.lineTo(this.paper.x + this.paper.w, this.paper.y + this.paper.h);
              ctx.stroke();
              // Left edge
              ctx.textBaseline = 'alphabetic';
              ctx.fillRect = new Colour(0, 0, 0).css();
              for (i = 0; i <= nyTicks; i++) {
                x = this.paper.x;
                y = this.paper.y + this.paper.h - i * paperHeight / nyTicks;
                ctx.beginPath();
                ctx.moveTo(x - 4, y);
                ctx.lineTo(x, y);
                ctx.stroke();
                ctx.fillText(yText[i], 4, y);
              }
            }
          }
        };
      }
      return data.layout;
    },
    getTransform: function() {
      var layout = this.graph('getLayout');
      var xf = [
      layout.paper.w / layout.data.x, 0, 0, -layout.paper.h / layout.data.y,
      // -- this to force line break :) -- 
      layout.paper.x, layout.paper.h + layout.paper.y];
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
    withGraphArea: function(cb) {
      var cav = this.get(0);
      var ctx = cav.getContext('2d');
      ctx.save();
      var layout = this.graph('getLayout');

      // Make lines with integer coordinates line up on pixel boundaries.
      ctx.translate(0.5, 0.5);

      ctx.save();
      var after = layout.render.apply(layout);
      ctx.restore();

      ctx.save();
      cb.apply(this, [cav, ctx, layout]);
      ctx.restore();

      ctx.save();
      after.apply(layout);
      ctx.restore();

      ctx.restore();
    },
    render: function() {
      var data = this.data('graph');
      var $this = this;
      this.graph('withGraphArea', function(cav, ctx, layout) {
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
