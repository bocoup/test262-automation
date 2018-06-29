const util = require('util');
const os = require('os');
const fs = require('fs');

const fsPromises = fs.promises;
const path = require('path');
const makeDir = require('make-dir');
const { exec, spawn } = require('child_process');
const get = require('lodash.get');
const { Readable } = require('stream');
const readline = require('readline');
const multimatch = require('multimatch');

const SOURCE_ERROR_STATUS = ['U', 'X'];
const TARGET_ERROR_STATUS = ['U', 'X', 'A', 'T', 'R'];


const { FILE_STATUSES: { RENAMED } } = require('./constants.js');

const execCmd = util.promisify(exec);


class GitUtil {
  constructor(config) {
    this.tempDirPath = null;
    this.targetRootDir = null;
    this.sourceRootDir = null;

    this.newBranchNameForMerge = config.newBranchNameForMerge;
    this.timestampForExport = Date.now(); // TODO add some uniq hash as as well... maybe commit sha;

    this.targetSubDirectory = config.targetSubDirectory;
    this.targetRevisionAtLastExport = config.targetRevisionAtLastExport;
    this.targetDirName = config.targetSubDirectory.split('/')[0];
    this.targetGit = config.targetGit;
    this.targetBranch = config.targetBranch;

    this.sourceSubDirectory = config.sourceSubDirectory;
    this.sourceRevisionAtLastExport = config.sourceRevisionAtLastExport;
    this.sourceDirName = config.sourceSubDirectory.split('/')[0];
    this.sourceExcludes = {
      paths: get(config.sourceExcludes, 'paths', []),
    };
    this.sourceGit = config.sourceGit;
    this.sourceBranch = config.sourceBranch;

    this.t262GithubOrg = config.t262GithubOrg;
    this.t262GitRemote = config.t262GitRemote;
  }

  init() {
    return new Promise(async (resolve, reject) => {
      console.info('Initializing clone');
      const newTempDir = await fsPromises.mkdtemp('./' + os.tmpdir());

      process.chdir(newTempDir);
      this.tempDirPath = process.cwd();

      console.info(
        `Switched to newly created temp dir: ${this.tempDirPath}`,
      );

      const pathToPreviousClone = path.join(
        this.tempDirPath,
        this.targetDirName,
      );

      this._cleanIfDirectoryExists(pathToPreviousClone);

      this.targetRootDir = await this.clone({
        gitRemote: this.targetGit,
        branch: this.targetBranch,
        dirName: this.targetDirName,
      });

      this.sourceRootDir = await this.clone({
        gitRemote: this.sourceGit,
        branch: this.sourceBranch,
        dirName: this.sourceDirName,
      });

      const branchPostFix = process.NODE_ENV === 'DEBUG' ? this.timestampForExport : this.targetRevisionAtLastExport;
      this.targetBranch = `${this.newBranchNameForMerge}-${branchPostFix}`;

      await this.checkoutBranch({
        branch: `${this.newBranchNameForMerge}-${branchPostFix}`,
        cwd: this.targetRootDir,
      });

      await this.checkoutBranch({
        branch: `${this.newBranchNameForMerge}-${branchPostFix}`,
        cwd: this.sourceRootDir,
      });

      // Set the full path to the target and source subdirectories
      this.targetDirectory = `${this.tempDirPath}/${
        this.targetSubDirectory
      }`;
      this.sourceDirectory = `${this.tempDirPath}/${
        this.sourceSubDirectory
      }`;

      console.log(this);
      // add target dir if not there
      const targetSubDirectoryExists = await this._checkIfDirectoryExists(this.targetDirectory);

      if (!targetSubDirectoryExists) {
        console.debug('targetSubDirectoryExists', targetSubDirectoryExists);

        process.chdir(this.targetRootDir);

        console.info(`Switched to target cwd...${process.cwd()}`);

        await this._createDirectory(this.targetDirectory);
      }

      this._addTempPathToSubDirectoryExcludes(this.sourceExcludes.paths);

      process.chdir(this.tempDirPath);

      resolve(this);
    });
  }

  _addTempPathToSubDirectoryExcludes(paths = []) {
    this.sourceExcludes.paths = paths.map(path => `${this.sourceDirectory}/${path}`);
  }

