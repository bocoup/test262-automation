const readline = require('readline');
const multimatch = require('multimatch');
const { Readable } = require('stream');
const get = require('lodash.get');


const {
  FILE_OUTCOMES, STATUS_SCENARIOS, FILE_STATUSES: {
    RENAMED, UNKNOWN, UNMERGED, ADDED, DELETED, FILE_TYPE_CHANGE, NO_CHANGE,
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
    return this.getFileOutcomes();
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
          const { sourceFilePath, renamedFilePath } = this.getFilePathOptions({ filePath });

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
    let [status, pathA, pathB] = diffInfoStr.split(String.fromCharCode(9));

    // add full directory path
    pathA = `${directoryPath}/${pathA}`;

    if (pathB) {
      pathB = `${directoryPath}/${pathB}`;
    }

    return {
      status,
      pathA,
      pathB,
    };
  }

  filterDiffList({
    includes, excludes, pathA, pathB, errorStatuses, status,
  }) {
    const negatedExcludes = excludes.map(exclusionPattern => `!${exclusionPattern}`);
    let shouldIncludePath = false;

    console.debug('^^^^^ includes', includes);
    console.debug('^^^^^^negatedExcludes', negatedExcludes);

    const paths = pathB ? [pathA, pathB] : [pathA];

    console.debug('status', status);
    console.debug('paths', paths);

    if (multimatch(paths, includes.concat(negatedExcludes)).length) {
      const invalidStatus = errorStatuses.some(errorStatus => status === errorStatus);

      if (invalidStatus) {
        throw `INVALID_STATUS: ${status} is an invalid status for paths ${pathA} ${pathB}`;
      }

      shouldIncludePath = true;
    }

    console.debug('shouldIncludePath', shouldIncludePath);
    return shouldIncludePath;
  }

  async createDiffListObj({
    diffList, excludes, includes, directoryPath, errorStatuses,
  }) {
    return new Promise((resolve, reject) => {
      const read = readline.createInterface({
        input: this.createReadStream(diffList),
        crlfDelay: Infinity,
      });

      const diffListObj = {};

      read.on('line', (line) => {
        const diffInfoStr = String(line);

        const { status, pathA, pathB } = this.getStatusAndPaths({ diffInfoStr, directoryPath });

        const filterOptions = {
          status,
          includes,
          excludes,
          pathA,
          pathB,
          errorStatuses,
        };

        if (this.filterDiffList(filterOptions)) {
          if (status[0] === RENAMED) {
            // old file name as key
            // state, and new file name as value
            diffListObj[pathA] = `${status},${pathB}`;
          } else {
            diffListObj[pathA] = status;
          }
        }
      });

      read.on('error', (error) => {
        console.error('ERROR', error);
        reject(error);
      });

      read.on('close', () => {
        console.debug('diffListObj', diffListObj);
        resolve(diffListObj);
      });
    });
  }

  createReadStream(data) {
    const stream = new Readable({ read() {} });
    stream.push(data);
    stream.push(null);

    return stream;
  }

  getFileStatus({
    targetFilePath, sourceFilePath, isSourceFilePath, filePath,
  }) {
    let targetStatus = get(this.targetDiffListObj, targetFilePath, NO_CHANGE);
    let sourceStatus = get(this.sourceDiffListObj, sourceFilePath, NO_CHANGE).split(',')[0]; // support for renames
    const sourceAndTargetDiffStatus = get(this.targetAndSourceDiffListObj, filePath, NO_CHANGE).split(',')[0];
    const isRenamedStatus = status => status[0] === RENAMED;
    let renameWithPercent = '';

    if ((targetStatus === NO_CHANGE) && (sourceStatus === NO_CHANGE)) {
      // use the status from the master diff which compares the directories of the target & source repo
      // list bc change is not reflected in the sha's used for target & source diff lists
      if (isSourceFilePath) {
        sourceStatus = sourceAndTargetDiffStatus;
      } else {
        targetStatus = sourceAndTargetDiffStatus;
      }
    }

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

  getFileOutcomes() {
    Object.keys(this.targetAndSourceDiffListObj).forEach((filePath) => {
      const {
        baseFilePath, renamedBaseFilePath, sourceFilePath, targetFilePath, isSourceFilePath, renamedFilePath,
      } = this.getFilePathOptions({ filePath });

      const { sourceStatus, targetStatus, renameWithPercent } = this.getFileStatus({
        targetFilePath, sourceFilePath, isSourceFilePath, filePath,
      });
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

    console.debug('FILE_OUTCOMES: ', this.fileOutcomes);
    return this.fileOutcomes;
  }
}


module.exports = { FileStatusManager };
