const debug = require('debug')('test262-automation:log');
const multimatch = require('multimatch');
const get = require('lodash.get');
const path = require('path');
const {
  spawn
} = require('child_process');

const {
  FILE_OUTCOMES,
  STATUS_SCENARIOS,
  FILE_STATUSES: {
    RENAMED,
    UNKNOWN,
    UNMERGED,
    ADDED,
    DELETED,
    FILE_TYPE_CHANGE,
    NO_CHANGE,
    MODIFIED
  },
} = require('./constants.js');

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

const SOURCE_ERROR_STATUS = [UNMERGED, UNKNOWN];
const TARGET_ERROR_STATUS = [...SOURCE_ERROR_STATUS, ADDED, FILE_TYPE_CHANGE, RENAMED];

class FileStatusManager {

  constructor(params) {
    this.tempDirPath = params.tempDirPath;
    this.targetDiffList = params.targetDiffList;
    this.sourceDiffList = params.sourceDiffList;
    this.targetAndSourceDiff = params.targetAndSourceDiff;
    this.targetRootDir = params.targetRootDir;
    this.sourceRootDir = params.sourceRootDir;
    this.sourceDirectory = params.sourceDirectory;
    this.targetDirectory = params.targetDirectory;
    this.sourceExcludes = params.sourceExcludes;
    this.targetRevisionAtLastExport = params.targetRevisionAtLastExport;
    this.curationLogsPath = params.curationLogsPath;
    this.ignoredMaintainers = params.ignoredMaintainers;
    this.targetDirectoryPattern = `${this.targetDirectory}/**`;
    this.sourceDirectoryPattern = `${this.sourceDirectory}/**`;
    this.fileOutcomes = { // TODO make a func to generate this
      [DO_NOT_EXPORT]: {
        files: [],
      },
      [DO_NOT_EXPORT_AND_BLOCK_FUTURE_EXPORTS]: {
        files: [],
      },
      [EXPORT_AND_OVERWRITE_PREVIOUS_VERSION]: {
        files: [],
      },
      [APPEND_MODIFIED_TARGET_WITH_NOTE_AND_NEW_SOURCE]: {
        files: [],
      },
      [RE_EXPORT_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION]: {
        files: [],
      },
      [RE_EXPORT_RENAMED_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION]: {
        files: [],
      },
      [RE_EXPORT_SOURCE_NEW_EXTENSION_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION_AND_EXTENSION]: {
        files: [],
      },
      [DELETE_TARGET_FILE]: {
        files: [],
      },
      [RENAME_TARGET_FILE]: {
        files: [],
      },
      [APPEND_MODIFIED_TARGET_WITH_NOTE_ON_SOURCE_DELETION]: {
        files: [],
      },
      [RENAME_MODIFIED_TARGET_FILE_WITH_NOTE_ON_RENAME]: {
        files: [],
      },
      [UPDATE_EXTENSION_ON_MODIFIED_TARGET_FILE_WITH_NOTE_ON_EXTENSION_CHANGE]: {
        files: [],
      },
      [EXPORT_FILE]: {
        files: [],
      },
      [UPDATE_EXTENSION_ON_TARGET_FILE]: {
        files: [],
      },
    };
  }

  async init() {
    this.targetDiffListObj = await this.createDiffListObj({
      diffList: this.targetDiffList,
      includes: [this.targetDirectoryPattern],
      directoryPath: this.targetRootDir,
      excludes: [],
      errorStatuses: TARGET_ERROR_STATUS,
    });

    this.sourceDiffListObj = await this.createDiffListObj({
      diffList: this.sourceDiffList,
      includes: [this.sourceDirectoryPattern],
      directoryPath: this.sourceRootDir,
      excludes: [],
      errorStatuses: SOURCE_ERROR_STATUS,
    });

    this.targetAndSourceDiffListObj = await this.createDiffListObj({
      diffList: this.targetAndSourceDiff,
      includes: [this.targetDirectoryPattern, this.sourceDirectoryPattern],
      directoryPath: this.tempDirPath,
      excludes: this.sourceExcludes.paths,
      errorStatuses: [],
    });

    this.updateMasterList();

    return await this.getFileOutcomes();
  }

