const ghConfig = require('./config/debug.json');
const implConfig = require('./config/implementation/jsc-debug.json');
const GitHub = require('./utils/github')
const OutcomeReporter = require('./utils/outcomeReporter')
const PullRequestManager = require('./pull-request-manager')

const githubConfig = {
  t252GithubOrg: process.env.T262_GH_ORG || ghConfig.t252GithubOrg,
  t252GithubRepoName: process.env.T262_GH_REPO_NAME || ghConfig.t252GithubRepoName,
  t252BaseBranch: process.env.T262_BASE_BRANCH || ghConfig.t252BaseBranch,
  t252GithubUsername: process.env.GITHUB_USERNAME || ghConfig.t252GithubUsername,
  githubToken: process.env.GITHUB_TOKEN || ghConfig.githubToken,
};

const github = new GitHub(githubConfig);
const reporter = new OutcomeReporter({
  implConfig: implConfig,
  githubConfig,
});

const manager = new PullRequestManager({
  github,
  reporter,
  config: implConfig,
})

manager.pushPullRequest({
  branchName,
  sourceSha,
  targetSha,
  vendor,
  outcomes
})
