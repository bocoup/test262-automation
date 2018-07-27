#!/usr/bin/env node
const debug = require('debug')('test262-automation:log');
const fs = require('fs');
process.setMaxListeners(30); // TODO performance profiling

const { GitUtil } = require('./utils/git.js');
const { FileExporter } = require('./utils/fileExporter.js');
const { FileStatusManager } = require('./utils/fileStatusManager.js');

const { createPrManager } = require('./utils/pullRequestManager.js');

const { getConfigOptions } = require('./utils/cli.js');

const { argv, implementationConfig, githubConfig } = getConfigOptions();

const gitUtil = new GitUtil({ ...implementationConfig, ...githubConfig });

try {
  (async () => {
    const data = await gitUtil.init();

    const {
      targetRootDir,
      sourceRootDir,
    } = data;

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

    // diffList C (source files and target files)
    const targetAndSourceDiff = await gitUtil.diff({
      options: [
        '--no-index',
        '--name-status',
        data.targetSubDirectory,
        data.sourceSubDirectory,
      ],
      directory: data.tempDirPath,
    });

    const fileStatusManager = new FileStatusManager({
      tempDirPath: data.tempDirPath,
      targetRootDir: data.targetRootDir,
      sourceRootDir: data.sourceRootDir,
      sourceDirectory: data.sourceDirectory,
      targetDirectory: data.targetDirectory,
      sourceExcludes: data.sourceExcludes,
      ignoredMaintainers: data.ignoredMaintainers,
      targetRevisionAtLastExport: data.targetRevisionAtLastExport,
      curationLogsPath: data.curationLogsPath,
      targetDiffList,
      sourceDiffList,
      targetAndSourceDiff,
    });

    const outcomes = await fileStatusManager.init();
    const foundChangedFiles = Object.keys(outcomes).some(outcome => outcomes[outcome].files.length > 0);

    debug('foundChangedFiles', foundChangedFiles);

    if (foundChangedFiles) {

      const {curationLogsPath, sourceDirectory, targetDirectory} = data;

      const fileExporter = new FileExporter({
        exportDateTime: new Date(data.timestampForExport),
        curationLogsPath,
        sourceDirectory,
        targetDirectory,
        outcomes,
      });

      await fileExporter.init();

      await gitUtil.commitFileChangesAndPushRemoteBranch();

      await gitUtil.updateCurationLogsRevisionShas();

      await gitUtil.commitUpdatedCurationLogs();

      if (argv.pullRequest) {
        const prManager = createPrManager({
          ghConfig: githubConfig,
          implConfig: implementationConfig,
        });

        await prManager.pushPullRequest({
          branchName: gitUtil.targetBranch,
          sourceSha: data.sourceRevisionAtLastExport,
          targetSha: data.targetRevisionAtLastExport,
          implementerName: implementationConfig.implementerDisplayName,
          outcomes,
        }).catch(error => console.error('PR ERROR:', error));
      }
    } else {
      console.info('Found no changes to export');
    }
  })();
} catch (error) {
  console.error('ERROR IN INDEX.JS', error);
}

function cleanUpScripts({ eventName, tempDirPath }) {
  // kill any running child processes
  process.exit();
  // remove temp dir with cloned repos
  if (fs.existsSync(tempDirPath)) {
    fs.unlinkSync(tempDirPath);
  }

  console.info(`Clean up scripts called on ${eventName} event`);
}

['SIGINT', 'exit'].forEach(eventName => {
  const { tempDirPath } = GitUtil;
  process.on(eventName, () => cleanUpScripts({ eventName, tempDirPath }));
});
