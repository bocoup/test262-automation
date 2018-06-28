const {
  FILE_OUTCOMES, FILE_STATUSES, STATUS_SCENARIOS, EXPORT_ACTIONS,
} = require('./constants.js');
const get = require('lodash.get');
const { FileExporter } = require('./fileExporter.js');

const {
  ADDED,
  MODIFIED,
  DELETE,
  RENAMED,
  NO_CHANGE,
} = FILE_STATUSES;

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
} = FILE_OUTCOMES;

const {
  ADD_TO_DO_NOT_EXPORT_LIST,
  UPDATE_REFERENCE_IN_DO_NOT_EXPORT_LIST,
  REMOVE_FROM_DO_NOT_EXPORT_LIST,
} = EXPORT_ACTIONS;

class FileOutcomeManager {
  constructor(params) {
    this.targetDiffList = params.targetDiffListObj;
    this.sourceDiffList = params.sourceDiffListObj;
    this.targetAndSourceDiffList = params.targetAndSourceDiffListObj;
    this.fileExporter = params.fileExporter;
    this.fileOutcomes = {
      [DO_NOT_EXPORT]: {
        description: ['DO_NOT_EXPORT.....'],
        files: [],
      },
      [DO_NOT_EXPORT_AND_BLOCK_FUTURE_EXPORTS]: {
        description: ['DO_NOT_EXPORT_AND_BLOCK_FUTURE_EXPORTS.....'],
        files: [],
      },
      [EXPORT_AND_OVERWRITE_PREVIOUS_VERSION]: {
        description: ['EXPORT_AND_OVERWRITE_PREVIOUS_VERSION.....'],
        files: [],
      },
      [APPEND_MODIFIED_TARGET_WITH_NOTE_AND_NEW_SOURCE]: {
        description: ['APPEND_MODIFIED_TARGET_WITH_NOTE_AND_NEW_SOURCE.....'],
        files: [],
      },
      [RE_EXPORT_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION]: {
        description: ['RE_EXPORT_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION.....'],
        files: [],
      },
      [RE_EXPORT_RENAMED_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION]: {
        description: ['RE_EXPORT_RENAMED_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION.....'],
        files: [],
      },
      [RE_EXPORT_SOURCE_NEW_EXTENSION_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION_AND_EXTENSION]: {
        description: ['RE_EXPORT_SOURCE_NEW_EXTENSION_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION_AND_EXTENSION.....'],
        files: [],
      },
      [DELETE_TARGET_FILE]: {
        description: ['DELETE_TARGET_FILE.....'],
        files: [],
      },
      [RENAME_TARGET_FILE]: {
        description: ['RENAME_TARGET_FILE.....'],
        files: [],
      },
      [APPEND_MODIFIED_TARGET_WITH_NOTE_ON_SOURCE_DELETION]: {
        description: ['APPEND_MODIFIED_TARGET_WITH_NOTE_ON_SOURCE_DELETION.....'],
        files: [],
      },
      [RENAME_MODIFIED_TARGET_FILE_WITH_NOTE_ON_RENAME]: {
        description: ['RENAME_MODIFIED_TARGET_FILE_WITH_NOTE_ON_RENAME.....'],
        files: [],
      },
      [UPDATE_EXTENSION_ON_MODIFIED_TARGET_FILE_WITH_NOTE_ON_EXTENSION_CHANGE]: {
        description: ['UPDATE_EXTENSION_ON_MODIFIED_TARGET_FILE_WITH_NOTE_ON_EXTENSION_CHANGE.....'],
        files: [],
      },
      [EXPORT_FILE]: {
        description: ['EXPORT_FILE.....'],
        files: [],
      },
      [UPDATE_EXTENSION_ON_TARGET_FILE]: {
        description: ['UPDATE_EXTENSION_ON_TARGET_FILE.....'],
        files: [],
      },
    };
  }

  async init() {
    this.getFileOutcomes();

    await this.startFileExport();
  }

