const readline = require('readline');
const multimatch = require('multimatch');
const { Readable } = require('stream');
const get = require('lodash.get');
const { spawn } = require('child_process');
const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);

const {
  FILE_OUTCOMES,
  STATUS_SCENARIOS,
  FILE_STATUSES: {
    RENAMED, UNKNOWN, UNMERGED, ADDED, DELETED, FILE_TYPE_CHANGE, NO_CHANGE,
  },
  CURATION_LOG_FILE_STATUSES: {
    DELETED_IN_TARGET
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
    this.curatedFiled = null;
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
    this.curationLogData = await this.getCuratedFilesFromCurationLog();

    this.targetDiffListObj = await this.createDiffListObj({
      diffList: this.targetDiffList,
      includes: [this.targetDirectoryPattern],
      directoryPath: this.targetRootDir,
      excludes: [],
      errorStatuses: TARGET_ERROR_STATUS,
    });

    console.log('targetDiffListObj', this.targetDiffListObj);

    this.sourceDiffListObj = await this.createDiffListObj({
      diffList: this.sourceDiffList,
      includes: [this.sourceDirectoryPattern],
      directoryPath: this.sourceRootDir,
      excludes: [],
      errorStatuses: SOURCE_ERROR_STATUS,
    });

    console.log('sourceDiffListObj', this.sourceDiffListObj);

    this.targetAndSourceDiffListObj = await this.createDiffListObj({
      diffList: this.targetAndSourceDiff,
      includes: [this.targetDirectoryPattern, this.sourceDirectoryPattern],
      directoryPath: this.tempDirPath,
      excludes: this.sourceExcludes.paths,
      errorStatuses: [],
    });

    console.log('before targetAndSourceDiffListObj', this.targetAndSourceDiffListObj);

    this.updateMasterList();

    console.log('after targetAndSourceDiffListObj', this.targetAndSourceDiffListObj);

    return this.getFileOutcomes();
  }

  async getCuratedFilesFromCurationLog() {
    const curationLog = await readFile(this.curationLogsPath);
    return JSON.parse(curationLog);
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

    // remove files which have already been shipped

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

  async filterDiffList({
    includes, excludes, pathA, pathB, errorStatuses, status,
  }) {
    const negatedExcludes = excludes.map(exclusionPattern => `!${exclusionPattern}`);
    let shouldIncludePath = false;

    const paths = pathB ? [pathA, pathB] : [pathA];

    if (multimatch(paths, includes.concat(negatedExcludes)).length) {
      const invalidStatus = errorStatuses.some(errorStatus => status === errorStatus);
      const invalidStatusMessage = `INVALID_STATUS: ${status} is an invalid status for paths ${pathA} ${pathB}`;
      let fileHasBeenModifiedOrAddedByTargetCurators = false;
      shouldIncludePath = true;

      if (invalidStatus) {

        if((status === ADDED || status === RENAMED) && !this.isSourceFilePath(pathA)) {

          fileHasBeenModifiedOrAddedByTargetCurators = await this.fileHasBeenModifiedOrAddedByTargetCurators({
            since: this.targetRevisionAtLastExport,
            directory: this.targetDirectory,
            filename: this.trimFilePath(pathA)
          });

          if(fileHasBeenModifiedOrAddedByTargetCurators) {
            throw invalidStatusMessage
          }

          return shouldIncludePath
        }

        throw invalidStatusMessage;
      }
    }
    console.debug(`shouldIncludePath ? ${shouldIncludePath} ${paths}`);

    return shouldIncludePath;
  }

  log(params) {
    const { options, directory } = params;
    let logData = '';

    return new Promise((resolve, reject) => {
      const log = spawn('git', ['log', ...options], { cwd: directory });

      log.stdout.on('data', (data) => {
        logData += String(data);
      });

      process.on('error', (error) => {
        reject(error);
      });

      log.on('exit', () => {
        resolve(logData);
      });
    });
  }

  // Returns a promise that resolves with true if the file has been
  // modified since the `commit` or false if it has not. An optional
  // list of ignoredMaintainers can be provided to ignore commits
  // from those maintainers.
  async fileHasBeenModifiedOrAddedByTargetCurators({ since, directory, filename, }) {
    const ignoredMaintainers = this.ignoredMaintainers || [];
    const history = await this.log({
      directory,
      options: ['--format=%an', `${since}...master`, `.${filename}`],
    });

    const maintainers = new Set(history.split('\n').filter(Boolean));
    console.log('ignoredMaintainers', this.ignoredMaintainers);
    console.log('maintainers', maintainers);

    ignoredMaintainers.forEach(maintainer => {
      maintainers.delete(maintainer);
    });
    console.log('maintainers', maintainers);

    return !!maintainers.size;
  }

  async createDiffListObj({
    diffList, excludes, includes, directoryPath, errorStatuses,
  }) {
    return new Promise(async (resolve, reject) => {
      const read = readline.createInterface({
        input: this.createReadStream(diffList),
        crlfDelay: Infinity,
      });

      const diffListObj = {};

      read.on('line', async (line) => {
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

        if (await this.filterDiffList(filterOptions)) {
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

  getFileOutcomes() {
    Object.keys(this.targetAndSourceDiffListObj).forEach((filePath) => {
      const {
        baseFilePath, renamedBaseFilePath, sourceFilePath, targetFilePath, renamedFilePath,
      } = this.getFilePathOptions({ filePath });

      const { sourceStatus, targetStatus, renameWithPercent } = this.getFileStatus({ targetFilePath, sourceFilePath, });

      if ((targetStatus === NO_CHANGE) && (sourceStatus === NO_CHANGE)) {
        // we can safely ignore these changes
        return;
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
        throw new Error(`UNSUPPORTED_SCENARIO: statusScenario is ${statusScenario} for file ${filePath}`);
      }
    });

    console.debug('FILE_OUTCOMES: ', this.fileOutcomes);
    return this.fileOutcomes;
  }
}


module.exports = { FileStatusManager };
