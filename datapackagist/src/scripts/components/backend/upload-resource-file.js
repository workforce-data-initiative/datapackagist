var config = require('../../config');
var fileManager = new (require('../tabularfilemanager'))({maxSize: config.maxCSVSize});


module.exports = function(request, response) {
  fileManager.loadFile(request.file.path).then(function(R) {
    response.send(R);
  });
}
