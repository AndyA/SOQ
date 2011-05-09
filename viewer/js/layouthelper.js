function LayoutHelper(ctx) {
  this.ctx = ctx;
}

LayoutHelper.prototype = {
  textBoundingMetrics: function(ar) {
    var width = 0;
    for (var i in ar) {
      var tm = this.ctx.measureText(ar[i]);
      // The TextMetrics interface only includes width - 
      // and that's all WebKit implements.
      width = Math.max(width, tm.width);
    }
    return {
      width: width
    };
  }
}
