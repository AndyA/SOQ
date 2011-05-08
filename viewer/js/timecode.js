function Timecode(fps) {
  this.fps = fps;
}

Timecode.prototype = {
  n2: function(x) {
    if (x < 10) return "0" + x;
    return "" + x;
  },
  toTimecode: function(t) {
    var f = Math.floor(t * this.fps) % this.fps;
    var s = Math.floor(t) % 60;
    var m = Math.floor(t / 60) % 60;
    var h = Math.floor(t / 3600) % 3600;
    return this.n2(h) + ":" + this.n2(m) + ":" + this.n2(s) + ":" + this.n2(f);
  },
  toSeconds: function(tc) {
    // TODO no validation!
    var parts = tc.split(':');
    var scale = [this.fps, 60, 60, 24];
    var fr = 0;
    var mult = 1;
    for (var i = parts.length - 1; i >= 0; i--) {
      fr += parseInt(parts[i], 10) * mult;
      mult *= scale.shift();
    }
    return fr / this.fps;
  }
}
