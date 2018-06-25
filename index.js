#!/usr/bin/env node

const yargs = require("yargs");
const { GitUtil, SOURCE_ERROR_STATUS, TARGET_ERROR_STATUS } = require("./utils/git.js");
const { FileExporter } = require("./utils/fileExporter.js");
const { FileOutcomeManager } = require("./utils/fileOutcomeManger.js");

/* Parse args */
const argv = yargs
    .usage("Usage: test262-automation [engine] [options]")
    .option("engine", {
        alias: "e",
        demandOption: true,
        describe: "Specify implementor engine...options are jsc",
        type: "string"
    }).argv;

/* Setup Config */
const config = require(`./config/implementation/${argv.engine}.json`); // TODO add config validation method to tie in with CLI

/* Initialize GitUitl */

// TODO validate config values b4 init
const gitUtil = new GitUtil(config);

try {
    gitUtil
        .init()
        .then(async data => {
            // diffList A (target Head to Sha)
            const targetDiffList = await gitUtil.diff({
                options: [
                    "--name-status",
                    data.targetRevisionAtLastExport,
                    "HEAD"
                ],
                directory: data.targetRootDir
            });

            // diffList B (source HEAD to Sha)
            const sourceDiffList = await gitUtil.diff({
                options: [
                    "--name-status",
                    data.sourceRevisionAtLastExport,
                    "HEAD"
                ],
                directory: data.sourceRootDir
            });

            // diffList C (source Sha to Head)
            const targetAndSourceDiff = await gitUtil.diff({
                options: [
                    "--no-index",
                    "--name-status",
                    data.targetSubDirectory,
                    data.sourceSubDirectory
                ],
                directory: data.tempDirPath
            });

            console.debug("gitUtil", data);
            console.debug("targetDiffList", targetDiffList);
            console.debug("sourceDiffList", sourceDiffList);
            console.debug("targetAndSourceDiff", targetAndSourceDiff);

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
                targetAndSourceDiffListOutputFile: `${data.tempDirPath}/targetAndSourceDiffList.json`
            };
        })
        .then(async info => {
            const targetDirectoryPattern = `${info.targetDirectory}/**`;
            const sourceDirectoryPattern = `${info.sourceDirectory}/**`;

            const targetDiffListObj = await gitUtil.createDiffListObj({
                diffList: info.targetDiffList,
                includes: [targetDirectoryPattern],
                directoryPath: info.targetRootDir,
                excludes: [],
                errorStatuses: TARGET_ERROR_STATUS
            });

            const sourceDiffListObj = await gitUtil.createDiffListObj({
                diffList: info.sourceDiffList,
                includes: [sourceDirectoryPattern],
                directoryPath: info.sourceRootDir,
                excludes: [],
                errorStatuses: SOURCE_ERROR_STATUS
            });

            const targetAndSourceDiffListObj = await gitUtil.createDiffListObj({
                    diffList: info.targetAndSourceDiff,
                    includes: [targetDirectoryPattern, sourceDirectoryPattern],
                    directoryPath: info.tempDirPath,
                    excludes: info.sourceExcludes.paths,
                    errorStatuses: []
                });

            const targetDiffListPath = gitUtil.createDiffListJSON({
                 outputFile: info.targetDiffListOutputFile,
                 diffListObj: targetDiffListObj
            });

            const sourceDiffListPath = gitUtil.createDiffListJSON({
                outputFile: info.sourceDiffListOutputFile,
                diffListObj: sourceDiffListObj
            });

            const targetAndSourceDiffListPath = gitUtil.createDiffListJSON({
                outputFile: info.targetAndSourceDiffListOutputFile,
                diffListObj: targetAndSourceDiffListObj
            });

            // get the 3 diff lists here and pass them to the newly initialized fileExporter
            return {
                targetDiffListPath,
                sourceDiffListPath,
                targetAndSourceDiffListPath
            };
        })
        .then(({targetDiffListPath ,sourceDiffListPath, targetAndSourceDiffListPath }) => {
            const fileOutcomeManager = new FileOutcomeManager({
                targetDiffListPath,
                sourceDiffListPath,
                targetAndSourceDiffListPath
            });
    });

    // TODO add cleanup steps on success for publishing PR
    // remote temp files and clone

} catch (error) {
    console.log("Oops error:", error);
}
