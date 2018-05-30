#!/usr/bin/env node

const yargs = require('yargs');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');
const { cloneRepo } = require('./utils/git.js');

console.log('script started');

// Parse args
const argv = yargs
    .usage('Usage: test262-automation [engine] [options]')
    .option('engine', {
        alias: 'e',
        demandOption: true,
        describe: 'Specify implementor engine...options are jsc',
        type: 'string'
    }).argv;

// Match Config

const config = require(`./config/${argv.engine}.json`);

const { license, targetGit, targetDirectory, targetShaRevision , sourceGit, sourceDirectory, sourceShaRevision,sourceExcludes } = config;
const tempDir = os.tmpdir();


fs.mkdtemp(os.tmpdir(), (err) => {

    if (err) {
        console.log(err);
        return;
    }

    process.chdir(tempDir);

    console.log(process.cwd());

    cloneRepo({ targetGit, targetDirectory });
});






