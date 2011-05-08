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
  clip: function() {
    var lim = [255, 255, 255, 1.0];
    return this.adjusted(function(i, v) {
      var vv = Math.max(0, Math.min(lim[i], v));
      return i < 3 ? Math.floor(vv) : vv;
    });
  },
  adjust: function(f, s, c) {
    if (! (f instanceof Array)) f = [f, f, f, f];
    if (! (s instanceof Array)) s = [s, s, s, s];
    var pick = function(i) {
      if (c === undefined) return i < 3
      return i == c;
    }
    return this.adjusted(function(i, v) {
      return pick(i) ? v * f[i] + s[i] : v;
    });
  },
  alpha: function(dv) {
    return this.adjust(dv, 0, 3);
  },
  brightness: function(n, c) {
    return this.adjust(1, n, c);
  },
  contrast: function(r, c) {
    return this.adjust(r, 0, c);
  },
  lighter: function(n, c) {
    if (n === undefined) n = 16;
    return this.brightness(n, c);
  },
  darker: function(n, c) {
    if (n === undefined) n = 16;
    return this.brightness(-n, c);
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
  mix: function(other, r, c) {
    return this.adjusted(function(i, v) {
      return i < 3 && (c === undefined || c == i) ? v * (1 - r) + other.rgba[i] * r : v;
    });
  },
  saturation: function(r, c) {
    return this.mono().mix(this, r, c);
  },
  css: function() {
    return 'rgba(' + this.clip().rgba.join(', ') + ")";
  }
}
