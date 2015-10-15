var $ = require('jquery');
var _ = require('underscore');
var Browser = require('zombie');
var app = require('../datapackagist/app');
var assert = require('chai').assert;
var config = require('../datapackagist/src/scripts/config');
var fromRemoteJSON;
var fs = require('fs');
var path = require('path');
var dataDir = path.join('.', 'tests', 'data');
var nock = require('nock');
var jtsInfer = require('json-table-schema').infer;
var sinon = require('sinon');
var url = require('url');
process.env.NODE_ENV = 'test';
Browser.localhost('127.0.0.1', 3000);

describe('DataPackagist core', function() {
  var browser = new Browser({maxWait: 30000});

  // ensure we have time for request to reoslve, etc.
  this.timeout(25000);

  before(function(done) {
    var corsProxyURL = url.parse(config.corsProxyURL(
      'http://datahub.io/api/action/package_show?id=population-number-by-governorate-age-group-and-gender-2010-2014'
    ));

    var registryListCSV = fs.readFileSync(path.join(dataDir, 'registry-list.json')).toString();

    nock('https://rawgit.com')
      .persist()
      .get('/dataprotocols/registry/master/registry.csv')
      .reply(200, registryListCSV, {'access-control-allow-origin': '*'});

    // Use this csv as resource file in some test cases
    nock(config.corsProxyURL(''))
      .persist()
      .get('/https://rawgit.com/dataprotocols/registry/master/registry.csv')
      .reply(200, registryListCSV, {'access-control-allow-origin': '*'});

    nock('https://rawgit.com')
      .persist()
      .get('/dataprotocols/schemas/master/data-package.json')

      .reply(
        200,
        JSON.parse(fs.readFileSync(path.join(dataDir, 'datapackage-profile.json')).toString()),
        {'access-control-allow-origin': '*'}
      );

    nock('https://rawgit.com')
      .persist()
      .get('/dataprotocols/schemas/master/tabular-data-package.json')

      .reply(
        200,
        fs.readFileSync(path.join(dataDir, 'tabular-profile.json')).toString(),
        {'access-control-allow-origin': '*'}
      );

    nock([corsProxyURL.protocol, corsProxyURL.hostname].join('//'))
      .persist()
      .get(corsProxyURL.path)

      .reply(
        200,
        fs.readFileSync(path.join(dataDir, 'from-remote.json')).toString(),
        {'access-control-allow-origin': '*'}
      );

    // run the server
    app.listen(3000, function() { done(); });
  });

  require('./form')(browser);
  require('./resource-file')(browser);
  require('./from-remote')(browser);
});
