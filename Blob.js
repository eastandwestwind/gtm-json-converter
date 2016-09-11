function fetchBlob(uri, callback) {
  var xhr = new XMLHttpRequest();
  
  xhr.open('GET', uri, true);
  xhr.setRequestHeader("X-Mashape-Key", config.mashapeKey);
  xhr.responseType = 'arraybuffer';

  xhr.onload = function(e) {
    if (this.status == 200) {
      var blob = this.response;
      if (callback) {
        callback(blob);
      }
    }
  };

  xhr.send();
};