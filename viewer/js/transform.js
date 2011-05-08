// NonLinearTransform
function NonLinearTransform(xf) {
  this.xf = xf;
  this.init();
}

NonLinearTransform.prototype = {
  init: function() {
    this.min = this.xf(0);
    this.max = this.xf(1);
  },
  trans: function(x) {
    return (this.xf(x) - this.min) / (this.max - this.min);
  },
  inv: function(x, eps) {
    eps = eps || 0.0001;
    var guess = x;
    var damping = 1;
    for (var i = 0; i < 200; i++) {
      var err = x - this.trans(guess);
      if (Math.abs(err) < eps) {
        return guess;
      }
      guess += err / damping;
      damping *= 1.1;
    }
    return guess;
  }
}

function InverseTransform(t) {
  this.t = t;
}

InverseTransform.prototype = {
  trans: function(x) {
    return this.t.inv(x);
  },
  inv: function(x) {
    return this.t.trans(x);
  }
}

// Curve
function TransformCurve(y) {
  this.init(y);
}

TransformCurve.prototype = {
  init: function(y) {
    this.points = [{
      x: 0,
      y: y
    }];
  },
  getPos: function() {
    return this.points[this.points.length - 1];
  },
  addPoint: function(x, y) {
    this.points.push({
      x: x,
      y: y
    });
  },
  getCurvePoint: function(t) {
    var m = 1 - t;
    var m2 = m * m;
    var t2 = t * t;
    var t3 = t2 * t;

    // Cubic Bezier with hard-wired control points
    var px = 1.5 * (m2 * t + m * t2) + t3;
    var py = 3 * m * t2 + t3;

    return {
      x: px,
      y: py
    };
  },
  addSegment: function(x, y) {
    var pt = this.getPos();
    if (Math.abs(y - pt.y) < 0.0001) {
      this.addPoint(x, y);
      return;
    }
    var w = x - pt.x;
    var h = y - pt.y;
    var step = 1 / 16;
    for (var t = step; t <= 1; t += step) {
      // This actually returns the same values each time - we only
      // have one curve shape. Only the scaling changes.
      var np = this.getCurvePoint(t);
      this.addPoint(np.x * w + pt.x, np.y * h + pt.y);
    }
  },
  close: function() {
    var pt = this.getPos();
    if (pt.x < 1) {
      this.addSegment(1, pt.y);
    }
  },
  drawCurve: function(ctx, x, y, w, h) {
    var count = this.points.length;
    for (var i = 0; i < count; i++) {
      var xx = this.points[i].x * w + x;
      var yy = this.points[i].y * h + y;
      if (i == 0) {
        ctx.moveTo(xx, yy);
      }
      else {
        ctx.lineTo(xx, yy);
      }
    }
  },
  drawSegments: function(ctx, x, y, w, h) {
    var count = this.points.length;
    for (var i = 0; i < count; i++) {
      var xx = this.points[i].x * w + x;
      var yy = this.points[i].y * h + y;
      ctx.moveTo(xx, 0);
      ctx.lineTo(xx, yy);
    }
  },
  getTransform: function() {
    var points = this.points;
    var count = points.length;
    return function(x) {
      var pt = 1;
      var area = 0;
      while (pt < count && x > points[pt].x) {
        area += 0.5 * (points[pt - 1].y + points[pt].y) * (points[pt].x - points[pt - 1].x);
        pt++;
      }
      if (pt < count) {
        var fr = (x - points[pt - 1].x) / (points[pt].x - points[pt - 1].x);
        var yy = points[pt - 1].y + (points[pt].y - points[pt - 1].y) * fr;
        area += 0.5 * (points[pt - 1].y + yy) * (x - points[pt - 1].x);
      }
      return area;
    };
  }
}