  async startFileExport() {
    return Object.keys(this.fileOutcomes).reduce(async (promise ,outcome) => {
      await promise;
      const files = this.fileOutcomes[outcome].files;

      if (files.length) {
        switch (parseInt(outcome)) {
          case DO_NOT_EXPORT: // MN DD
            return await this.fileExporter.updateFileReferenceInCurationLog({files, outcome });

          case DO_NOT_EXPORT_AND_BLOCK_FUTURE_EXPORTS: // DN
            return await this.fileExporter.addFilesToDoNotExportList({files, outcome });

          case EXPORT_AND_OVERWRITE_PREVIOUS_VERSION: // NM
            return await this.fileExporter.exportAndOverwrite({ files, outcome });

          case APPEND_MODIFIED_TARGET_WITH_NOTE_AND_NEW_SOURCE:
            return await this.fileExporter.exportAndAppendModifiedSource({files, outcome });

          case RE_EXPORT_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION:
            return await this.fileExporter.exportModifiedSourceWithNoteOnTargetDeletion({files, outcome });

          case DELETE_TARGET_FILE:
            return await this.fileExporter.deleteTargetFile({ files, outcome });

          case RENAME_TARGET_FILE:
            return await this.fileExporter.renameTargetFile({ files, outcome });

          case APPEND_MODIFIED_TARGET_WITH_NOTE_ON_SOURCE_DELETION:
            return await this.fileExporter.appendModifiedTargetWithNoteOnDeletion({ files, outcome });
          case RENAME_MODIFIED_TARGET_FILE_WITH_NOTE_ON_RENAME:
            return await this.fileExporter.renameModifiedTargetWithNoteOnDeletion({ files, outcome });
          case EXPORT_FILE:
            return await this.fileExporter.exportFile({ files, outcome });
          default:
           // throw new Error('NO OUTCOME FOUND');
        }
      }
    });
  }

  getFileStatus({
    targetFilePath, sourceFilePath, isSourceFilePath, filePath,
  }) {
    let targetStatus = get(this.targetDiffList, targetFilePath, NO_CHANGE);
    let sourceStatus = get(this.sourceDiffList, sourceFilePath, NO_CHANGE).split(',')[0]; // support for renames
    const sourceAndTargetDiffStatus = get(this.targetAndSourceDiffList, filePath, NO_CHANGE);
    const isRenamedStatus = status => status[0] === RENAMED;
    let renameWithPercent = '';


    if (isRenamedStatus(sourceStatus)) {
      renameWithPercent = sourceStatus;
      sourceStatus = RENAMED;
    }

    if ((targetStatus === NO_CHANGE) && (sourceStatus === NO_CHANGE)) {
      // use the status from the master diff which compares the directories of the target & source repo
      // list bc change is not reflected in the sha's used for target & source diff lists
      if (isSourceFilePath) {
        sourceStatus = sourceAndTargetDiffStatus;
      } else {
        targetStatus = sourceAndTargetDiffStatus;
      }
    }

    return {
      sourceStatus,
      targetStatus,
      renameWithPercent
    };
  }

  getFileOutcomes() {
    Object.keys(this.targetAndSourceDiffList).forEach((filePath) => {
      const {
        baseFilePath,
        renamedBaseFilePath,
        sourceFilePath,
        targetFilePath,
        isSourceFilePath,
        renamedFilePath,
      } = this.fileExporter.getFilePathOptions({ filePath , sourceDiffList: this.sourceDiffList });

      const { sourceStatus, targetStatus , renameWithPercent } = this.getFileStatus({ targetFilePath, sourceFilePath, isSourceFilePath, filePath });
      const statusScenario = STATUS_SCENARIOS[`${targetStatus}${sourceStatus}`];

      if (this.fileOutcomes[statusScenario]) {
        if (renamedFilePath) {
          const oldAndRenamedFile = `${renameWithPercent},${baseFilePath},${renamedBaseFilePath}`;

          this.fileOutcomes[statusScenario].files.push(oldAndRenamedFile);
        } else {
          this.fileOutcomes[statusScenario].files.push(baseFilePath);
        }
      } else {
        throw new Error(`UNSUPPORTED_SCENARIO: statusScenario is ${statusScenario} for file ${filePath}`);
      }
    });

    console.info('FILE_OUTCOMES: ', this.fileOutcomes);
    return this.fileOutcomes;
  }
}

module.exports = {
  FileOutcomeManager,
};
