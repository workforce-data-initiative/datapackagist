var _ = require('underscore');
var chai = require('chai');
var expect = chai.expect;
var fileManager = require('../datapackagist/src/scripts/components/tabularfilemanager');
var sinon = require('sinon');
var uploadResourceFile = require('../datapackagist/src/scripts/components/backend/upload-resource-file');


describe('Resource upload', function() {
  var loadFileSpy = sinon.spy(fileManager.prototype, 'loadFile');
  var request;


  beforeEach(function() {
    request = {methods: {get: true}, path: '/', query: {}};
  });

  it('accepts file passed in POST request', function(done) {
    var testUpload = '/tmp/test.csv';


    uploadResourceFile(_.extend(request, {
      file: {path: testUpload},
      methods: {post: true}
    }), {});

    chai.assert(loadFileSpy.calledWith(testUpload), 'tabularfilemanager was not passed with uploaded temporary file path');
    done();
  });

  it('accepts file passed as an URL in quesy string', function(done) {
    var testUpload = 'https://som.csv.com/url-string';


    uploadResourceFile(_.extend(request, {params: [testUpload]}), {});
    chai.assert(loadFileSpy.calledWith(testUpload), 'tabularfilemanager was not passed with URL');
    done();
  });

  it('respects noSchemaInfer param', function(done) {
    var testUpload = 'https://som.csv.com/url-string';


    uploadResourceFile(_.extend(request, {
      params: [testUpload],
      query: {'no-schema-infer': '1'}
    }), {});

    chai.assert(
      loadFileSpy.calledWith(testUpload, {noSchemaInfer: true, noValidation: false}),
      'tabularfilemanager was not called with param passed in query string'
    );

    done();
  });

  it('respects noValidation param', function(done) {
    var testUpload = 'https://som.csv.com/url-string';


    uploadResourceFile(_.extend(request, {
      params: [testUpload],
      query: {'no-validation': '1'}
    }), {});

    chai.assert(
      loadFileSpy.calledWith(testUpload, {noSchemaInfer: false, noValidation: true}),
      'tabularfilemanager was not called with param passed in query string'
    );

    done();
  });

  it('respects both noValidation and noSchemaInfer params', function(done) {
    var testUpload = 'https://som.csv.com/url-string';


    uploadResourceFile(_.extend(request, {
      params: [testUpload],
      query: {'no-validation': '1', 'no-schema-infer': '1'}
    }), {});

    chai.assert(
      loadFileSpy.calledWith(testUpload, {noSchemaInfer: true, noValidation: true}),
      'tabularfilemanager was not called with params passed in query string'
    );

    done();
  });

  it('doesn\'t pass any extra GEt params to the tabularfilemanager', function(done) {
    var testUpload = 'https://som.csv.com/url-string';


    uploadResourceFile(_.extend(request, {
      params: [testUpload],
      query: {'no-validation': '1', 'maxSize': '756'}
    }), {});

    chai.assert(
      loadFileSpy.calledWith(testUpload, {noSchemaInfer: false, noValidation: true}),
      'tabularfilemanager was not called with params passed in query string'
    );

    done();
  });
});