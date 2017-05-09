require('fileapi');

var backbone = require('backbone');
var config = require('../../config');
var highlight = require('highlight-redux');
var jsonEditor = require('./jsoneditform');
var registry = require('./registry');
var _ = require('underscore');
var $ = require('jquery');
var Promise = require('bluebird');
var CSV = require('./csv-resource');
var request = require('superagent-bluebird-promise');
var getRefsMapping = require('./definitions');
var url = require("url");

// !!!!This import is just for extending json editor with custom editor
// NEVER REMOVE IT!
var resourceEditor = require('./resource-editor');


function getDefinitionUrl(schemaUrl) {
  var urlComponents = url.parse(schemaUrl);
  var tempArray = urlComponents.pathname.split('/');
  tempArray.pop();
  tempArray.push('definitions.json');
  urlComponents.search = '';
  urlComponents.pathname  = tempArray.join('/');
  return url.format(urlComponents);
}


// Upload data file and populate .resource array with item
DataUploadView = backbone.BaseView.extend({

  addResource: function (resourceInfo) {
    var editor;
    editor = window.APP.layout.descriptorEdit.layout.form.getEditor('root.schema');

    editor.add(resourceInfo.info.schema.fields, {schema: resourceInfo.info.schema, data: resourceInfo.data});

    // Make the names readonly — they're automatically populated
    _.each($('[name$="][name]"]'), function(E) {
      $(E).attr('readonly', 'readonly');
    }, this);
  },

  events: {
    'click [data-id=upload-data-file]': function() {
      window.APP.layout.uploadDialog.setMessage(
          'Select resource file (CSV) from your local drive or enter URL ' +
          'to download from.'
      ).setCallbacks({
        processLocalFile: (
          function(file) {
            return new Promise( (function(resolve, reject) {
              CSV.getResourceFromFile(file, {preview: config.maxCSVRows}).then(
                  (function (resourceInfo) {
                    resourceInfo.source = file;
                    this.addResource(resourceInfo);
                    resolve();
                  }).bind(this));
            }).bind(this));
          }
        ).bind(this),
        processURL: (
          function(url) {
            return new Promise( (function(resolve, reject) {
              CSV.getResourceFromUrl(config.corsProxyURL(url), {preview: config.maxCSVRows}).then(
                  (function (resourceInfo) {
                    resourceInfo.source = url;
                    this.addResource(resourceInfo);
                    resolve();
                  }).bind(this));
            }).bind(this));
          }
        ).bind(this)
      }).activate();
    }
  },

  render: function() {
    this.$el
      .append(
        $(window.APP.layout.descriptorEdit.layout.form.theme.getButton('Select data file', '', 'Select data file'))
          .attr('data-id', 'upload-data-file')
      )

      .append('<input data-id="input" type="file" accept="text/csv" style="display: none;">');

    return this;
  },

  setError: function() { return this; },
  setProgress: function() { return this; }
});

