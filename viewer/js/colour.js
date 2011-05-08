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
  channel: function(n, vv) {
    return this.adjusted(function(i, v) {
      return i == n ? vv : v;
    });
  },
  alpha: function(v) {
    return this.channel(3, v);
  },
  clip: function() {
    var lim = [255, 255, 255, 1.0];
    return this.adjusted(function(i, v) {
      return Math.max(0, Math.min(lim[i], v));
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
  css: function() {
    return 'rgba(' + this.clip().rgba.join(', ') + ")";
  }
}
