var _ = require('underscore');


module.exports = {
  corsProxyURL: function(url) { return module.exports.host + '/cors-proxy/' + url; },
  host: 'http://datapackagist.herokuapp.com',

  // How many bytes of CSV to process when parsing it into object and infering schema
  maxCSVSize: 1024*3
};
