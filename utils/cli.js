const yargs = require('yargs');
const pick = require('lodash.pick');
const fs = require('fs');

const choices = fs.readdirSync('./config/implementation/')
      .map(file => file.replace(/\.json$/, ''))
      .filter(file => !file.endsWith('-debug'));


function getConfigOptions() {

  const argv = yargs
    .usage('Usage: test262-automation -implementation [implementation] [options]')
    .option('debug')
    .option('pull-request', {
      alias: 'p',
      default: false
    })
    .option('implementation', {
      alias: 'i',
      demandOption: true,
      describe: 'Specify implementor engine',
      type: 'string',
      choices,
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
  implementationConfig = require(`../config/implementation/${implementationConfig}.json`); // TODO add config validation method to tie in with CLI
  githubConfig = require(`../config/${githubConfig}.json`);

  implementationConfig = {
    ...implementationConfig,
    ...pick(argv, Object.keys(implementationConfig))
  };

  githubConfig = {
    ...githubConfig,
    ...pick(argv, Object.keys(githubConfig))
  };

  return {
    argv,
    implementationConfig,
    githubConfig,
  };
}

module.exports = {
  getConfigOptions,
};
