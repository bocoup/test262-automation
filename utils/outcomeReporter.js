const constants = require('./constants')
const Handlebars = require('handlebars')

// Very dump pluralization helper. In practice we only use this to
// pluralize the word file/files
Handlebars.registerHelper('pluralize', function(string, count) {
  if (count === 1) {
    return string;
  }
  return string + 's';
});

const {
  DO_NOT_EXPORT,
  DO_NOT_EXPORT_AND_BLOCK_FUTURE_EXPORTS,
  EXPORT_AND_OVERWRITE_PREVIOUS_VERSION,
  APPEND_MODIFIED_TARGET_WITH_NOTE_AND_NEW_SOURCE,
  RE_EXPORT_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION,
  RE_EXPORT_RENAMED_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION,
  RE_EXPORT_SOURCE_NEW_EXTENSION_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION_AND_EXTENSION,
  DELETE_TARGET_FILE,
  RENAME_TARGET_FILE,
  APPEND_MODIFIED_TARGET_WITH_NOTE_ON_SOURCE_DELETION,
  RENAME_MODIFIED_TARGET_FILE_WITH_NOTE_ON_RENAME,
  UPDATE_EXTENSION_ON_MODIFIED_TARGET_FILE_WITH_NOTE_ON_EXTENSION_CHANGE,
  EXPORT_FILE,
  UPDATE_EXTENSION_ON_TARGET_FILE,
} = constants.fileOutcomes;

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


class OutcomeReporter {

  renderHeading({vendor, sourceSha, targetSha}) {
    return `
# Import JavaScript Test Changes from ${vendor}

Changes imported in this pull request include all changes made since
\`${sourceSha}\` in ${vendor} and all changes made since \`${targetSha}\` in
test262.
    `
  }

  renderFileList(files) {
    return files.map(file => {
      return ` - ${file}`
    }).join('\n');
  }

  renderSubSection(sectionId, sectionInfo, vendor) {
    console.log(sectionInfo)
    var templates = TEMPLATES[sectionId]
    var subTitle = Handlebars.compile(templates.subTitle)
    var description = Handlebars.compile(templates.description)
    var context = {
      fileCount: sectionInfo.files.length,
      vendor: vendor,
      contribDirectory: `implementor-contribDirectory/${vendor}`
    };

    if (!sectionInfo.files.length) {
      return '';
    }

    return `
### ${subTitle(context)}

${description(context)}

${this.renderFileList(sectionInfo.files)}
`
  }

  generateReport({
    sourceSha,
    targetSha,
    vendor,
    outcomes
  }) {
    var sections = Object.entries(outcomes).map(([sectionId, section]) => {
      return this.renderSubSection(sectionId, section, vendor);
    });
    return `
${this.renderHeading({sourceSha, targetSha, vendor})}

${sections.join('')}
`
  }

  generateReport1(outcomes) {

    return `
      # Import JavaScript Test Changes from JSC

      ### 2 new files added in JSC

      These files were added in JSC and have been synced to the
      implementor-contributed directory.

      - /262-does-not-exist-vendor-new-exportable-file/for-in-array-mode.js
      - /262-does-not-exist-vendor-new-unexportable-file/es6.yaml

      ### 0 partially curated files have been renamed to match JSC
      UPDATE_EXTENSION_ON_MODIFIED_TARGET_FILE_WITH_NOTE_ON_EXTENSION_CHANGE.....

      ### 0 partially curated files have been renamed to match JSC

      These files were partially curated in test262 and have been
      renamed in JSC. A comment has been added noting the files past
      history.


      ### 2 partially curated files have been deleted in JSC

      A comment has been added to these files noting their deletion in
      JSC.

      - /262-partially-curated-vendor-deleted/date-negative-zero.js
      - /APPEND_MODIFIED_TARGET_WITH_NOTE_ON_SOURCE_DELETION/has-own-property-called-on-non-object.js

      ### 6 files have been renamed

      These files were renamed in JSC and have had their filenames
      updated in implementor-contributed.

      - /262-fully-curated-vendor-rename/basic-weakmap-post-rename.js
      - /262-not-modified-vendor-rename/custom-iterators-post-rename.js
      - /262-partially-curated-vendor-rename/function-toString-arrow-post-rename.js
      - /RE_EXPORT_RENAMED_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION/generator-yield-star-post-rename.js
      - /RE_EXPORT_SOURCE_NEW_EXTENSION_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION_AND_EXTENSION/has-custom-properties.jsx
      - /UPDATE_EXTENSION_ON_TARGET_FILE/instanceof.jsx

      ### 2 files have been deleted

      These files have been deleted in JSC and are removed from the
      implementation-contributed directory.

      - /262-not-modified-vendor-deleted/builtin-function-name.js
      - /DELETE_TARGET_FILE/have-a-bad-time-with-arguments.js

      ### 0 files that were previously curated have been given a new extension in JSC

      These files have been reintroduced into the
      implementation-contributed directory with a comment specifying
      they were previously curated and deleted.

      - 

      ### 0 files that were previously curated have been renamed in JSC

      These files have been reintroduced into the
      implementation-contributed directory with a comment specifying
      they were previously curated and deleted.

      - 

      ### 2 files that were previously curated have been updated in JSC

      These files have been reintroduced into the
      implementation-contributed directory with a comment specifying
      they were previously curated and deleted.

      - /262-fully-curated-vendor-modified/array-indexof.js
      - /RE_EXPORT_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION/global-is-nan.js

      ### 2 Files with changed in both test262 and JSC
      - /262-partially-curated-vendor-modified/duplicate-computed-accessors.js
      - /APPEND_MODIFIED_TARGET_WITH_NOTE_AND_NEW_SOURCE/generator-return.js

      ### 1 file updated from jsc
      - /262-not-modified-vendor-modified/class-static-get-weird.js

      ### 1 File classified as fully curated
      These files will be ignored in future imports
      - /262-fully-curated-vendor-not-modified/array-flatten.js

      ### 4 Ignored Files
      - /262-partially-curated-vendor-not-modified/empty-function.js
      - /262-partially-curated-vendor-rename/function-toString-arrow.js
      - /RENAME_MODIFIED_TARGET_FILE_WITH_NOTE_ON_RENAME/import-basic.js
      - /UPDATE_EXTENSION_ON_MODIFIED_TARGET_FILE_WITH_NOTE_ON_EXTENSION_CHANGE/inferred-names.js
    `
  }
}

