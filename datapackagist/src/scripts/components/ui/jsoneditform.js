var jsonEditor = require('json-editor');
var _ = require('underscore');
var backbone = require('backbone');
var deepEmpty = require('deep-empty');
var Goodtables = require('goodtables');
var deepCompact = require('deep-compact');
var Promise = require('bluebird');
var JSONEditorView = JSONEditor;

JSONEditorView.prototype.init = _.wrap(JSONEditorView.prototype.init, function(init) {
  init.apply(this, _.rest(arguments));

  this.on('ready', (function() {

    // Remove Top-level collapse button
    $(this.root.toggle_button).remove();

    // Detecting changes
    this.changed = false;

    //autocomplete has been disabled because JSON Editor doesn't work properly with it on Safari
    $( document ).on( 'focus', ':input', function(){
      $( this ).attr( 'autocomplete', 'off' );
    });

    // If on the previous form was entered values try to apply it to new form
    if(this.options.initialData) {
      var schema = this.getValue(this.options.initialData);
      this.setValue(_.extend({}, schema, _.pick(this.options.initialData, _.keys(schema))));
    }

    // After `ready` event fired, editor fire `change` event regarding to the initial changes
    this.on('change', _.after(3, (function() {
      this.changed = true;
    }).bind(this)));

    // Looks like previous loop is somehow async
    setTimeout((function() { $('#json-code').prop('hidden', false); }).bind(this), 300);

    // Remove collapse button on add new item in collection
    _.each($('[data-schemapath][data-schemapath!=root]:has(.json-editor-btn-add)', this.element), function(E) {
      var
        editor = this.getEditor($(E).data('schemapath'));

      $(_.pluck(editor.rows, 'toggle_button')).remove();

      $(editor.add_row_button).click((function() {
        $(_.last(this.rows).toggle_button).remove();
      }).bind(editor));
    }, this);
  }).bind(this));
});

// Omit empty properties and "0" values of object properties put into array.
// Stick with that complex solution because "0" is the default value.
JSONEditorView.prototype.getCleanValue = function () { return deepEmpty(this.getValue(), function(O) {
  return !_.isEmpty(O) && !_.every(O, function(I) { return _.isEmpty(deepCompact(I, true)); })
}); };

// Validate resources and show errors message at header of Schema row
JSONEditorView.prototype.validateResources = function () {
  var rows = this.getEditor('root.resources').rows;


  return Promise.each(rows, (function(R) {
    if(_.isUndefined(R.resourceIsValid))
      return this.getEditor('root.resources').getDataSource(parseInt(R.key)).then(function(DS) {
        // Empty .dataSource means that resource specified as file path
        // TODO replace this condition when there is workaround for file paths
        if(_.isEmpty(DS))
          return new Promise(function(RS, RJ) { RS(false); });

        return (new Goodtables({method: 'post', report_type: 'grouped'}))
          .run(DS.data, JSON.stringify(DS.schema))
          .then(function(E) { R.resourceIsValid = !Boolean(E.errors.length); });
      });
    else
      return new Promise(function(RS, RJ) { RS(true); })
  }).bind(this)).then(function() {
    // Show error in resource section if it is invalid
    rows.forEach(function(R) {
      if(R.resourceIsValid)
        return true;

      R.editors.schema.showValidationErrors([{
        message: 'Resource is invalid',
        path: R.editors.schema.path
      }]);
    })
  });
};

JSONEditorView.prototype.getEditorClass = _.wrap(
  JSONEditorView.prototype.getEditorClass,
  function(getEditorClass, schema) {
    var result = getEditorClass.apply(this, _.rest(arguments));
    result.prototype.postBuild = _.wrap(
      result.prototype.postBuild,
      function(postBuild) {
        postBuild.apply(this, _.rest(arguments));
      }
    );
    return result;
  }
);

// Proper representation of all form buttons. Avoid changing each newly
// rendered button by rewriting the .getButton()
JSONEditor.defaults.themes.bootstrap3.prototype.getButton = function(text, icon, title) {
  var el = document.createElement('button');

  el.type = 'button';
  el.className += 'btn btn-info btn-sm';
  this.setButtonText(el,text,icon,title);
  return el;
};

JSONEditor.defaults.themes.bootstrap3.prototype.getGridRow = function() {
  var result = $('<div>').addClass('col-md-12');
  setTimeout(function() {
    result.parent().addClass('row row-fluid');
    var editor = result.find('> div');
    var type = editor.attr('data-schematype');
    editor.removeClass('col-md-12');
    if (['array', 'object'].indexOf(type) < 0) {
      if (result.find('textarea').length == 0) {
        result.removeClass('col-md-12').addClass('col-md-6');
      }
    }
  }, 10);
  return result.get(0);
};

JSONEditor.defaults.themes.bootstrap3.prototype.getIndentedPanel = function() {
  var result = $('<div>').addClass('well well-sm clearfix');
  return result.get(0);
};

module.exports.JSONEditorView = JSONEditorView;
