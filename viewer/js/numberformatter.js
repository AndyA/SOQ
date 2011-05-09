function NumberFormatter() {
  //
}

NumberFormatter.prototype = {
  format: function(n) {
    return "" + n.toPrecision(4);
  }
}
