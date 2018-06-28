const { GitUtil } = require('./git')
const config = require('../config/implementation/jsc-debug.json')
const fs = require("fs");
const os = require("os");
const fsPromises = fs.promises;
const { spawn } = require('child_process');


async function promiseGit(options=[]) {
  const git = spawn('git', options);

  return new Promise(resolve => git.on('close', resolve));
}

async function createSampleGitRepo() {
  const newTempDir = await fsPromises.mkdtemp(os.tmpdir());
  // change

  process.chdir(newTempDir);
  await promiseGit(['init'])
  await promiseGit(['commit', '--allow-empty', '-m', 'Trigger change'])
  return newTempDir
}

describe('GitUtil', function() {
  it('should fail', async function() {
    let git = new GitUtil(config);
    let directory = await createSampleGitRepo()
    let log = await git.log({
      options: [],
      directory,
    });
    console.log('log', log)
    expect(true).toBe(false);
  });
});
