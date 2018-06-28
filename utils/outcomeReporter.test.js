const OutcomeReporter = require('./outcomeReporter')
const {stripIndent} = require('common-tags')

var outcomes = { '0':
                 { description: [ 'DO_NOT_EXPORT.....' ],
                   files:
                   [ '/262-partially-curated-vendor-not-modified/empty-function.js',
                     '/262-partially-curated-vendor-rename/function-toString-arrow.js',
                     '/RENAME_MODIFIED_TARGET_FILE_WITH_NOTE_ON_RENAME/import-basic.js',
                     '/UPDATE_EXTENSION_ON_MODIFIED_TARGET_FILE_WITH_NOTE_ON_EXTENSION_CHANGE/inferred-names.js' ] },
                 '1':
                 { description: [ 'DO_NOT_EXPORT_AND_BLOCK_FUTURE_EXPORTS.....' ],
                   files:
                   [ '/262-fully-curated-vendor-not-modified/array-flatten.js' ] },
                 '2':
                 { description: [ 'EXPORT_AND_OVERWRITE_PREVIOUS_VERSION.....' ],
                   files:
                   [ '/262-not-modified-vendor-modified/class-static-get-weird.js' ] },
                 '3':
                 { description: [ 'APPEND_MODIFIED_TARGET_WITH_NOTE_AND_NEW_SOURCE.....' ],
                   files:
                   [ '/262-partially-curated-vendor-modified/duplicate-computed-accessors.js',
                     '/APPEND_MODIFIED_TARGET_WITH_NOTE_AND_NEW_SOURCE/generator-return.js' ] },
                 '4':
                 { description:
                   [ 'RE_EXPORT_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION.....' ],
                   files:
                   [ '/262-fully-curated-vendor-modified/array-indexof.js',
                     '/RE_EXPORT_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION/global-is-nan.js' ] },
                 '5':
                 { description:
                   [ 'RE_EXPORT_RENAMED_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION.....' ],
                   files: [] },
                 '6':
                 { description:
                   [ 'RE_EXPORT_SOURCE_NEW_EXTENSION_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION_AND_EXTENSION.....' ],
                   files: [] },
                 '7':
                 { description: [ 'DELETE_TARGET_FILE.....' ],
                   files:
                   [ '/262-not-modified-vendor-deleted/builtin-function-name.js',
                     '/DELETE_TARGET_FILE/have-a-bad-time-with-arguments.js' ] },
                 '8':
                 { description: [ 'RENAME_TARGET_FILE.....' ],
                   files:
                   [ '/262-fully-curated-vendor-rename/basic-weakmap-post-rename.js,',
                     '/262-not-modified-vendor-rename/custom-iterators-post-rename.js,',
                     '/262-partially-curated-vendor-rename/function-toString-arrow-post-rename.js,',
                     '/RE_EXPORT_RENAMED_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION/generator-yield-star-post-rename.js,',
                     '/RE_EXPORT_SOURCE_NEW_EXTENSION_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION_AND_EXTENSION/has-custom-properties.jsx,',
                     '/UPDATE_EXTENSION_ON_TARGET_FILE/instanceof.jsx,' ] },
                 '9':
                 { description:
                   [ 'APPEND_MODIFIED_TARGET_WITH_NOTE_ON_SOURCE_DELETION.....' ],
                   files:
                   [ '/262-partially-curated-vendor-deleted/date-negative-zero.js',
                     '/APPEND_MODIFIED_TARGET_WITH_NOTE_ON_SOURCE_DELETION/has-own-property-called-on-non-object.js' ] },
                 '10':
                 { description: [ 'RENAME_MODIFIED_TARGET_FILE_WITH_NOTE_ON_RENAME.....' ],
                   files: [] },
                 '11':
                 { description:
                   [ 'UPDATE_EXTENSION_ON_MODIFIED_TARGET_FILE_WITH_NOTE_ON_EXTENSION_CHANGE.....' ],
                   files: [] },
                 '12':
                 { description: [ 'EXPORT_FILE.....' ],
                   files:
                   [ '/262-does-not-exist-vendor-new-exportable-file/for-in-array-mode.js',
                     '/262-does-not-exist-vendor-new-unexportable-file/es6.yaml' ] },
                 '13':
                 { description: [ 'UPDATE_EXTENSION_ON_TARGET_FILE.....' ],
                   files: [] } }


describe('OutcomeReporter', function() {
  it('should render a file list with the targetSubDirectory', async function() {
    let reporter = new OutcomeReporter({
      implConfig: { targetSubDirectory: "test262/implementation-contributed/jsc" }
    });

    expect(reporter.renderFileList(
      [
        '/stress/for-in-array-mode.js',
        '/stress/for-of-array-mode.js',
      ]
    ))
      .toBe(` - test262/implementation-contributed/jsc/stress/for-in-array-mode.js
 - test262/implementation-contributed/jsc/stress/for-of-array-mode.js`);
  });

  it('should use the commit shas in the heading', function() {
    let reporter = new OutcomeReporter({
      implConfig: { targetSubDirectory: "test262/implementation-contributed/jsc" }
    });

    expect(reporter.renderHeading({
      vendor: 'jsc',
      sourceSha: 'abc',
      targetSha: '123',
    }))
      .toBe(stripIndent`
# Import JavaScript Test Changes from jsc

Changes imported in this pull request include all changes made since
\`abc\` in jsc and all changes made since \`123\` in
test262.
`)
  });

  it('should not render a subsection if the files array is empty', function() {
    let reporter = new OutcomeReporter({
      implConfig: { targetSubDirectory: "test262/implementation-contributed/jsc" }
    });

    expect(reporter.renderSubSection(0, {files: []}, 'jsc'))
      .toBe('')
  });

  it('should render a subsection', function() {
    let reporter = new OutcomeReporter({
      implConfig: { targetSubDirectory: "test262/implementation-contributed/jsc" }
    });

    expect(reporter.renderSubSection(0, {files: ['/a.js']}, 'jsc'))
      .toBe(`
### 1 Ignored File

These files were updated or added in the jsc repo but they
are not synced to test262 because they are excluded.

 - test262/implementation-contributed/jsc/a.js
`.trim())
  });


  it('should generate a report', function() {
    let reporter = new OutcomeReporter({
      implConfig: { targetSubDirectory: "test262/implementation-contributed/jsc" }
    });

    expect(reporter.generateReport({
      sourceSha: '123',
      targetSha: 'abc',
      vendor: 'jsc',
      outcomes: { '0': { files: ['/a.js']}}
    }))
      .toBe(`
# Import JavaScript Test Changes from jsc

Changes imported in this pull request include all changes made since
\`123\` in jsc and all changes made since \`abc\` in
test262.

### 1 Ignored File

These files were updated or added in the jsc repo but they
are not synced to test262 because they are excluded.

 - test262/implementation-contributed/jsc/a.js
`.trim())
  });
});
