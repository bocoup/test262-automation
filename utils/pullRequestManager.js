/**
   The PullRequestManager uses the github util to open a pull request,
   add labels and do some simple error handeling.
 */
class PullRequestManager {
  constructor({implConfig, github, reporter}) {
    this.implConfig = implConfig;
    this.github = github;
    this.reporter = reporter;
  }

  async pushPullRequest({
    branchName,
    sourceSha,
    targetSha,
    implementatorName,
    outcomes
  }) {
    let pullRequest = await this.uploadPullRequest({
      branchName,
      title: this.implConfig.pullRequestTitle,
      body: this.reporter.generateReport({
        branch: branchName,
        sourceSha,
        targetSha,
        implementatorName,
        outcomes
      })
    });

    await this.github.addLabel({
      labels: this.implConfig.pullRequestLabels,
      number: pullRequest.number,
    });

    return pullRequest;
  }

  // Opens a new pull requests or updates an existing one
  async uploadPullRequest(params) {
    try {
      return await this.github.openPullRequest(params)
    } catch (e) {
      const message = e.errors && e.errors[0] && e.errors[0].message
      if (/A pull request already exists/.exec(message)) {
        return await this.github.updatePullRequest(params)
      } else {
        throw e;
      }
    }
  }
}


function createPrManager({ghConfig, implConfig}) {
  const GitHub = require('./github');
  const OutcomeReporter = require('./outcomeReporter');

  const githubConfig = {
    t262GithubOrg: process.env.T262_GH_ORG || ghConfig.t262GithubOrg,
    t262GithubRepoName: process.env.T262_GH_REPO_NAME || ghConfig.t262GithubRepoName,
    t262BaseBranch: process.env.T262_BASE_BRANCH || ghConfig.t262BaseBranch,
    t262GithubUsername: process.env.GITHUB_USERNAME || ghConfig.t262GithubUsername,
    githubToken: process.env.GITHUB_TOKEN || ghConfig.githubToken,
  };

  const github = new GitHub(githubConfig);
  const reporter = new OutcomeReporter({
    implConfig,
    githubConfig,
  });

  return new PullRequestManager({
    github,
    reporter,
    implConfig,
  });
}

module.exports = {
  PullRequestManager,
  createPrManager,
};
