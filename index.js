#!/usr/bin/env node

const { GitUtil  } = require('./utils/git.js');
const { FileExporter } = require('./utils/fileExporter.js');
const { FileStatusManager } = require('./utils/fileStatusManager.js');

const { createPrManager } = require('./utils/pullRequestManager.js');

const { getConfigOptions } = require('./utils/cli.js');

const { argv, implementationConfig, githubConfig } = getConfigOptions();

const gitUtil = new GitUtil({...implementationConfig, ...githubConfig });

try {

  (async () => {

    const data = await gitUtil.init();

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

    const fileStatusManager = new FileStatusManager({
      tempDirPath: data.tempDirPath,
      targetRootDir: data.targetRootDir,
      sourceRootDir: data.sourceRootDir,
      sourceDirectory: data.sourceDirectory,
      targetDirectory: data.targetDirectory,
      sourceExcludes: data.sourceExcludes,
      targetDiffList,
      sourceDiffList,
      targetAndSourceDiff
    });

    const fileOutcomes = await fileStatusManager.init();

    const fileExporter = new FileExporter({
      curationLogsPath: data.curationLogsPath,
      sourceDirectory: data.sourceDirectory,
      targetDirectory: data.targetDirectory,
      exportDateTime: data.timestampForExport, // TODO format
      fileOutcomes
    });

    await fileExporter.init();

    await gitUtil.commitFileChangesAndPushRemoteBranch();

    await gitUtil.updateCurationLogsRevisionShas();

    await gitUtil.commitUpdatedCurationLogs();

    if (argv.pullRequest) {
      const prManager = createPrManager({
        ghConfig: githubConfig,
        implConfig: implementationConfig
      });

      await prManager.pushPullRequest({
        branchName: gitUtil.targetBranch,
        sourceSha: '', // TODO pass in data.sourceRevisionAtLastExport
        targetSha: '', // TODO pass in data.targetRevisionAtLastExport
        implementerName: implementationConfig.implementerDisplayName,
        outcomes: fileOutcomes
      }).catch(error => console.error(`PR ERROR:`, error));
    }

  })();
} catch (error) {
  console.error('ERROR IN INDEX.JS', error);
}