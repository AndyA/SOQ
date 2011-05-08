function DataSeries(name, data, scale) {
  this.ar = {};
  this.name = name;
  this.scale = (scale === undefined) ? 1 : scale;
  if (data) this.data = data;
}

DataSeries.prototype = {
  isSeries: function() {
    return true;
  },
  isComplex: function() {
    return this.data.length && this.data[0] instanceof Object;
  },
  eachPoint: function(cb, sel) {
    var d = this.data;
    if (this.isComplex()) {
      if (sel === undefined) {
        for (var i in d) {
          cb(d[i]);
        }
      } else {
        for (var i in d) {
          cb(d[i][sel]);
        }
      }
    }
    else {
      if (sel === undefined) {
        for (var i in d) {
          var dp = d[i];
          cb({
            min: dp,
            max: dp,
            avg: dp
          });
        }
      } else {
        for (var i in d) {
          cb(d[i]);
        }
      }
    }
  },
  eachSeries: function(cb, prefix) {
    var path = prefix ? prefix.concat([this.name]) : [this.name];
    cb(path, this);
  },
  getPoints: function(sel) {
    if ((sel === undefined && this.isComplex()) || (sel !== undefined && !this.isComplex())) {
      return this.data;
    }
    var key = sel || 'all';
    if (! (key in this.ar)) {
      var ar = [];
      this.eachPoint(function(dp) {
        ar.push(dp);
      },
      sel);
      this.ar[key] = ar;
    }
    return this.ar[key];
  },
  getBounds: function() {
    if (!this.bounds) {
      this.bounds = {
        min: Math.min.apply(Math, this.getPoints('min')),
        max: Math.max.apply(Math, this.getPoints('max')),
        len: this.data.length
      };
    }
    return this.bounds;
  },
  halfScale: function() {
    if (!this.hs) {
      var pts = this.getPoints();
      var npts = [];
      for (var i = 0; i < pts.length; i += 2) {
        var ii = i + 1;
        if (ii < pts.length) {
          npts.push({
            min: Math.min(pts[i].min, pts[ii].min),
            max: Math.max(pts[i].max, pts[ii].max),
            avg: (pts[i].avg + pts[ii].avg) / 2
          });
        } else {
          npts.push(pts[i]);
        }
      }
      this.hs = new DataSeries(this.name, npts, this.scale * 2);
    }
    return this.hs;
  },
  scaledInstance: function(maxPoints) {
    if (this.data.length <= maxPoints) return this;
    return this.halfScale().scaledInstance(maxPoints);
  },
  getScale: function() {
    return this.scale;
  }
}

function DataSet(name, data) {
  this.name = name;
  if (data) this.setData(data);
}

DataSet.prototype = {
  load: function(url, cb) {
    var $this = this;
    $.getJSON(url, function(data) {
      $this.setData(data);
      cb.apply($this);
    });
  },
  setData: function(data) {
    this.data = data;
  },
  isSeries: function() {
    return false;
  },
  names: function() {
    var n = [];
    for (var nn in this.data) {
      if (this.data.hasOwnProperty(nn)) {
        n.push(nn);
      }
    }
    return n.sort();
  },
  get: function(name) {
    var d = this.data[name];
    if (d) {
      return d instanceof Array ? new DataSeries(name, d) : new DataSet(name, d);
    }
    throw "No such element in dataset: " + name;
  },
  eachSeries: function(cb, prefix) {
    var path = prefix ? prefix.concat([this.name]) : [this.name];
    var nn = this.names();
    for (var i in nn) {
      this.get(nn[i]).eachSeries(cb, path);
    }
  },
  getBounds: function() {
    var bounds;
    this.eachSeries(function(path, series) {
      sb = series.getBounds();
      if (bounds) {
        bounds.min = Math.min(bounds.min, sb.min);
        bounds.max = Math.max(bounds.max, sb.max);
        bounds.len = Math.max(bounds.len, sb.len);
      } else {
        bounds = {
          min: sb.min,
          max: sb.max,
          len: sb.len
        };
      }
    });
    return bounds;
  }
}