// add header with shas


/*
  Template variables:
    `fileCount` the number of files in the sub section.
    `vendor` the name of the vendor that is being synced
    `contribDirectory` the path to the implementor-contributed directory for this vendor.

  Template helpers:
    `pluralize` plurazlizes the input string if the count argument is not 1.
*/
var TEMPLATES = {

  // '1': {
//   subTitle: '{{ fileCount }} new {{pluralize "file" fileCount }} added in {{ vendor }}',
//   description: `
//       These files were added in {{vendor}} and have been synced to the
//       {{ contribDirectory }} directory.
// `,
//   },
  [DO_NOT_EXPORT]: {
    subTitle: '{{ fileCount }} Ignored {{pluralize "File" fileCount}}',
    description: `
These files were updated or added in the {{ vendor }} repo but they
are not synced to test262 because they are excluded.
`
  },
  [DO_NOT_EXPORT_AND_BLOCK_FUTURE_EXPORTS]: {
    subTitle: '{{ fileCount }} {{pluralize "File" fileCount}} Classified as Fully Curated',
    description: `
These files will be ignored in future imports.
`
  },
  [EXPORT_AND_OVERWRITE_PREVIOUS_VERSION]: {
    subTitle: '{{ fileCount }} {{pluralize "File" fileCount}} Updated From {{ vendor }}',
    description: `
These files have been modified in {{ vendor }}.
`
  },
  [APPEND_MODIFIED_TARGET_WITH_NOTE_AND_NEW_SOURCE]: {
    subTitle: '{{ fileCount }} {{pluralize "File" fileCount}} with changes in both test262 and JSC',
    description: `
The updated version of these files will be appended to the end of the
original file with a code comment noting there was a curation in
progress.
`
  },
  [RE_EXPORT_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION]: {
    subTitle: '{{ fileCount }} {{pluralize "File" fileCount }} Were Previously Curated Have Been Updated in {{vendor}}',
    description: `
These files have been reintroduced into the \`{{ contribDirectory }}\`
directory with a comment specifying they were previously curated and
deleted.
`
  },
  [RE_EXPORT_RENAMED_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION]: {
    subTitle: '{{ fileCount }} {{pluralize "File" fileCount }} Were Renamed in Test262 and Deleted in {{ vendor }}',
    description: `
`
  },
  [RE_EXPORT_SOURCE_NEW_EXTENSION_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION_AND_EXTENSION]: {
    subTitle: '{{ fileCount }} {{pluralize "File" fileCount }} Had Their Extension Updated in Test262 and Deleted in {{ vendor }}',
    description: `
`
  },
  [DELETE_TARGET_FILE]: {
    subTitle: '{{ fileCount }} {{pluralize "File" fileCount }} Have Been Deleted in {{ vendor }}',
    description: `
These files have been deleted in {{ vendor }} and are removed from the
\`{{ contribDirectory }}\` directory.
`
  },
  [RENAME_TARGET_FILE]: {
    subTitle: '{{ fileCount }} {{pluralize "File" fileCount }} Have Been Renamed',
    description: `
These files were renamed in {{ vendor }} and have had their filenames
updated in \`{{ contribDirectory }}\`.
`
  },
  [APPEND_MODIFIED_TARGET_WITH_NOTE_ON_SOURCE_DELETION]: {
    subTitle: '{{ fileCount }} Partially Curated {{pluralize "File" fileCount }} Have Been Deleted in {{vendor}}',
    description: `
A comment has been added to these files noting their deletion in
{{vendor}}.
`
  },
  [RENAME_MODIFIED_TARGET_FILE_WITH_NOTE_ON_RENAME]: {
    subTitle: '{{ fileCount }} Partially Curated {{pluralize "File" fileCount }} Have Been Renamed',
    description: `
These files were renamed in {{ vendor }} and have had their filenames
updated in \`{{ contribDirectory }}\`.
`
  },
  [UPDATE_EXTENSION_ON_MODIFIED_TARGET_FILE_WITH_NOTE_ON_EXTENSION_CHANGE]: {
    subTitle: '{{ fileCount }} Partially Curated {{pluralize "File" fileCount }} have been Renamed to Match {{ vendor }}',
    description: `
These files were renamed in {{ vendor }} and have had their filenames
updated in \`{{ contribDirectory }}\`.
`
  },
  [EXPORT_FILE]: {
    subTitle: '{{ fileCount }} New {{pluralize "File" fileCount }} Added in {{ vendor }}',
    description: `
These are new files added in {{ vendor }} and have been synced to the
\`{{ contribDirectory }}\` directory.
`
  },
  [UPDATE_EXTENSION_ON_TARGET_FILE]: {
    subTitle: '{{ fileCount }} {{pluralize "File" fileCount }} with ther Extension Updated',
    description: ''
  },
}



var reporter = new OutcomeReporter()

var report = reporter.generateReport({
  sourceSha: 'abc',
  targetSha: '123',
  vendor: 'jsc',
  outcomes
})


console.log(report)
