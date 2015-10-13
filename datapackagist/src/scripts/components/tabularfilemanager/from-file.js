var _ = require('lodash');
var fromString = require('./from-string');
var fs = require('fs');
var Promise = require('bluebird');

module.exports = function(filepath, options) {
  return (new Promise((function(resolve, reject) {
    this.emit('upload-started');

    fs.readFile(filepath, function(error, data) {
      if(error) {
        reject(error);
        return false;
      }

      resolve(data.toString());
    });
  }).bind(this))).then(function(string) {
    return fromString(
      string,
      _.extend(options, {noEvents: true})
    );
  });
};