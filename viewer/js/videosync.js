// Synchronize multiple video players.
//
function VideoSync() {
  this.init(arguments);
}

VideoSync.prototype = {
  init: function(args) {
    this.v = [];
    this.add.apply(this, args);
  },
  add: function() {
    this.v.push(arguments);
  },
  get currentTime() {
    //
  },
  set currentTime(t) {
    //
  }
}
