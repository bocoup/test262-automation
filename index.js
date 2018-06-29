#!/usr/bin/env node

const yargs = require('yargs');
const pick = require('lodash.pick');
const { GitUtil, SOURCE_ERROR_STATUS, TARGET_ERROR_STATUS } = require('./utils/git.js');
const { FileExporter } = require('./utils/fileExporter.js');
const { FileOutcomeManager } = require('./utils/fileOutcomeManger.js');
const { createPrManager } = require('./utils/pullRequestManager.js')

/* Parse args */
const argv = yargs
  .usage('Usage: test262-automation [engine] [options]')
  .option('debug')
  .option('pull-request', {
    alias: 'p',
    default: false
  })
  .option('implementation', {
    alias: 'i',
    demandOption: true,
    describe: 'Specify implementor engine...options are jsc',
    type: 'string',
  })
  .options({
    // The following options override the github config
    't262-github-org': {
      describe: 'The github org or user that owns the test262 repo',
    },
    't262-github-repo-name': {
      describe: 'The name of the test262 repo on github',
    },
    't262-github-base-branch': {
      describe: 'The branch on test262 to target when opening a pr',
    },
    't262-github-username': {
      describe: 'The user that will open a pull request',
    },
    't262-github-remote': {
      describe: 'The git remote on github to push the branch with changes',
    },
    'github-token': {
      describe: 'A github Oauth token for the user that will be used to open the pull request',
    },
    // The following options override implementation configs
    'target-git': {
      describe: 'The git repo to use as the target for applying changes',
    },
    'target-revision-at-last-export': {
      describe: 'The starting sha or branch to use when comparing changes since the last sync',
    },
    'target-branch': {
      describe: 'The branch to sync changes too.',
    },
    'source-git': {
      describe: 'The git repo to use as the source of the changes to sync',
    },
    'source-revision-at-last-export': {
      describe: 'The starting sha or branch to use when comparing changes since the last sync',
    },
    'source-branch': {
      describe: 'The branch to sync changes from',
    }
  }).argv;


let implementationConfig = argv.implementation;
let githubConfig = 'github';

if (argv.debug) {
  process.NODE_ENV = 'DEBUG';
  implementationConfig = `${implementationConfig}-debug`;
  githubConfig = `${githubConfig}-debug`;
}


/* Setup Config */
implementationConfig = require(`./config/implementation/${implementationConfig}.json`); // TODO add config validation method to tie in with CLI
githubConfig = require(`./config/${githubConfig}.json`);

implementationConfig = {
  ...implementationConfig,
  ...pick(argv, Object.keys(implementationConfig))
}

githubConfig = {
  ...githubConfig,
  ...pick(argv, Object.keys(githubConfig))
}

/* Initialize GitUitl */

const home_directory = process.cwd();

// TODO validate config values b4 init

const gitUtil = new GitUtil({...implementationConfig, ...githubConfig });

try {
  gitUtil
    .init()
    .then(async (data) => {
      // diffList A (target Head to Sha)
      const targetDiffList = await gitUtil.diff({
        options: [
          '--name-status',
          data.targetRevisionAtLastExport,
          'HEAD',
        ],
        directory: data.targetRootDir,
      });

      // diffList B (source HEAD to Sha)
      const sourceDiffList = await gitUtil.diff({
        options: [
          '--name-status',
          data.sourceRevisionAtLastExport,
          'HEAD',
        ],
        directory: data.sourceRootDir,
      });

      // diffList C (source Sha to Head)
      const targetAndSourceDiff = await gitUtil.diff({
        options: [
          '--no-index',
          '--name-status',
          data.targetSubDirectory,
          data.sourceSubDirectory,
        ],
        directory: data.tempDirPath,
      });

      console.debug('gitUtil', data);
      console.debug('targetDiffList', targetDiffList);
      console.debug('sourceDiffList', sourceDiffList);
      console.debug('targetAndSourceDiff', targetAndSourceDiff);

      return {
        targetRootDir: data.targetRootDir,
        sourceRootDir: data.sourceRootDir,
        targetDirectory: data.targetDirectory,
        sourceDirectory: data.sourceDirectory,
        sourceExcludes: data.sourceExcludes,
        tempDirPath: data.tempDirPath,
        targetDiffList,
        targetDiffListOutputFile: `${data.tempDirPath}/targetDiffList.json`,
        sourceDiffList,
        sourceDiffListOutputFile: `${data.tempDirPath}/sourceDiffList.json`,
        targetAndSourceDiff,
        targetAndSourceDiffListOutputFile: `${data.tempDirPath}/targetAndSourceDiffList.json`,
      };
    })
    .then(async (info) => {
      const targetDirectoryPattern = `${info.targetDirectory}/**`;
      const sourceDirectoryPattern = `${info.sourceDirectory}/**`;

      const targetDiffListObj = await gitUtil.createDiffListObj({
        diffList: info.targetDiffList,
        includes: [targetDirectoryPattern],
        directoryPath: info.targetRootDir,
        excludes: [],
        errorStatuses: TARGET_ERROR_STATUS,
      });

      const sourceDiffListObj = await gitUtil.createDiffListObj({
        diffList: info.sourceDiffList,
        includes: [sourceDirectoryPattern],
        directoryPath: info.sourceRootDir,
        excludes: [],
        errorStatuses: SOURCE_ERROR_STATUS,
      });

      const targetAndSourceDiffListObj = await gitUtil.createDiffListObj({
        diffList: info.targetAndSourceDiff,
        includes: [targetDirectoryPattern, sourceDirectoryPattern],
        directoryPath: info.tempDirPath,
        excludes: info.sourceExcludes.paths,
        errorStatuses: [],
      });

      // get the 3 diff lists here and pass them to the newly initialized fileExporter
      return {
        targetDiffListObj,
        sourceDiffListObj,
        targetAndSourceDiffListObj,
        targetDirectory: info.targetDirectory,
        sourceDirectory: info.sourceDirectory,
      };
    })
    .then(async ({
      targetDiffListObj, sourceDiffListObj, targetAndSourceDiffListObj, targetDirectory, sourceDirectory,
    }) => {

      process.chdir(home_directory);

      const fileOutcomeManager = new FileOutcomeManager({
        targetDiffListObj,
        sourceDiffListObj,
        targetAndSourceDiffListObj,
        fileExporter: new FileExporter({
          curationLogsPath: './curation_logs/jsc.json',
          sourceDirectory,
          targetDirectory,
        }),
      });

     await fileOutcomeManager.init();

      return fileOutcomeManager.fileOutcomes
    }).then(async (outcomes) => {

      const branch = await gitUtil.commitAndPushRemoteBranch();

      if (argv.pullRequest) {
        const prManager = createPrManager({
          ghConfig: githubConfig,
          implConfig: implementationConfig
        });

        return prManager.pushPullRequest({
          branchName: branch,
          sourceSha: '', // TODO pass in data.sourceRevisionAtLastExport
          targetSha: '', // TODO pass in data.targetRevisionAtLastExport
          implementatorName: implementationConfig.implementatorName,
          outcomes
        });
      }
    });

  // TODO add cleanup steps on success for publishing PR
  // remote temp files and clone
} catch (error) {
  console.log('Oops error:', error);
}
