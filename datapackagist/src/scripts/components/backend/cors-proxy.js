var _ = require('underscore');
var superagent = require('superagent-bluebird-promise');
var validator = require('validator');


module.exports = function(request, response) {
  var url = request.params[0];


  if(!validator.isURL(url)) {
    response.send('URL you passed is invalid');
    return false;
  }

  superagent.get(request.params[0] + (
    !_.isEmpty(request.query)
    ? ('?' + _.chain(request.query).pairs().map(function(P) { return P.join('=') }).value().join('&'))
    : ''
  )).then(function(data) {
    var contentType = data.header['content-type'];


    response
      .set(_.extend({
        'access-control-allow-origin': '*'
      }, contentType && {
        'content-type': contentType
      }))

      .send(data.text);
  });
}
