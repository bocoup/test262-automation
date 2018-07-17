#!/usr/bin/env node

process.setMaxListeners(Infinity); // <== Important line

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

    await fileStatusManager.init();

    const fileOutcomes = fileStatusManager.fileOutcomes;
    const foundChangedFiles = Object.keys(fileOutcomes).some(outcome => fileOutcomes[outcome].files.length > 0);

    console.log('foundChangedFiles', foundChangedFiles);

    if (foundChangedFiles) {
      const fileExporter = new FileExporter({
        curationLogsPath: data.curationLogsPath,
        sourceDirectory: data.sourceDirectory,
        targetDirectory: data.targetDirectory,
        exportDateTime: new Date(data.timestampForExport),
        fileOutcomes,
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
          outcomes: fileOutcomes,
        }).catch(error => console.error('PR ERROR:', error));
      }
    } else {
      console.info('Found no changes to export');
    }
  })();
} catch (error) {
  console.error('ERROR IN INDEX.JS', error);
}

function cleanUpScripts(eventName) {
  // kill any running child processes
  process.exit();
  // remove temp dir with cloned repos
  if(fs.existsSync(data.tempDirPath)){
    fs.unlinkSync(data.tempDirPath);
  }

  console.info(`Clean up scripts called on ${eventName} event`);
}
process.on('SIGINT', () => cleanUpScripts('SIGINT'));
process.on('exit', () => cleanUpScripts('exit'));