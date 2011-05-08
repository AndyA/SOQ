function Colour() {
  this.rgba = [0, 0, 0, 1];
  this.set.apply(this, arguments);
}

Colour.prototype = {
  set: function() {
    if (arguments.length) {
      if (arguments[0] instanceof Array) {
        return this.set.apply(this, arguments[0]);
      }
      for (var i = 0; i < arguments.length && i < 4; i++) {
        this.rgba[i] = arguments[i];
      }
    }
  },
  adjusted: function(cb) {
    var rgba = [];
    for (var i in this.rgba) {
      rgba[i] = cb(i, this.rgba[i]);
    }
    return new Colour(rgba);
  },
  alpha: function(dv) {
    return this.adjusted(function(i, v) {
      return i == 3 ? v * dv : v;
    });
  },
  clip: function() {
    var lim = [255, 255, 255, 1.0];
    return this.adjusted(function(i, v) {
      var vv = Math.max(0, Math.min(lim[i], v));
      return i < 3 ? Math.floor(vv) : vv;
    });
  },
  adjust: function(n) {
    return this.adjusted(function(i, v) {
      return i < 3 ? v + n : v;
    });
  },
  lighter: function(n) {
    if (n === undefined) n = 16;
    return this.adjust(n);
  },
  darker: function(n) {
    if (n === undefined) n = 16;
    return this.adjust(-n);
  },
  mono: function(w) {
    // http://en.wikipedia.org/wiki/Luminance_(relative)
    if (w === undefined) w = [0.2126, 0.7152, 0.0722];
    var y = 0;
    for (var i = 0; i < 3; i++) {
      y += this.rgba[i] * w[i];
    }
    return this.adjusted(function(i, v) {
      return i < 3 ? y : v;
    });
  },
  mix: function(c, r) {
    return this.adjusted(function(i, v) {
      return v * (1 - r) + c.rgba[i] * r;
    });
  },
  saturate: function(r) {
    return this.mono().mix(this, r);
  },
  css: function() {
    return 'rgba(' + this.clip().rgba.join(', ') + ")";
  }
}