  isSourceFilePath(path) {
    return path.includes(this.sourceDirectory);
  }

  trimFilePath(path) {
    return this.isSourceFilePath(path) ? path.slice(this.sourceDirectory.length, path.length) : path.slice(this.targetDirectory.length, path.length);
  }

  updateMasterList() {
    const targetHasDeletedFiles = Object.values(this.targetDiffListObj).some(status => status === DELETED);

    if (targetHasDeletedFiles) {
      Object.keys(this.targetDiffListObj).forEach((filePath) => {
        if (this.targetDiffListObj[filePath] === DELETED) { // TODO lodash filter?
          const {
            sourceFilePath,
            renamedFilePath
          } = this.getFilePathOptions({
            filePath
          });

          const sourceStatus = get(this.sourceDiffListObj, sourceFilePath, NO_CHANGE).split(',')[0];

          if (sourceStatus === DELETED) {
            this.targetAndSourceDiffListObj[sourceFilePath] = DELETED;
          }

          if (sourceStatus[0] === RENAMED) {
            delete this.targetAndSourceDiffListObj[renamedFilePath];
            this.targetAndSourceDiffListObj[sourceFilePath] = RENAMED;
          }
        }
      });
    }
  }

  getFilePathOptions({ filePath }) {
    const baseFilePath = this.trimFilePath(filePath);
    const sourceFilePath = `${this.sourceDirectory}${baseFilePath}`;
    const targetFilePath = `${this.targetDirectory}${baseFilePath}`;
    const renamedFilePath = get(this.sourceDiffListObj, sourceFilePath, '').split(',')[1];

    return {
      isSourceFilePath: this.isSourceFilePath(filePath),
      sourceFilePath,
      targetFilePath,
      renamedFilePath,
      baseFilePath,
      renamedBaseFilePath: renamedFilePath ? this.trimFilePath(renamedFilePath) : '',
    };
  }

  getStatusAndPaths({ diffInfoStr, directoryPath }) {
    let [status, pathA, pathB] = diffInfoStr.split('\t');

    // add full directory path
    pathA = path.join(directoryPath, pathA);

    if (pathB) {
      pathB = path.join(directoryPath, pathB);
    }

    return {
      status,
      pathA,
      pathB,
    };
  }

  async filterDiffList({
    includes, excludes, pathA, pathB, errorStatuses, status,
  }) {
    const negatedExcludes = excludes.map(exclusionPattern => `!${exclusionPattern}`);
    let shouldIncludePath = false;

    const paths = pathB ? [pathA, pathB] : [pathA];

    if (multimatch(paths, includes.concat(negatedExcludes)).length) {
      const invalidStatus = errorStatuses.some(errorStatus => status === errorStatus);
      const invalidStatusMessage = `INVALID_STATUS: ${status} is an invalid status for paths ${pathA} ${pathB}`;
      let hasFileModifiedViaCuration = false;
      shouldIncludePath = true;

      if (invalidStatus) {

        if ((status === ADDED || status === RENAMED) && !this.isSourceFilePath(pathA)) {

          hasFileModifiedViaCuration = await this.fileModifiedViaCuration({
            since: this.targetRevisionAtLastExport,
            directory: this.targetDirectory,
            filename: this.trimFilePath(pathA)
          });

          if (hasFileModifiedViaCuration) {
            throw invalidStatusMessage
          }

          return shouldIncludePath
        }

        throw invalidStatusMessage;
      }
    }
    debug(`shouldIncludePath ? ${shouldIncludePath} ${paths}`);

    return shouldIncludePath;
  }

  log(params) {
    const {
      options,
      directory: cwd
    } = params;
    let logData = '';

    return new Promise((resolve, reject) => {
      const log = spawn('git', ['log', ...options], {
        cwd
      });

      log.stdout.on('data', (data) => {
        logData += String(data);
      });

      let errorHandler = error => reject(error);
      process.once('error', errorHandler);

      log.on('exit', () => {
        process.removeListener('error', errorHandler);
        resolve(logData);
      });
    });
  }

