const util = require('util');
const os = require('os');
const fs = require('fs');

const fsPromises = fs.promises;
const path = require('path');
const makeDir = require('make-dir');
const { exec, spawn } = require('child_process');
const get = require('lodash.get');
const pick = require('lodash.pick');

const {
  FILE_STATUSES: {
    RENAMED, UNKNOWN, UNMERGED, ADDED, FILE_TYPE_CHANGE,
  }, NODE_ENV: { DEBUG },
} = require('./constants.js');

const SOURCE_ERROR_STATUS = [UNMERGED, UNKNOWN];
const TARGET_ERROR_STATUS = [...SOURCE_ERROR_STATUS, ADDED, FILE_TYPE_CHANGE, RENAMED];

const execCmd = util.promisify(exec);

class GitUtil {
  constructor(config) {
    this.tempDirPath = null;
    this.targetRootDir = null;
    this.sourceRootDir = null;
    this.targetBranch = null;
    this.targetRevisionAtLastExport = null;
    this.sourceRevisionAtLastExport = null;

    this.implementerName = config.implementerName;
    this.curationLogsPath = config.curationLogsPath; // this gets updated with the full path
    this.newBranchNameForMerge = config.newBranchNameForMerge;
    this.timestampForExport = Date.now(); // TODO add some uniq hash as as well... maybe commit sha;

    this.targetSubDirectory = config.targetSubDirectory;
    this.targetDirName = config.targetSubDirectory.split('/')[0];
    this.targetGit = config.targetGit;
    this.targetBranch = config.targetBranch;

    this.sourceSubDirectory = config.sourceSubDirectory;
    this.sourceDirName = config.sourceSubDirectory.split('/')[0];
    this.sourceExcludes = {
      paths: get(config.sourceExcludes, 'paths', []),
    };
    this.sourceGit = config.sourceGit;
    this.sourceBranch = config.sourceBranch;

    this.t262GithubOrg = config.t262GithubOrg;
    this.t262GitRemote = config.t262GitRemote;
  }

  async init() {
    console.info('Initializing clone');
    const newTempDir = await fsPromises.mkdtemp(os.tmpdir());

    process.chdir(newTempDir);
    this.tempDirPath = process.cwd();

    console.info(`Switched to newly created temp dir: ${this.tempDirPath}`);

    const pathToPreviousClone = path.join(
      this.tempDirPath,
      this.targetDirName,
    );

    await this._cleanIfDirectoryExists(pathToPreviousClone);

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

    const revisions = await this._getRevisionShasFromCurationLogs();

    this.sourceRevisionAtLastExport = revisions.sourceRevisionAtLastExport;
    this.targetRevisionAtLastExport = revisions.targetRevisionAtLastExport;

    this._setTargetBranch();

    await this.checkoutBranch({
      branch: this.targetBranch,
      cwd: this.targetRootDir,
    });

    await this.checkoutBranch({
      branch: this.targetBranch,
      cwd: this.sourceRootDir,
    });

    // Set the full path to the target and source subdirectories
    this.targetDirectory = `${this.tempDirPath}/${this.targetSubDirectory}`; // TODO use node path join
    this.sourceDirectory = `${this.tempDirPath}/${this.sourceSubDirectory}`;

    // add target dir if not there
    const targetSubDirectoryExists = await this._checkIfDirectoryExists(this.targetDirectory);

    if (!targetSubDirectoryExists) {
      console.debug('targetSubDirectoryExists', targetSubDirectoryExists);

      process.chdir(this.targetRootDir);

      console.info(`Switched to target cwd...${process.cwd()}`);

      await this._createDirectory(this.targetDirectory);
    }

    this._addTempPathToSubDirectoryExcludes(this.sourceExcludes.paths);

    return this;
  }


  async _getRevisionShasFromCurationLogs() {
    this.curationLogsPath = `${this.tempDirPath}/${this.curationLogsPath}`;

    const curationLogsData = JSON.parse(await fsPromises.readFile(this.curationLogsPath));

    return pick(curationLogsData, ['targetRevisionAtLastExport', 'sourceRevisionAtLastExport']);
  }

