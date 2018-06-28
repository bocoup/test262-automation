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
    vendor,
    outcomes
  }) {
    let pullRequest = await this.uploadPullRequest({
      branchName,
      title: this.implConfig.pullRequestTitle,
      body: this.reporter.generateReport({
        sourceSha,
        targetSha,
        vendor,
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

module.exports = PullRequestManager;
