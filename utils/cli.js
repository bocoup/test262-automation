const yargs = require('yargs');

function getImplemationConfigOptions() {

  // TODO add config validation method to tie in with CLI
}

function getConfigOptions() {

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

  return {
    argv,
    implementationConfig,
    githubConfig,
  };
}

module.exports = {
  getConfigOptions,
};
