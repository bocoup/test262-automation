const constants = require('./constants')
const {stripIndent} = require('common-tags')

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
} = constants.FILE_OUTCOMES;

class OutcomeReporter {

  constructor({ implConfig, githubConfig }) {
    this.implConfig = implConfig
    this.githubConfig = githubConfig
  }

  get contribDirectory() {
    return this.implConfig.targetSubDirectory
  }

  renderHeading({implementatorName, sourceSha, targetSha}) {
    let match = /\:([^.]+)./.exec(this.implConfig.targetGit)
    let targetGithub = match ? match[1] : ''

    return stripIndent`
      # Import JavaScript Test Changes from ${implementatorName}

      Changes imported in this pull request include all changes made since
      [${sourceSha}](https://github.com/${targetGithub}/blob/${sourceSha}) in ${implementatorName} and all changes made since [${targetSha}](../blob/${targetSha}) in
      test262.
`.trim()
  }

  renderFileList(files) {
    return files.map(file => {
      return ` - [${this.contribDirectory}${file}](../../blob/${this.contribDirectory}${file})`
    }).join('\n');
  }

  renderSubSection(sectionId, sectionInfo, implementatorName) {
    let templates = OutcomeReporter.TEMPLATES[sectionId];
    let context = {
      fileCount: sectionInfo.files.length,
      implementatorName: implementatorName,
      contribDirectory: this.contribDirectory,
    };

    if (!sectionInfo.files.length) {
      return '';
    }

    return stripIndent`
### ${templates.subTitle(context)}

${templates.description(context)}

${this.renderFileList(sectionInfo.files)}
`.trim();
  }

  generateReport({
    sourceSha,
    targetSha,
    implementatorName,
    outcomes
  }) {
    let sections = Object.entries(outcomes).map(([sectionId, section]) => {
      return this.renderSubSection(sectionId, section, implementatorName);
    });
    return stripIndent`
${this.renderHeading({sourceSha, targetSha, implementatorName})}

${sections.join('\n')}
`.trim()
  }
}

// Very dumb pluralization helper. In practice we only use this to
// pluralize the word "File"/"Files"
function pluralize(string, count) {
  if (count === 1) {
    return string;
  }
  return string + 's';
}

OutcomeReporter.pluralize = pluralize;

