const debug = require('debug')('test262-automation:log');
const util = require('util');
const os = require('os');
const fs = require('fs');

const fsp = fs.promises;
const path = require('path');
const makeDir = require('make-dir');
const {
  exec,
  spawn
} = require('child_process');
const get = require('lodash.get');
const pick = require('lodash.pick');

const {
  FILE_STATUSES: {
    RENAMED,
    UNKNOWN,
    UNMERGED,
    ADDED,
    FILE_TYPE_CHANGE,
  },
  NODE_ENV: {
    DEBUG
  },
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
    this.t262GithubUsername = config.t262GithubUsername;
    this.githubAuthorEmail = config.githubAuthorEmail;
    this.ignoredMaintainers = config.ignoredMaintainers;
  }

  async init() {
    console.info('Initializing clone');
    const newTempDir = await fsp.mkdtemp(os.tmpdir());

    process.chdir(newTempDir);
    this.tempDirPath = process.cwd();

    console.info(`Switched to newly created temp dir: ${this.tempDirPath}`);

    const pathToPreviousClone = path.join(
      this.tempDirPath,
      this.targetDirName,
    );

    await this.cleanIfDirectoryExists(pathToPreviousClone);

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

    await this.checkout({
      branch: this.targetBranch,
      cwd: this.targetRootDir,
    });

    await this.checkout({
      branch: this.targetBranch,
      cwd: this.sourceRootDir,
    });

    // Set the full path to the target and source subdirectories
    this.targetDirectory = path.join(this.tempDirPath, this.targetSubDirectory);
    this.sourceDirectory = path.join(this.tempDirPath, this.sourceSubDirectory);

    // add target dir if not there
    const targetSubDirectoryExists = await this.checkIfDirectoryExists(this.targetDirectory);

    if (!targetSubDirectoryExists) {
      debug('targetSubDirectoryExists', targetSubDirectoryExists);

      process.chdir(this.targetRootDir);

      console.info(`Switched to target cwd...${process.cwd()}`);

      await this.createDirectory(this.targetDirectory);
    }

    this._addTempPathToSubDirectoryExcludes(this.sourceExcludes.paths);

    return this;
  }


  async _getRevisionShasFromCurationLogs() {
    this.curationLogsPath = path.join(this.tempDirPath, this.curationLogsPath);

    const curationLogsData = JSON.parse(await fsp.readFile(this.curationLogsPath));

    return pick(curationLogsData, ['targetRevisionAtLastExport', 'sourceRevisionAtLastExport']);
  }

  _setTargetBranch() {
    const branchPostFix = process.env.NODE_ENV === DEBUG ?
      this.timestampForExport : this.targetRevisionAtLastExport;

    this.targetBranch = `${this.implementerName}-${this.newBranchNameForMerge}-${branchPostFix}`;
  }

  _addTempPathToSubDirectoryExcludes(paths = []) {
    this.sourceExcludes.paths = paths.map(p => path.join(this.sourceDirectory, p));
  }

  async checkIfDirectoryExists(directory) {
    try {
      await fsp.open(directory, 'r');
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.info(`Dir does not exist... ${directory}`);
        return false;
      }
    }
  }

  async createDirectory(directory) {
    try {
      const dir = await makeDir(directory);

      console.log('made it', dir);
      return dir;
    } catch (error) {
      return error;
    }
  }

  async cleanIfDirectoryExists(directory) {
    let itExists = await this.checkIfDirectoryExists(directory);

    if (itExists) {
      await execCmd(`rm -rf ${path}`).then((stdout) => {
        console.info('Removing previous clone...', path);
        console.log(stdout);
      });
    }
  }

  clone(params) {
    const {
      gitRemote,
      branch,
      dirName
    } = params;

    return new Promise((resolve, reject) => {
      console.info(`Starting clone of ${gitRemote}...`);

      // TODO add support for cloning into . dirName
      // TODO add options to support local dev for setting depth
      const clone = spawn('git', ['clone', '--depth=1000', '--single-branch', `--branch=${branch}`, gitRemote], {
        stdio: 'inherit',
        cwd: this.tempDirPath
      });

      let errorHandler = error => reject(error);
      process.once('error', errorHandler);

      clone.on('exit', (code) => {
        process.removeListener('error', errorHandler);
        if (code) {
          reject(`Failed with code ${code}`);
        } else {
          console.info(`Completed clone of ${gitRemote}`);
          resolve(path.join(process.cwd(), dirName))
        }
      });
    });
  }

  checkout(params) {
    const {
      branch,
      cwd
    } = params;

    return new Promise((resolve, reject) => {
      console.info(`Switched to cwd of ${cwd}`);

      const checkout = spawn('git', ['checkout', '-b', branch], {
        stdio: 'inherit',
        cwd
      });

      let errorHandler = error => reject(error);
      process.once('error', errorHandler);

      checkout.on('exit', (code) => {
        console.info(`Checkout out new branch ${branch} in ${process.cwd()}`);
        process.removeListener('error', errorHandler);
        resolve(this);
      });
    });
  }

  diff(params) {
    // TODO handle for if directory does not exist
    const {
      options,
      directory
    } = params;
    let diffData = '';

    return new Promise((resolve, reject) => {
      const diff = spawn('git', ['diff', ...options], {
        cwd: directory
      });

      diff.stdout.on('data', (data) => {
        diffData += String(data);
      });

      let errorHandler = error => reject(error);
      process.once('error', errorHandler);

      diff.on('exit', () => {
        console.info(`Git diff list piped for ${options}`);
        process.removeListener('error', errorHandler);
        resolve(diffData);
      });
    });
  }

  log(params) {
    // TODO handle for if directory does not exist
    const {
      options,
      directory
    } = params;
    let logData = '';

    return new Promise((resolve, reject) => {
      const log = spawn('git', ['log', ...options], {
        cwd: directory
      });

      log.stdout.on('data', (data) => {
        logData += String(data);
      });

      let errorHandler = error => reject(error);
      process.once('error', errorHandler);

      log.on('exit', (code) => {
        process.removeListener('error', errorHandler);
        resolve(logData);
      });
    });
  }


  async getLastRevisionSha({ directory, branch }) {
    const lastRevisionSha = await execCmd(`git rev-list ${branch} --oneline --max-count=1`, {
      cwd: directory
    });
    console.info(`Last revision sha for branch ${branch} for directory ${lastRevisionSha.stdout}`);
    return lastRevisionSha.stdout.split(' ')[0];
  }

  async updateCurationLogsRevisionShas() {
    const sourceRevisionAtLastExport = await this.getLastRevisionSha({
      directory: this.sourceRootDir,
      branch: this.targetBranch
    });

    const targetRevisionAtLastExport = await this.getLastRevisionSha({
      directory: this.targetRootDir,
      branch: this.targetBranch
    });

    const curationLogsData = JSON.parse(await fsp.readFile(this.curationLogsPath));

    Object.assign(curationLogsData, {
      sourceRevisionAtLastExport,
      targetRevisionAtLastExport,
    });

    await fsp.writeFile(this.curationLogsPath, JSON.stringify(curationLogsData, null, 2));
  }

  async addChanges() {
    return new Promise((resolve, reject) => {
      const add = spawn('git', ['add', this.targetDirectory, this.curationLogsPath], {
        stdio: 'inherit',
        cwd: this.targetRootDir,
      });

      let errorHandler = error => reject(error);
      process.once('error', errorHandler);

      add.on('exit', () => {
        console.info(`Added changes in target directory...${this.targetDirectory} & ${this.curationLogsPath}`);
        process.removeListener('error', errorHandler);
        resolve();
      });
    });
  }

  async commit(commitMessage) {
    return new Promise((resolve, reject) => {

      process.env.GIT_COMMITTER_EMAIL = this.githubAuthorEmail;
      process.env.GIT_COMMITTER_NAME = this.t262GithubUsername;
      const githubAuthor = `${this.t262GithubUsername} <${this.githubAuthorEmail}>`;

      const commit = spawn('git', ['commit', '-m', `[${this.implementerName}-test262-automation] ${commitMessage}`, `--author="${githubAuthor}"`], {
        stdio: 'inherit',
        cwd: this.targetRootDir,
      });

      let errorHandler = error => reject(error);
      process.once('error', errorHandler);

      commit.on('exit', () => {
        console.info(`Commited changes with message... "${commitMessage}"`);
        process.removeListener('error', errorHandler);
        resolve();
      });
    });
  }

  async addRemote() {
    await execCmd(`git remote add ${this.t262GithubOrg} ${this.t262GitRemote}`, {
      cwd: this.targetRootDir
    });
    console.info(`Added remote of remote... ${this.t262GitRemote} as ${this.t262GithubOrg}`);
  }

  async pushRemoteBranch() {
    await execCmd(`git push ${this.t262GithubOrg} ${this.targetBranch}`, {
      cwd: this.targetRootDir
    });
    console.info(`Pushed to remote branch... ${this.targetBranch}`);
  }

  async commitFileChangesAndPushRemoteBranch() {
    await this.addChanges();
    await this.commit(`Changes from ${this.sourceGit} at sha ${this.sourceRevisionAtLastExport} on ${new Date(this.timestampForExport)}`);
    await this.addRemote();
    await this.pushRemoteBranch();
  }

  async commitUpdatedCurationLogs() {
    // TODO make this optional only if changes are made in the curation log
    await this.addChanges();
    await this.commit(`Updated curation log with latest revision sha's from export and changed files.
    sourceRevisionAtLastExport: ${this.sourceRevisionAtLastExport} targetRevisionAtLastExport: ${this.targetRevisionAtLastExport}`);
    await this.pushRemoteBranch();
  }
}

module.exports = {
  GitUtil,
  SOURCE_ERROR_STATUS,
  TARGET_ERROR_STATUS,
};
