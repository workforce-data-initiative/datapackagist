var _ = require('lodash');

// Read data from File object, suitable only for in-browser usage
var fromBlob = require('./from-blob');

// Read file from local fs
var fromFile = require('./from-file');

// Read data from string
var fromString = require('./from-string');

// Read data directly from URL
var fromURL = require('./from-url');

var fs = require('fs');
var validator = require('validator');

module.exports = function(path, callOptions) {
  var displayedPath;
  var isURL;

  // Allow options applied during method call along with object init options
  var options = _.extend(this.options || {}, callOptions);

  var that = this;

  return (new Promise(function(resolve, reject) {
    var method;

    if(_.isString(path) && validator.isURL(path)) {
      method = fromURL;
      isURL = true;
    }

    else if(_.isString(path) && _.isFunction(fs.existsSync) && fs.existsSync(path))
      method = fromFile;

    else if(_.isString(path))
      method = fromString;

    else if(typeof Blob !== 'undefined' && path instanceof Blob) {
      displayedPath = path.name;
      method = fromBlob;
    }

    else {
      reject('Invalid file type');
      return false;
    }

    method.call(that, path, options).then(resolve);
  }))
    .catch(function(error) { console.log(error); })

    .then(function(result) {
      // TODO Filter non-csv data with appropriate error message
      return that.parse({
        content: result.data,
        path: displayedPath || path,
        size: result.size
      }, _.extend(options, {isURL: isURL}));
    });
}