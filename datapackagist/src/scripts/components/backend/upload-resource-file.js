var _ = require('underscore');
var config = require('../../config');
var fileManager = new (require('../tabularfilemanager'))({maxSize: config.maxCSVSize});


module.exports = function(request, response) {
  var params = request.query;


  // Uploaded file path in /tmp/ or URL passed in query string
  fileManager.loadFile(_.result(request.file, 'path') || request.params[0], {
    // Strict validation of passed params
    noSchemaInfer: params['no-schema-infer'] === '1',
    noValidation: params['no-validation'] === '1'
  }).then(function(R) { response.send(R); });
}
