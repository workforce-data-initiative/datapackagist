module.exports = function(browser) {
	describe('Ensure From Remote API', function() {
    it('a correct CKAN remote results in a data package', function(done) {
      browser.visit('/tabular/from/?source=ckan&url=http%3A%2F%2Fdatahub.io%2Fapi%2Faction%2Fpackage_show%3Fid%3Dpopulation-number-by-governorate-age-group-and-gender-2010-2014&format=json', function() {
        browser.wait({duration: '10s', element: '[data-schemapath="root.resources.0"]'}).then(function() {
          browser.assert.element('[data-schemapath="root.resources"] [data-schemapath="root.resources.0"]');
          done();
        });
      });
    });
  });
}