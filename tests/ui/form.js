var assert = require('chai').assert;
var fs = require('fs');
var jtsInfer = require('json-table-schema').infer;
var path = require('path');
var dataDir = path.join('.', 'tests', 'data');


module.exports = function(browser) {
  describe('Ensure essential form interactions', function() {
    var datapackage = JSON.parse(fs.readFileSync(path.join(dataDir, 'datapackage.json')).toString());
    var registryListSelector = '#registry-list [data-id=list-container] option';


    before(function(done) {
      browser.visit('/', done);
    });

    it('is alive', function(done) {
      browser.assert.success();
      done();
    });

    it('has a registry list', function(done) {
      browser.assert.elements(registryListSelector, {atLeast: 2});
      done();
    });

    it('has an upload button', function(done) {
      // tests that the upload button for datapackage.json files exists
      browser.assert.element('#upload-data-package');
      done();
    });

    it('has a download button which is disabled at startup', function(done) {
      // tests that the download button for datapackage.json files exists
      browser.assert.element('#download-data-package[download].disabled');
      done();
    });

    it('constructs the form from the base profile by default', function(done) {
      // tests that the form is built to create a base profile datapackage.json
      browser.wait({duration: '5s', element: registryListSelector}).then(function() {
        browser.assert.element('#registry-list [data-id=list-container] option[value=base]:selected');
        assert.equal(browser.window.APP.layout.descriptorEdit.layout.form.schema.title, 'DataPackage');
        done();
      });
    });

    it('loads other profiles by route', function(done) {
      // tests that if the correct route is given, then a form is built to create a tabular profile datapackage.json
      browser.visit('/tabular', function() {
        browser.assert.element('#registry-list [data-id=list-container] option[value=tabular]:selected');
        done();
      });
    });

    it('populates on valid descriptor upload', function(done) {
      var uploadDatapackage = browser.window.APP.layout.uploadDatapackage;


      uploadDatapackage.events.click.call(uploadDatapackage);
      browser.window.APP.layout.uploadDialog.callbacks.data('datapackage.json', JSON.stringify(datapackage));
      assert.equal(browser.window.$('input[name="root[name]"]').val(), datapackage.name);
      assert.equal(browser.window.$('input[name="root[title]"]').val(), datapackage.title);
      done();
    });

    it('errors on invalid descriptor upload', function(done) {
      var uploadDatapackage = browser.window.APP.layout.uploadDatapackage;


      uploadDatapackage.events.click.call(uploadDatapackage);
      browser.window.APP.layout.uploadDialog.callbacks.data('datapackage.json', '{"name": "A"}');

      browser.wait({duration: '3s', element: '[data-schemapath="root.name"] .form-group.has-error'}).then(function() {
        browser.assert.element('[data-schemapath="root.name"] .form-group.has-error');
        done();
      });
    });

    it('allows download of valid base profile', function(done) {
      // try to download valid base profile
      browser.visit('/', function() {
        browser.fill('[name="root[name]"]', 'name');

        browser.wait({duration: '5s', element: '#download-data-package:not(.disabled)'}).then(function() {
          assert(!browser.window.$('#download-data-package').hasClass('disabled'), 'Download button not enabled');
          done();
        });
      });
    });

    it('does not allow download of an invalid base profile', function(done) {
      // try to download invalid base profile
      browser.visit('/', function() {
        browser.fill('[name="root[name]"]', 'Invalid name');

        // Download button is disabled by default, and it should be disabled
        // after validation request done
        assert(browser.window.$('#download-data-package').hasClass('disabled'), 'Download button not disabled');
        done();
      });
    });

    it('allows download of valid tabular profile', function(done) {
      // try to download valid tabular profile
      browser.visit('/tabular', function() {
        browser.fill('[name="root[name]"]', 'name');

        // Don't know how to simulate file upload
        browser.window.APP.layout.descriptorEdit.layout.form.getEditor('root.resources').rows[0].setValue({
          name: 'test',
          path: 'test.csv',
          schema: jtsInfer(['name', 'age'], [['John', '33']])
        }, true);

        browser.wait({duration: '5s', element: '#download-data-package:not(.disabled)'}).then(function() {
          assert(!browser.window.$('#download-data-package').hasClass('disabled'), 'Download button not enabled');
          done();
        });
      });
    });

    it('does not allow download of an invalid tabular profile', function(done) {
      // try to download invalid tabular profile
      // try to download invalid base profile
      browser.visit('/tabular', function() {
        browser.fill('[name="root[name]"]', 'Invalid name');
        assert(browser.window.$('#download-data-package').hasClass('disabled'), 'Download button not disabled');
        done();
      });
    });
  });  
}
