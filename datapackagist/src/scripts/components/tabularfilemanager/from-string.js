var _ = require('lodash');
var fs = require('fs');
var Promise = require('bluebird');

module.exports = function(string, options) {
  var data;
  var encoding = options.encoding || 'utf8';
  var size = options.maxSize || Buffer.byteLength(string, encoding);

  // This method is reused by couple of others, which emit starting event too
  if(!options.noEvents)
    this.emit('upload-started');

  return new Promise(function(resolve, reject) { resolve({
    data: _.initial(
      (new Buffer(string, encoding))
        .slice(0, size)
        .toString()
        .split('\n')
    ).join('\n'),

    size: size
  }); });
}
