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
    // TODO look into updating targetSubDirectory to not include the
    // repo name
    // `implementation-contributed/jsc` instead of `test262/implementation-contributed/jsc`

    // Slice off the repo name from the targetSubDirectory since it
    // isn't used once the commits are made in github
    let subDir = this.implConfig.targetSubDirectory;
    return subDir.slice(subDir.indexOf('/') + 1)
  }

  renderHeading({implementerName, sourceSha, targetSha}) {
    let match = /\:([^.]+)./.exec(this.implConfig.targetGit)
    let targetGithub = match ? match[1] : ''

    return stripIndent`
      # Import JavaScript Test Changes from ${implementerName}

      Changes imported in this pull request include all changes made since
      [${sourceSha}](https://github.com/${targetGithub}/blob/${sourceSha}) in ${implementerName} and all changes made since [${targetSha}](../blob/${targetSha}) in
      test262.
`.trim()
  }

  renderFileList(files, branch) {
    return files.map(file => {
      return ` - [${this.contribDirectory}${file}](../blob/${branch}/${this.contribDirectory}${file})`
    }).join('\n');
  }

  renderSubSection(sectionId, sectionInfo, implementerName, branch) {
    let templates = OutcomeReporter.TEMPLATES[sectionId];
    let context = {
      fileCount: sectionInfo.files.length,
      contribDirectory: this.contribDirectory,
      implementerName
    };

    if (!sectionInfo.files.length) {
      return '';
    }

    return stripIndent`
### ${templates.subTitle(context)}

${templates.description(context)}

${this.renderFileList(sectionInfo.files, branch)}
`.trim();
  }

  generateReport({
    branch,
    sourceSha,
    targetSha,
    implementerName,
    outcomes
  }) {
    let sections = Object.entries(outcomes).map(([sectionId, section]) => {
      return this.renderSubSection(sectionId, section, implementerName, branch);
    });
    return stripIndent`
${this.renderHeading({sourceSha, targetSha, implementerName})}

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
  `implementerName` the name of the implementerName that is being synced
  `contribDirectory` the path to the implementor-contributed directory for this implementerName.
*/
OutcomeReporter.TEMPLATES = {
  [DO_NOT_EXPORT]: {
    subTitle: ({fileCount, implementerName, contribDirectory}) => `${fileCount} Ignored ${pluralize("File", fileCount)}`,
    description: ({fileCount, implementerName: implementerName, contribDirectory}) => stripIndent`
      These files were updated or added in the ${implementerName} repo but they
      are not synced to test262 because they are excluded.
`.trim()
  },
  [DO_NOT_EXPORT_AND_BLOCK_FUTURE_EXPORTS]: {
    subTitle: ({fileCount, implementerName, contribDirectory}) => `${fileCount} ${pluralize("File", fileCount)} Classified as Fully Curated`,
    description: ({fileCount, implementerName, contribDirectory}) => stripIndent`
      These files will be ignored in future imports.
`.trim()
  },
  [EXPORT_AND_OVERWRITE_PREVIOUS_VERSION]: {
    subTitle: ({fileCount, implementerName, contribDirectory}) => `${fileCount} ${pluralize("File", fileCount)} Updated From ${implementerName}`,
    description: ({fileCount, implementerName, contribDirectory}) => stripIndent`
      These files have been modified in ${implementerName}.
`.trim()
  },
  [APPEND_MODIFIED_TARGET_WITH_NOTE_AND_NEW_SOURCE]: {
    subTitle: ({fileCount, implementerName, contribDirectory}) => `${fileCount} ${pluralize("File", fileCount)} with changes in both test262 and ${implementerName}`,
    description: ({fileCount, implementerName, contribDirectory}) => stripIndent`
      The updated version of these files will be appended to the end of the
      original file with a code comment noting there was a curation in
      progress.
`.trim()
  },
  [RE_EXPORT_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION]: {
    subTitle: ({fileCount, implementerName, contribDirectory}) => `${fileCount} ${pluralize("File", fileCount)} Were Previously Curated Have Been Updated in ${implementerName}`,
    description: ({fileCount, implementerName, contribDirectory}) => stripIndent`
      These files have been reintroduced into the \`${contribDirectory}\`
      directory with a comment specifying they were previously curated and
      deleted.
`.trim()
  },
  [RE_EXPORT_RENAMED_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION]: {
    subTitle: ({fileCount, implementerName, contribDirectory}) => `${fileCount} ${pluralize("File", fileCount)} Were Renamed in Test262 and Deleted in ${implementerName}`,
    description: ({fileCount, implementerName, contribDirectory}) => stripIndent`
      These files have been reintroduced into the \`${contribDirectory}\`
      directory with a comment specifying they were previously curated and
      deleted.
`.trim()
  },
  [RE_EXPORT_SOURCE_NEW_EXTENSION_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION_AND_EXTENSION]: {
    subTitle: ({fileCount, implementerName, contribDirectory}) =>  `${fileCount} ${pluralize("File", fileCount)} Had Their Extension Updated in Test262 and Deleted in ${implementerName}`,
    description: ({fileCount, implementerName, contribDirectory}) => stripIndent`
      These files have been reintroduced into the \`${contribDirectory}\`
      directory with a comment specifying they were previously curated and
      deleted.
`.trim()
  },
  [DELETE_TARGET_FILE]: {
    subTitle: ({fileCount, implementerName, contribDirectory}) => `${fileCount} ${pluralize("File", fileCount)} Have Been Deleted in ${implementerName}`,
    description: ({fileCount, implementerName, contribDirectory}) => stripIndent`
      These files have been deleted in ${implementerName} and are removed from the
      \`${contribDirectory}\` directory.
`.trim()
  },
  [RENAME_TARGET_FILE]: {
    subTitle: ({fileCount, implementerName, contribDirectory}) => `${fileCount} ${pluralize("File", fileCount)} Have Been Renamed`,
    description: ({fileCount, implementerName, contribDirectory}) => stripIndent`
      These files were renamed in ${implementerName} and have had their filenames
      updated in \`${contribDirectory}\`.
`.trim()
  },
  [APPEND_MODIFIED_TARGET_WITH_NOTE_ON_SOURCE_DELETION]: {
    subTitle: ({fileCount, implementerName, contribDirectory}) => `${fileCount} Partially Curated ${pluralize("File", fileCount)} Have Been Deleted in ${implementerName}`,
    description: ({fileCount, implementerName, contribDirectory}) => stripIndent`
      A comment has been added to these files noting their deletion in
      ${implementerName}.
`.trim()
  },
  [RENAME_MODIFIED_TARGET_FILE_WITH_NOTE_ON_RENAME]: {
    subTitle: ({fileCount, implementerName, contribDirectory}) => `${fileCount} Partially Curated ${pluralize("File", fileCount)} Have Been Renamed`,
    description: ({fileCount, implementerName, contribDirectory}) => stripIndent`
      These files were renamed in ${implementerName} and have had their filenames
      updated in \`${contribDirectory}\`.
`.trim()
  },
  [UPDATE_EXTENSION_ON_MODIFIED_TARGET_FILE_WITH_NOTE_ON_EXTENSION_CHANGE]: {
    subTitle: ({fileCount, implementerName, contribDirectory}) => `${fileCount} Partially Curated ${pluralize("File", fileCount)} have been Renamed to Match ${implementerName}`,
    description: ({fileCount, implementerName, contribDirectory}) => stripIndent`
      These files were renamed in ${implementerName} and have had their filenames
      updated in \`${contribDirectory}\`.
`.trim()
  },
  [EXPORT_FILE]: {
    subTitle: ({fileCount, implementerName, contribDirectory}) => `${fileCount} New ${pluralize("File", fileCount)} Added in ${implementerName}`,
    description: ({fileCount, implementerName, contribDirectory}) => stripIndent`
      These are new files added in ${implementerName} and have been synced to the
      \`${contribDirectory}\` directory.
`.trim()
  },
  [UPDATE_EXTENSION_ON_TARGET_FILE]: {
    subTitle: ({fileCount, implementerName, contribDirectory}) => `${fileCount} ${pluralize("File", fileCount)} with their Extension Updated`,
    description: ({fileCount, implementerName, contribDirectory}) => ``
  },
}


module.exports = OutcomeReporter;