  _setTargetBranch() {
    const branchPostFix = process.NODE_ENV === DEBUG ? this.timestampForExport : this.targetRevisionAtLastExport;
    this.targetBranch = `${this.implementerName}-${this.newBranchNameForMerge}-${branchPostFix}`;
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
      const clone = spawn('git', ['clone', '--depth=100', '--single-branch', `--branch=${branch}`, gitRemote], { stdio: 'inherit', cwd: this.tempDirPath });

      process.on('error', (error) => {
        reject(error);
      });

      clone.on('exit', (code) => {
        code === 0 ? resolve(path.join(process.cwd(), dirName)) : reject(`Failed with code ${code}`);
        console.info(`Completed clone of ${gitRemote}`); // TODO make an if
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

      process.on('error', (data) => {
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
      const diff = spawn('git', ['diff', ...options], { cwd: directory });

      diff.stdout.on('data', (data) => {
        console.debug('%%%%%%%%%%% CALLED DATA');
        diffData += String(data);
      });

      process.on('error', (error) => {
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
    let logData = '';

    process.chdir(directory);

    return new Promise((resolve, reject) => {
      const log = spawn('git', ['log', ...options]);

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

  async getLastRevisionSha({ directory, branch }) {
    process.chdir(directory);
    const lastRevisionSha = await execCmd(`git rev-list ${branch} --max-count=1`);
    console.info(`Last revision sha for branch ${branch} for directory ${lastRevisionSha.stdout}`);
    return lastRevisionSha.stdout;
  }

  async updateCurationLogsRevisionShas() {
    const sourceRevisionAtLastExport = await this.getLastRevisionSha({ directory: this.targetRootDir, branch: this.targetBranch });
    const targetRevisionAtLastExport = await this.getLastRevisionSha({ directory: this.sourceRootDir, branch: this.targetBranch });

    const curationLogsData = JSON.parse(await fsPromises.readFile(this.curationLogsPath));

    Object.assign(curationLogsData, {
      sourceRevisionAtLastExport,
      targetRevisionAtLastExport,
    });

    await fsPromises.writeFile(this.curationLogsPath, JSON.stringify(curationLogsData, null, 2));
  }

  async addChanges() {
    return new Promise((resolve, reject) => {
      const add = spawn('git', ['add', this.targetDirectory, this.curationLogsPath], {
        stdio: 'inherit',
        cwd: this.targetDirectory,
      });

      process.on('error', (data) => {
        console.error(`stderr: ${data}`);
        reject();
      });

      add.on('exit', () => {
        console.info(`Added changes in target directory...${this.targetDirectory}`);
        resolve();
      });
    });
  }

  async commit(commitMessage) {
    return new Promise((resolve, reject) => {
      const commit = spawn('git', ['commit', '-m', `"[${this.implementerName}-test262-automation] ${commitMessage}`], {
        stdio: 'inherit',
        cwd: this.targetDirectory,
      });

      process.on('error', (data) => {
        console.error(`stderr: ${data}`);
        reject();
      });

      commit.on('exit', () => {
        console.info('Commited changes with message....', commitMessage);
        resolve();
      });
    });
  }

  async addRemote() {
    await execCmd(`git remote add ${this.t262GithubOrg} ${this.t262GitRemote}`, { cwd: this.targetDirectory });
    console.info(`Added remote of remote....${this.t262GitRemote} as ${this.t262GithubOrg}`);
  }

  async pushRemoteBranch() {
    await execCmd(`git push ${this.t262GithubOrg} ${this.targetBranch}`);
    console.info('Pushing to remote branch ....', this.targetBranch);
  }

  async commitFileChangesAndPushRemoteBranch() {
    process.chdir(this.targetRootDir);
    console.log('WORDKIN DIR 1', process.cwd());
    await this.addChanges();
    await this.commit(`changes from ${this.sourceGit} at sha ${this.sourceRevisionAtLastExport} on ${new Date(this.timestampForExport)}`);
    await this.addRemote();
    await this.pushRemoteBranch();
  }

  async commitUpdatedCurationLogs() {
    // TODO make this optional only if changes are made in the curation log
    process.chdir(this.targetRootDir);
    console.log('WORDKIN DIR 2', process.cwd());
    await this.addChanges();
    await this.commit('updated curation log with latest revision sha\'s from export');
    await this.pushRemoteBranch();
  }
}

module.exports = {
  GitUtil,
  SOURCE_ERROR_STATUS,
  TARGET_ERROR_STATUS,
};
