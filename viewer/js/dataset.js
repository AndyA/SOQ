function DataSeries(name, data) {
  this.ar = {};
  this.name = name;
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
      if (sel === null) {
        for (i in d) {
          cb(d[i]);
        }
      } else {
        for (i in d) {
          cb(d[i][sel]);
        }
      }
    }
    else {
      if (sel === null) {
        for (i in d) {
          var dp = d[i];
          cb({
            min: dp,
            max: dp,
            avg: dp
          });
        }
      } else {
        for (i in d) {
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
    if ((sel === null && this.isComplex()) || (sel !== null && !this.isComplex())) {
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
    for (nn in this.data) {
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
    for (i in nn) {
      this.get(nn[i]).eachSeries(cb, path);
    }
  }
}
