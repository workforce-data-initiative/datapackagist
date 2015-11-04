var config = require('../../config');
require('fileapi');
var _ = require('underscore');
var backbone = require('backbone');
var backboneBase = require('backbone-base');
var validator = require('datapackage-validate');
var request = require('superagent-bluebird-promise');
var Promise = require('bluebird');


// Upload datapackage
module.exports = backbone.BaseView.extend({

  // Update edit form and download URL
  updateApp: function(descriptor) {
    var descriptorEdit = window.APP.layout.descriptorEdit;

    descriptorEdit.layout.form.setValue(
        _.defaults(descriptor, descriptorEdit.layout.form.getValue())
    );
    return this;
  },

  processJSONData: function(data) {
    var descriptor;
    var descriptorEdit;

    try {
      descriptor = JSON.parse(data);
    } catch(E) { }
    descriptorEdit = window.APP.layout.descriptorEdit;

    // If descriptor is broken or If descriptor have field not from schema - reject it
    if(
          !_.isObject(descriptor) ||
          _.difference(_.keys(descriptor), _.keys(descriptorEdit.layout.form.schema.properties)).length
    ) {
      window.APP.layout.notificationDialog.setMessage('JSON is invalid').activate();
      return false;
    }

    // If there are no changes in current form just apply uploaded
    // data and leave
    if(!descriptorEdit.hasChanges()) {
      this.updateApp(descriptor);
      return false;
    }

    // Ask to overwrite changes on current form
    window.APP.layout.confirmationDialog
      .setMessage('You have changes. Overwrite?')
      .setCallbacks(
        {
          yes: (function() {
            this.updateApp(descriptor);
            return false;
          }).bind(this)
        }
    ).activate();
  },

  events: {
    'click': function() {
      window.APP.layout.uploadDialog.setMessage(
          'Select data package JSON file from your local drive or enter URL ' +
          'to download from.'
      ).setCallbacks({
            processLocalFile: (
                function(file) {
                  return new Promise((function (resolve, reject) {
                    try {
                      FileAPI.readAsText(
                          file,
                          (function (fileInfo) {
                            if(fileInfo.type === 'load') {
                              this.processJSONData(fileInfo.result);
                              resolve();
                            }
                          }).bind(this)
                      );
                    } catch (e) {
                      console.log(e);
                    }
                  }).bind(this));
                }
            ).bind(this),
            processURL: (
                function(url) {
                  return new Promise((function (resolve, reject) {
                      request.get(config.corsProxyURL(url)).then(
                          (function(res) {
                            this.processJSONData(res.text);
                          resolve();
                        }).bind(this)
                      );
                  }).bind(this));
                }
            ).bind(this)
          }
      ).activate();

      return false;
    }
  }
});