/*
  Template variables:
  `fileCount` the number of files in the sub section.
  `implementatorName` the name of the implementatorName that is being synced
  `contribDirectory` the path to the implementor-contributed directory for this implementatorName.
*/
OutcomeReporter.TEMPLATES = {
  [DO_NOT_EXPORT]: {
    subTitle: ({fileCount, implementatorName, contribDirectory}) => `${fileCount} Ignored ${pluralize("File", fileCount)}`,
    description: ({fileCount, implementatorName, contribDirectory}) => stripIndent`
      These files were updated or added in the ${implementatorName} repo but they
      are not synced to test262 because they are excluded.
`.trim()
  },
  [DO_NOT_EXPORT_AND_BLOCK_FUTURE_EXPORTS]: {
    subTitle: ({fileCount, implementatorName, contribDirectory}) => `${fileCount} ${pluralize("File", fileCount)} Classified as Fully Curated`,
    description: ({fileCount, implementatorName, contribDirectory}) => stripIndent`
      These files will be ignored in future imports.
`.trim()
  },
  [EXPORT_AND_OVERWRITE_PREVIOUS_VERSION]: {
    subTitle: ({fileCount, implementatorName, contribDirectory}) => `${fileCount} ${pluralize("File", fileCount)} Updated From ${implementatorName}`,
    description: ({fileCount, implementatorName, contribDirectory}) => stripIndent`
      These files have been modified in ${implementatorName}.
`.trim()
  },
  [APPEND_MODIFIED_TARGET_WITH_NOTE_AND_NEW_SOURCE]: {
    subTitle: ({fileCount, implementatorName, contribDirectory}) => `${fileCount} ${pluralize("File", fileCount)} with changes in both test262 and JSC`,
    description: ({fileCount, implementatorName, contribDirectory}) => stripIndent`
      The updated version of these files will be appended to the end of the
      original file with a code comment noting there was a curation in
      progress.
`.trim()
  },
  [RE_EXPORT_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION]: {
    subTitle: ({fileCount, implementatorName, contribDirectory}) => `${fileCount} ${pluralize("File", fileCount)} Were Previously Curated Have Been Updated in {{implementatorName}}`,
    description: ({fileCount, implementatorName, contribDirectory}) => stripIndent`
      These files have been reintroduced into the \`${contribDirectory}\`
      directory with a comment specifying they were previously curated and
      deleted.
`.trim()
  },
  [RE_EXPORT_RENAMED_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION]: {
    subTitle: ({fileCount, implementatorName, contribDirectory}) => `${fileCount} ${pluralize("File", fileCount)} Were Renamed in Test262 and Deleted in ${implementatorName}`,
    description: ({fileCount, implementatorName, contribDirectory}) => stripIndent`
      These files have been reintroduced into the \`${contribDirectory}\`
      directory with a comment specifying they were previously curated and
      deleted.
`.trim()
  },
  [RE_EXPORT_SOURCE_NEW_EXTENSION_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION_AND_EXTENSION]: {
    subTitle: ({fileCount, implementatorName, contribDirectory}) =>  `${fileCount} ${pluralize("File", fileCount)} Had Their Extension Updated in Test262 and Deleted in ${implementatorName}`,
    description: ({fileCount, implementatorName, contribDirectory}) => stripIndent`
      These files have been reintroduced into the \`${contribDirectory}\`
      directory with a comment specifying they were previously curated and
      deleted.
`.trim()
  },
  [DELETE_TARGET_FILE]: {
    subTitle: ({fileCount, implementatorName, contribDirectory}) => `${fileCount} ${pluralize("File", fileCount)} Have Been Deleted in ${implementatorName}`,
    description: ({fileCount, implementatorName, contribDirectory}) => stripIndent`
      These files have been deleted in ${implementatorName} and are removed from the
      \`${contribDirectory}\` directory.
`.trim()
  },
  [RENAME_TARGET_FILE]: {
    subTitle: ({fileCount, implementatorName, contribDirectory}) => `${fileCount} ${pluralize("File", fileCount)} Have Been Renamed`,
    description: ({fileCount, implementatorName, contribDirectory}) => stripIndent`
      These files were renamed in ${implementatorName} and have had their filenames
      updated in \`${contribDirectory}\`.
`.trim()
  },
  [APPEND_MODIFIED_TARGET_WITH_NOTE_ON_SOURCE_DELETION]: {
    subTitle: ({fileCount, implementatorName, contribDirectory}) => `${fileCount} Partially Curated ${pluralize("File", fileCount)} Have Been Deleted in {{implementatorName}}`,
    description: ({fileCount, implementatorName, contribDirectory}) => stripIndent`
      A comment has been added to these files noting their deletion in
      ${implementatorName}.
`.trim()
  },
  [RENAME_MODIFIED_TARGET_FILE_WITH_NOTE_ON_RENAME]: {
    subTitle: ({fileCount, implementatorName, contribDirectory}) => `${fileCount} Partially Curated ${pluralize("File", fileCount)} Have Been Renamed`,
    description: ({fileCount, implementatorName, contribDirectory}) => stripIndent`
      These files were renamed in ${implementatorName} and have had their filenames
      updated in \`${contribDirectory}\`.
`.trim()
  },
  [UPDATE_EXTENSION_ON_MODIFIED_TARGET_FILE_WITH_NOTE_ON_EXTENSION_CHANGE]: {
    subTitle: ({fileCount, implementatorName, contribDirectory}) => `${fileCount} Partially Curated ${pluralize("File", fileCount)} have been Renamed to Match ${implementatorName}`,
    description: ({fileCount, implementatorName, contribDirectory}) => stripIndent`
      These files were renamed in ${implementatorName} and have had their filenames
      updated in \`${contribDirectory}\`.
`.trim()
  },
  [EXPORT_FILE]: {
    subTitle: ({fileCount, implementatorName, contribDirectory}) => `${fileCount} New ${pluralize("File", fileCount)} Added in ${implementatorName}`,
    description: ({fileCount, implementatorName, contribDirectory}) => stripIndent`
      These are new files added in ${implementatorName} and have been synced to the
      \`${contribDirectory}\` directory.
`.trim()
  },
  [UPDATE_EXTENSION_ON_TARGET_FILE]: {
    subTitle: ({fileCount, implementatorName, contribDirectory}) => `${fileCount} ${pluralize("File", fileCount)} with ther Extension Updated`,
    description: ({fileCount, implementatorName, contribDirectory}) => ``
  },
}


module.exports = OutcomeReporter;

