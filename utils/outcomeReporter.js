const constants = require('./constants')

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

const Handlebars = require('handlebars')

// Very dumb pluralization helper. In practice we only use this to
// pluralize the word file/files
function pluralize(string, count) {
  if (count === 1) {
    return string;
  }
  return string + 's';
}

Handlebars.registerHelper('pluralize', pluralize);

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

class OutcomeReporter {

  constructor({ implConfig, githubConfig }) {
    this.implConfig = implConfig
    this.githubConfig = githubConfig
  }

  get contribDirectory() {
    return this.implConfig.targetSubDirectory
  }

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
      return ` - ${this.contribDirectory}${file}`
    }).join('\n');
  }

  renderSubSection(sectionId, sectionInfo, vendor) {
    var templates = TEMPLATES[sectionId]
    var subTitle = Handlebars.compile(templates.subTitle)
    var description = Handlebars.compile(templates.description)
    var context = {
      fileCount: sectionInfo.files.length,
      vendor: vendor,
      contribDirectory: this.contribDirectory,
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
}

module.exports = OutcomeReporter;

