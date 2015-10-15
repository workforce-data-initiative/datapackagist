var assert = require('chai').assert;
var fs = require('fs');
var jtsInfer = require('json-table-schema').infer;
var nock = require('nock');
var path = require('path');
var dataDir = path.join('.', 'tests', 'data');


module.exports = function(browser) {
  describe('Ensure essential resource file interactions', function() {
    before(function(done) {
      browser.visit('/', done);
    });

    it('has a button to upload a resource file', function(done) {
      // ensure that the button to upload a resource file exists
      browser.assert.element('[data-id=upload-data-file]');
      done();
    });

    it('populates a resource in the resources array when uploading a valid resource', function(done) {
      // ensure that a valid resource file upload results in a new resource object
      browser.visit('/', function() {
        // Don't know how to simulate file upload
        browser.window.APP.layout.descriptorEdit.layout.form.getEditor('root.resources').rows[0].setValue({
          name: 'test',
          path: 'test.csv',
          schema: jtsInfer(['name', 'age'], [['John', '33']])
        }, true);

        assert.equal(browser.window.$('[name="root[resources][0][name]"]').val(), 'test');
        assert.equal(browser.window.$('[name="root[resources][0][path]"]').val(), 'test.csv');
        done();
      });
    });

    it('errors when uploading an invalid resource', function(done) {
      // ensure that when a user attempts to upload an invalid resource, that she is shown an error
      browser.visit('/', function() {
        // Use this for file upload https://github.com/assaf/zombie/blob/master/src/index.js#L875
        browser.wait({duration: '10s', element: '[name="root[resources][0][name]"]'}).then(function() {
          var editor = browser.window.APP.layout.descriptorEdit.layout.form.getEditor('root.resources');
          var schema = jtsInfer(['name', 'age'], [['John', '33', '123asd']]);


          editor.rows[0].setValue({
            name: 'test',
            path: 'test.csv',
            schema: schema
          }, true);

          editor.rows[0].dataSource = {schema: schema, data: 'name,age\nJohn,33,123asd'};
          browser.window.APP.layout.descriptorEdit.layout.form.validateResources();

          browser.wait({duration: '10s'}).then(function() {
            browser.assert.element('[data-schemapath="root.resources.0.schema"] > div > p');
            done();
          });
        });
      });
    });

    it('validates a valid resource on user action', function(done) {
      // ensure that when a user validates one or many valid resources,
      // the resource validation view is shown with a success result
      browser.visit('/', function() {
        var editor = browser.window.APP.layout.descriptorEdit.layout.form.getEditor('root.resources');


        nock('http://goodtables.okfnlabs.org').post('/api/run').reply(
          200,
          fs.readFileSync(path.join(dataDir, 'goodtables-valid-reply.json')),
          {'access-control-allow-origin': '*'}
        );

        editor.rows[0].setValue({
          name: 'test',
          url: 'https://rawgit.com/dataprotocols/registry/master/registry.csv'
        }, true);

        browser.click('#validate-resources');

        browser.wait({duration: '5s', element: '#validation-result:not([hidden])'}).then(function() {
          browser.assert.element('#ok-message:not([hidden])');
          done();
        });
      });
    });

    it('validates an invalid resource on user action', function(done) {
      // ensure that when a user validates one or many invalid resources,
      // the resource validation view is shown with error results
      browser.visit('/', function() {
        var editor = browser.window.APP.layout.descriptorEdit.layout.form.getEditor('root.resources');


        nock('http://goodtables.okfnlabs.org').post('/api/run').reply(
          200,
          fs.readFileSync(path.join(dataDir, 'goodtables-invalid-reply.json')),
          {'access-control-allow-origin': '*'}
        );

        editor.rows[0].setValue({
          name: 'test',
          url: 'https://rawgit.com/dataprotocols/registry/master/registry.csv'
        }, true);

        browser.click('#validate-resources');

        browser.wait({duration: '5s', element: '#validation-result:not([hidden])'}).then(function() {
          assert(browser.window.$('#ok-message').prop('hidden'), 'OK message shown for invalid data');
          browser.assert.elements('#validation-result [data-id=errors-list] .result', 1);
          done();
        });
      });
    });

    it('shows modal error message when uploading malformed but not broken json', function(done) {
      browser.visit('/', function() {
        var uploadDatapackage = browser.window.APP.layout.uploadDatapackage;


        uploadDatapackage.events.click.call(uploadDatapackage);

        browser.window.APP.layout.uploadDialog.callbacks.data(
          'datapackage.json',
          '[{"description": "validation of date-time strings","schema": {"format": "date-time"},"tests": [{"description": "a valid date-time string","data": "1963-06-19T08:30:06.283185Z","valid": true}]}]'
        );

        browser.wait({duration: '5s', element: '#notification-dialog:not([hidden])'}).then(function() {
          assert(!browser.window.$('#notification-dialog').prop('hidden'));
          done();
        });
      });
    });
  });
}