  // Returns a promise that resolves with true if the file has been
  // modified since the `commit` or false if it has not. An optional
  // list of ignoredMaintainers can be provided to ignore commits
  // from those maintainers.
  async fileModifiedViaCuration({ since, directory, filename, }) {
    const ignoredMaintainers = this.ignoredMaintainers || [];
    const history = await this.log({
      directory,
      options: ['--format=%an', `${since}...master`, `.${filename}`],
    });

    const maintainers = new Set(history.split('\n').filter(Boolean));
    ignoredMaintainers.forEach(maintainer => {
      maintainers.delete(maintainer);
    });

    return !!maintainers.size;
  }

  async createDiffListObj({ diffList, excludes, includes, directoryPath, errorStatuses, }) {
    const diffListObj = {};

    const diffListArray = diffList.split(/\r?\n/).filter(item => item.trim());

    for (const diffInfoStr of diffListArray) {
      const {
        status,
        pathA,
        pathB
      } = this.getStatusAndPaths({
        diffInfoStr,
        directoryPath
      });

      const filterOptions = {
        status,
        includes,
        excludes,
        pathA,
        pathB,
        errorStatuses,
      };

      if (await this.filterDiffList(filterOptions)) {
        if (status[0] === RENAMED) {
          // old file name as key
          // state, and new file name as value
          diffListObj[pathA] = `${status},${pathB}`;
        } else {
          diffListObj[pathA] = status;
        }
      }
    }
    return diffListObj;
  }

  getFileStatus({ targetFilePath, sourceFilePath, }) {
    let targetStatus = get(this.targetDiffListObj, targetFilePath, NO_CHANGE);
    let sourceStatus = get(this.sourceDiffListObj, sourceFilePath, NO_CHANGE).split(',')[0]; // support for renames
    const isRenamedStatus = status => status[0] === RENAMED;
    let renameWithPercent = '';

    if (isRenamedStatus(sourceStatus)) {
      renameWithPercent = sourceStatus;
      sourceStatus = RENAMED;
    }

    return {
      sourceStatus,
      targetStatus,
      renameWithPercent,
    };
  }

  async getFileOutcomes() {

    for (const filePath of Object.keys(this.targetAndSourceDiffListObj)) {

      const {
        baseFilePath,
        renamedBaseFilePath,
        sourceFilePath,
        targetFilePath,
        renamedFilePath,
      } = this.getFilePathOptions({
        filePath
      });

      const {
        sourceStatus,
        targetStatus,
        renameWithPercent
      } = this.getFileStatus({
        targetFilePath,
        sourceFilePath,
      });

      if ((targetStatus === NO_CHANGE) && (sourceStatus === NO_CHANGE)) {
        // we can safely ignore these changes since the changes we care about are handled by this.updateMaster
        continue;
      }

      if ((targetStatus === ADDED || targetStatus === RENAMED) && (sourceStatus === NO_CHANGE)) {
        // we can safely ignore this bc we validated that the automation user added these files in a previous step
        continue;
      }

      if ((targetStatus === MODIFIED) && (sourceStatus === NO_CHANGE)) {
        // confirm that modifications were from the automation user
        const fileModifiedByAutomationUser = await this.fileModifiedViaCuration({
          since: this.targetRevisionAtLastExport,
          directory: this.targetDirectory,
          filename: baseFilePath
        });

        if (fileModifiedByAutomationUser) {
          continue;
        }
      }

      const statusScenario = STATUS_SCENARIOS[`${targetStatus}${sourceStatus}`];

      if (this.fileOutcomes[statusScenario]) {
        if (renamedFilePath) {
          const oldAndRenamedFile = `${renameWithPercent},${baseFilePath},${renamedBaseFilePath}`;

          this.fileOutcomes[statusScenario].files.push(oldAndRenamedFile);
        } else {
          this.fileOutcomes[statusScenario].files.push(baseFilePath);
        }
      } else {
        console.log(`UNSUPPORTED_SCENARIO: statusScenario is ${statusScenario} for file ${filePath}`);
      }
    }
    debug('FILE_OUTCOMES: ', this.fileOutcomes);
    return this.fileOutcomes;
  }
}


module.exports = {
  FileStatusManager
};