module.exports = {
  DescriptorEditView: backbone.BaseView.extend({
    events: {
      // Populate main title and resource title fields
      'keyup [data-schemapath$=".name"] input': function(event) {
        var $input = $(event.currentTarget);
        var $title = $input.closest('[data-schematype=object]').find('[data-schemapath$=".title"] input').eq(0);
        var nameEditor = this.layout.form.getEditor($input.closest('[data-schemapath]').data('schemapath'));

        // Force name value change. Normally it will be changed after focues losed
        // from input field.
        nameEditor.setValue($input.val());
        nameEditor.refreshValue();
        nameEditor.onChange(true);

        // Do not populate user changed field or name with no title in the same row
        if(_.result($title[0], 'edited') || !$title.length)
          return true;

        this.layout.form
          .getEditor($title.closest('[data-schemapath]').data('schemapath'))
          .setValue(CSV.getTitle($input.val()));
      },

      // Do not populate title field with name field data if title was edited
      // by user. Consider it is not edited once user empties it.
      'keyup [data-schemapath$=".title"] input': function(event) {
        var $input = $(event.currentTarget);

        // Ignore tab key pressed
        if(event.keyCode === 9)
          return true;

        event.currentTarget.edited = Boolean($input.val());

        // If user empties the title field then populate it with name field value
        if(!event.currentTarget.edited)
          $input.val($input.closest('[data-schematype=object]').find('[data-schemapath$=".name"] input').val());
      },

      'click #validate-resources': function() {
        var root = this.layout.form.getEditor('root.schema');
        window.APP.layout.validationResultList.validateResources([root]);
      },

      'click #view-code': function() {
          _.each($('.json-code-container'), function(E) {
            if ( $(E).css('visibility') == 'hidden' ) {
              $(E).css('visibility','visible');
              $('#view-code').text('Hide code');
            } else {
              $(E).css('visibility','hidden');
              $('#view-code').text('View code');
            }
          });
      },

      'click #validate-form': function() {
        window.APP.layout.download2.reset(this.layout.form.getCleanValue(),
          this.layout.form.schema).activate();
        window.APP.layout.download.reset(this.layout.form.getCleanValue(),
          this.layout.form.schema).activate();
        this.showResult();
        window.APP.layout.notificationDialog.showValidationErrors();
      }
    },

    initialize: function(options) {
      highlight.configure({useBR: true});

      // Customize theme
      JSONEditor.defaults.iconlibs.fontawesome4 = JSONEditor.defaults.iconlibs.fontawesome4.extend({
        mapping: {
          'collapse': 'minus',
          'expand'  : 'plus',
          'delete'  : 'times',
          'edit'    : 'pencil',
          'add'     : 'plus',
          'cancel'  : 'ban',
          'save'    : 'save',
          'moveup'  : 'arrow-up',
          'movedown': 'arrow-down'
        }
      });

      // Mark required fields
      JSONEditor.defaults.editors = _.mapObject(JSONEditor.defaults.editors, function(E, K) {
        return E.extend({
          updateHeaderText: function() {
            if(this.parent && _.indexOf(this.parent.schema.required, this.key) >= 0)
              $(this.label).html(this.getTitle() + ' <label class="required-field">*</label>');
            else
              JSONEditor.AbstractEditor.prototype.updateHeaderText.apply(this, arguments);
          }
        });
      });

      return backbone.BaseView.prototype.initialize.call(this, options);
    },

    render: function() {
      this.layout.registryList = new registry.ListView({el: window.APP.$('#registry-list'), container: '[data-id=list-container]', parent: this});
      return this;
    },

    hasChanges: function() { return Boolean(this.layout.form.changed); },

    // Populate empty title fields with name field value. Rely on DOM events defined
    // in DescriptorEditView.events
    populateTitlesFromNames: function() {
      _.each(this.$('[data-schemapath].container-title input'), function(I) {
        I.edited = Boolean($(I).val());
      });

      this.$('[data-schemapath].container-name input').trigger('keyup');
      return this;
    },

    reset: function(schema, schemaURL) {
      var refs = {};
      var init = (function(formData, resourceDataSources) {
        this.layout.form = new jsonEditor.JSONEditorView(this.$('[data-id=form-container]').get(0), {
          refs              : refs,
          schema            : schema,
          show_errors       : 'change',
          theme             : 'bootstrap3',
          dataSources       : resourceDataSources,
          disable_edit_json : true,
          disable_properties: true,
          iconlib           : 'fontawesome4',
          keep_oneof_values : false,
          initialData       : formData
        });

        // Bind local event to form nodes after form is renedered
        this.delegateEvents();

        this.layout.form.on('ready', (function() {
          // There is no any good way to bind events to custom button or even add cutsom button
          $(this.layout.form.getEditor('root.schema').container)
            .children('h3').append(this.layout.uploadData.el);
          // After `ready` event fired, editor fire `change` event regarding to the initial changes
          this.layout.form.on('change', _.after(2, (function() {
            window.APP.layout.download2.reset(this.layout.form.getCleanValue(), schema).activate();
            window.APP.layout.download.reset(this.layout.form.getCleanValue(), schema).activate();
            this.showResult();
          }).bind(this)));
        }).bind(this));

        this.layout.uploadData = (new DataUploadView({
          el: this.layout.form.theme.getHeaderButtonHolder(),
          parent: this
        })).render();

        this.populateTitlesFromNames();
        $('#json-code').prop('hidden', true);
      }).bind(this);

      request.get(getDefinitionUrl(schemaURL))
        .then((function(definitions) {
          refs = getRefsMapping(schema, JSON.parse(definitions.text) );
          if(this.layout.form) {
            Promise.map(
              [this.layout.form.getEditor('root.schema')],
              (function(R, I) { return this.layout.form.getEditor('root.schema')}).bind(this)
              )
              .then((function(R) {
                var formData = this.layout.form.getCleanValue();

                this.layout.form.destroy();
                this.layout.uploadData.undelegateEvents().remove();
                init(formData, R);
              }).bind(this))

              .catch(console.error.bind(console));
          } else {
            init();
          }
        }).bind(this))
      // Clean up previous state
    },

    showResult: function() {
      var value = this.layout.form.getCleanValue();
      $('#json-code').html(highlight.fixMarkup(
        highlight.highlight('json', JSON.stringify(value, undefined, 2)).value
      ));

      var heading = $('#step1-title');
      if (_.keys(value).length > 0) {
        heading.addClass('loaded');
      } else {
        heading.removeClass('loaded');
      }

      return this;
    },

    collectValidationErrors: function() {
      var results = [];
      var form = this.layout.form;
      var messages = form.validation_results;
      if (_.isArray(messages)) {
        _.forEach(messages, function(item) {
          var editor = form.getEditor(item.path);
          if (editor && editor.schema) {
            results.push({
              title: editor.schema.title,
              description: editor.schema.description,
              message: item.message,
              path: item.path,
              property: item.property,
              schema: editor.schema
            });
          }
        });
      }
      return results;
    }
  })
};
