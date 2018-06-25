//const { mkDir } = require('fsPromises');
const { GitUtil } = require("./git.js");
const fs = require("fs");
const readline = require("readline");
const fsPromises = fs.promises;
const multimatch = require("multimatch");
const { Readable } = require("stream");
//const config = require(`./config/implementation/jsc-debug.json`);
/*
* Steps:
*
* 1) Check main list
*  If newly added, run filter check for found in file exclusions
*
*  --> NO: contains exclusions (Ex: macros, non-interop code), then return
*  --> YES - add to exportQueue
*
* If
*
*
* 2)
*
* 3)
* */

class FileExporter {

    constructor(params) {
        this.statusNotFound = "N/A";
        this.queues = {
            unmodifiedFilesToExport: [],
            modifiedFilesToExport: [],
            addToDoNotExportList: [],
            removeFromDoNotExportList: []
        };

        // this.targetDirectory = params.targetDirectory;
        // this.sourceDiffList = params.sourceDiffList;
        // this.targetDiffList = params.targetDiffList;
        // this.targetAndSourceDiff = params.targetAndSourceDiff;
        // target wd
        // source wd
        // target targetSubDirectory
        // source sourceSubDirectory
        // sourceExcludes
        // init empty report
    }

    init() {
        // if target dir is not there make it
        // call compare func
        // git diff list of target from last sha to current
        // git diff list of source from last sha
        // Working with dff lists
        // 1) Check out list of files
        // 2)
        // Actions after comparing diff list
        // 1) move the file (but check if its not there first)
        // 2) copy modified file, with comment block template
        // 3) delete file
    }

    getTargetDiff() {}

    getSourceDiff() {}

    getTargetAndSourceLocalDiff() {
        GitUtil.diff({
            options: [
                "--no-index",
                "--name-status",
                "/private/var/folders/q2/cq6cldys58b4y2s_fh571jl00000gn/T4dIPID/test262/vendor/",
                "/private/var/folders/q2/cq6cldys58b4y2s_fh571jl00000gn/T4dIPID/webkit/JSTests/"
            ]
        });
    }

    reportGenerator() {}

    compare() {
        // use exportWorkflow.md:13
        // states in target
        // 1. not edited
        // 2.
        // new file in source
        // deleted file in source
        // edited file in source
        // renamed file in source
    }
}

// function filterDifflist1() {
//
//     return new Promise((resolve, reject) => {
//
//         const read = readline.createInterface({
//             input: fs.createReadStream('/Users/amalhussein/oss/test262-automation/_example.txt'),
//             crlfDelay: Infinity
//         });
//
//         let csvData = '';
//
//         read.on('line', (line) => {
//
//             console.log('IN READ LINE #####');
//
//             // TODO call new filter function here;
//
//             const str = String(line);
//             const name = str.slice(1, str.length).trim();
//             const regex1 = `/private/var/folders/q2/cq6cldys58b4y2s_fh571jl00000gn/Td6bZPN/webkit/Tools/Scripts/${config.targetSubDirectory}/**`;
//             const regex2 = `/private/var/folders/q2/cq6cldys58b4y2s_fh571jl00000gn/Td6bZPN/webkit/Tools/Scripts/${config.sourceSubDirectory}/**`;
//
//             const ignore2 = `/private/var/folders/q2/cq6cldys58b4y2s_fh571jl00000gn/Td6bZPN/webkit/${config.sourceExcludes.paths[0]}`;
//
//             console.log('name', name);
//             //console.log('regex1', regex1);
//             console.log('regex2', regex2);
//             console.log('ignore2', ignore2);
//
//             const match = minimatch(name, regex2, { ignore: ignore2 });
//
//             //const match = minimatch(name, regex2);
//
//             console.log('match', match);
//
//             if(match) {
//                 console.log('TRUE', str.slice(1, str.length).trim());
//                 csvData = csvData.concat(_transformDiffStr(String(line)));
//             }
//         });
//
//         read.on('error', (error) => {
//             console.error('ERROR', error);
//             reject(error);
//         });
//
//         read.on('close', () => {
//             console.log('IN READ CLOSE ######');
//             console.log('csvData', csvData);
//             resolve(csvData);
//         });
//     });
// }

// async function start() {
//
//     const gitUtil = new GitUtil(config);
//
//     const targetAndSourceDiff = await gitUtil.diff({
//         outputFile: '/private/var/folders/q2/cq6cldys58b4y2s_fh571jl00000gn/TGN9EQG//targetAndsourceDiffList.txt',
//         options: [
//             '--no-index',
//             '--name-status',
//             '/private/var/folders/q2/cq6cldys58b4y2s_fh571jl00000gn/TGN9EQG/webkit',
//             '/private/var/folders/q2/cq6cldys58b4y2s_fh571jl00000gn/TGN9EQG/test262',
//         ]
//     });
//
//     await createDiffListFile({
//         outputFile: "/private/var/folders/q2/cq6cldys58b4y2s_fh571jl00000gn/TGN9EQG/targetAndsourceDiffList.txt",
//         diffList: targetAndSourceDiff
//     });
// }

//start();

//filterDifflist1();

// REMOVE GLOBAL

this.statusNotFound = "N/A";

function getStatus(params) {
    const { filePath, name } = params;

    let status = null;

    return new Promise((resolve, reject) => {
        const read = readline.createInterface({
            input: fs.createReadStream(filePath, { encoding: "utf8" }),
            crlfDelay: Infinity
        });

        read.on("line", line => {
            console.log("LINE 1", line);

            if (line.split(",")[1] === name) {
                status = line.split(",")[0];
                console.info("Got it...status is", status);
                read.close();
            }
        });

        read.on("close", () => {
            resolve(status || this.statusNotFound);
        });
    });
}

function readDiffLists() {
    const target =
        "/private/var/folders/q2/cq6cldys58b4y2s_fh571jl00000gn/TKx3oPm/targetDiffList.txt";
    const source =
        "/private/var/folders/q2/cq6cldys58b4y2s_fh571jl00000gn/TKx3oPm/sourceDiffList.txt";
    const combined =
        "/private/var/folders/q2/cq6cldys58b4y2s_fh571jl00000gn/TKx3oPm/targetAndSourceDiffList.txt"; // this.targetAndSourceDiffListPath

    return new Promise((resolve, reject) => {
        const read = readline.createInterface({
            input: fs.createReadStream(combined, { encoding: "utf8" }),
            crlfDelay: Infinity
        });

        read.on("line", async line => {
            const status = line.split(",")[0];
            const name = line.split(",")[1];

            console.log("LINE", line);
            console.log("status", status);
            console.log("name", name);

            read.pause();

            const targetStatus = await getStatus({
                filePath: target,
                name
            });
            const sourceStatus = await getStatus({
                filePath: source,
                name
            });

            // get outcome here

            // add to the right queue

            // resume reading

            read.resume();
        });

        read.on("pause", () => {
            console.log("PAUSED!!!!!");
        });

        read.on("close", () => {
            console.info("DONE queneing exports...");
            resolve(this.queues);
        });
    });
}

//readDiffLists();

module.exports = {
    FileExporter
};

// fsPromises.readFile('')
//     .then((buffer) => {
//         const lines =buffer.toString();
//
//         lines.forEach((line) => {
//            console.log('\n');
//            console.log(String(line));
//         });
//
//     // console.log('lines', String(buffer));
// });

// git diff --no-index --name-status /private/var/folders/q2/cq6cldys58b4y2s_fh571jl00000gn/TRL43eK/test262 /private/var/folders/q2/cq6cldys58b4y2s_fh571jl00000gn/TRL43eK/webkit

//INCOMING excludes