  _checkIfDirectoryExists(path) {
    return new Promise(async (resolve, reject) => {
      try {
        await fsPromises.open(path, 'r').then(() => {
          console.info('Dir exists @', path);
          resolve(true);
        });
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.info('Dir does not exist...creating new dir');
          resolve(false);
        }
        reject(err);
      }
    });
  }

  _createDirectory(path) {
    return new Promise(async (resolve, reject) => {
      try {
        const dir = await makeDir(path);

        console.log('made it', dir);
        resolve(dir);
      } catch (e) {
        reject(e);
      }
    });
  }

  async _cleanIfDirectoryExists(path) {
    try {
      await fsPromises.open(path, 'r').then(() => {
        this._clean();
      });
    } catch (err) {
      if (err.code === 'ENOENT') {
        return;
      }

      // throw bc unexpected error
      throw err;
    }
  }

  async _clean(path) {

    await execCmd(`rm -rf ${path}`).then((stdout) => {
      console.info('Removing previous clone...', path);
      console.log(stdout);
    });
  }

  clone(params) {
    const { gitRemote, branch, dirName } = params;

    return new Promise((resolve, reject) => {
      console.info(`Starting clone of ${gitRemote}...`);

      // TODO add support for cloning into . dirName
      // TODO add options to support local dev for setting depth
      const clone = spawn(
        'travis_wait',
        [
          '200',
          'git',
          'clone',
          '--single-branch',
          `--branch=${branch}`,
          gitRemote,
        ],
        { stdio: 'inherit' },
      );

      process.stderr.on('error', (data) => {
        console.error(`stderr: ${data}`);
        reject();
      });

      clone.on('exit', () => {
        console.info(`Completed clone of ${gitRemote}`);
        resolve(path.join(process.cwd(), dirName));
      });
    });
  }

  checkoutBranch(params) {
    const { branch, cwd } = params;

    return new Promise((resolve, reject) => {
      process.chdir(cwd);
      console.info(`Switched to cwd of ${cwd}`);

      const clone = spawn('git', ['checkout', '-b', branch], {
        stdio: 'inherit',
      });

      process.stderr.on('error', (data) => {
        console.error(`stderr: ${data}`);
        reject();
      });

      clone.on('exit', () => {
        console.info(
          `Checkout out new branch ${branch} in ${process.cwd()}`,
        );
        resolve(this);
      });
    });
  }

  diff(params) {
    // TODO handle for if directory does not exist
    const { options, directory } = params;
    let diffData = '';

    process.chdir(directory);

    console.info('CURRENT DIRECTORY', process.cwd());

    return new Promise((resolve, reject) => {
      const diff = spawn('git', ['diff', ...options]);

      diff.stdout.on('data', (data) => {
        console.debug('%%%%%%%%%%% CALLED DATA');
        diffData += String(data);
      });

      diff.stderr.on('error', (error) => {
        console.error(`stderr: ${error}`);
        reject(error);
      });

      diff.on('exit', () => {
        console.info(`Git diff list piped for ${options}`);
        // console.log('diffData', diffData);
        resolve(diffData);
      });
    });
  }

  log(params) {
    // TODO handle for if directory does not exist
    const { options, directory } = params;
    let diffData = '';

    process.chdir(directory);

    return new Promise((resolve, reject) => {
      const diff = spawn('git', ['log', ...options]);

      diff.stdout.on('data', (data) => {
        diffData += String(data);
      });

      diff.stderr.on('error', (error) => {
        reject(error);
      });

      diff.on('exit', () => {
        resolve(diffData);
      });
    });
  }

  // Returns a promise that resolves with true if the file has been
  // modified since the `commit` or false if it has not. An optional
  // list of ignoredMaintainers can be provided to ignore commits
  // from those maintainers.
  async fileHasBeenModified({
    since, directory, filename, ignoredMaintainers = [],
  }) {
    const history = await this.log({
      directory,
      options: ['--format=%cn', `${since}...master`, '--', filename],
    });

    const maintainers = new Set(history.split('\n').filter(Boolean));
    ignoredMaintainers.forEach((maintainer) => {
      maintainers.delete(maintainer);
    });

    return !!maintainers.size;
  }

  createReadStream(data) {
    const stream = new Readable({ read() {} });
    stream.push(data);
    stream.push(null);

    return stream;
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

  filterDiffList(params) {
    const {
      includes, excludes, pathA, pathB, errorStatuses, status,
    } = params;

    console.debug('INCOMING excludes', excludes);

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

  createDiffListObj(params) {
    const {
      diffList, excludes, includes, directoryPath, errorStatuses,
    } = params;

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
        console.debug('IN READ CLOSE ######');
        console.debug('diffListObj', diffListObj);
        resolve(diffListObj);
      });
    });
  }

  async addTargetChanges() {
    await execCmd(`git add ${this.targetDirectory}`);
    console.info('Added changes in target directory...', this.targetDirectory);
  }

  async commit() {
    const commitMessage = `[IMPLEMENTATION-PREFIX] changes from source at sha ${this.sourceRevisionAtLastExport} on ${this.timestampForExport}`;
    await execCmd(`git commit -m "${commitMessage}"`);
    console.info('Commited changes with message....', commitMessage);
  }

  async addRemote() {
    await execCmd(`git remote add ${this.t262GithubOrg} ${this.t262GitRemote}`);
    console.info('Added remote of remote....', this.t262GitRemote);
  }

  async pushRemoteBranch() {
    await execCmd(`git push ${this.t262GithubOrg} ${this.targetBranch}`);
    console.info('Pushing to remote branch ....', this.targetBranch);
  }

  async commitAndPushRemoteBranch() {
    process.chdir(this.targetRootDir);
    await this.addTargetChanges();
    await this.commit();
    await this.addRemote();
    await this.pushRemoteBranch();

    return this.targetBranch;
  }
}

module.exports = {
  GitUtil,
  SOURCE_ERROR_STATUS,
  TARGET_ERROR_STATUS,
};
