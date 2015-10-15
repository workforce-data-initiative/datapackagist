var _ = require('underscore');
var config = require('../../config');
var fileManager = new (require('../tabularfilemanager'))({maxSize: config.maxCSVSize});


module.exports = function(request, response) {
	// Uploaded file path in /tmp/ or URL passed in query string
  fileManager.loadFile(_.result(request.file, 'path') || request.params[0])
    .then(function(R) { response.send(R); });
}
