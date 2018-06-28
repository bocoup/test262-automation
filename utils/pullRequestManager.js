class PullRequestManager {
  constructor({config, git, github, reporter}) {
    this.vendorConfig = config;
    this.git = git;
    this.github = github;
    this.reporter = reporter;
  }

  branchName() {
    return `${this.vendorConfig.branchPrefix}-${this.vendorSha()}`;
  }

  vendorSha() {
    return this.vendorConfig.sourceShaRevision.slice(0, 7);
  }

  async pushPullRequest({
    branchName,
    sourceSha,
    targetSha,
    vendor,
    outcomes
  }) {
    // on successfully opening the pull request
    // update the sha

    // create branch name
    // checkout a new branch
    // commit changes
    // push changes to remote branch
    // generate report
    // open pull request
    //   Update pullrequest if one already exists
    // add label
    // cleanup

    // do we need the path of the test262 repo?
    // Should that be rolled into the git util?
    // this.git.checkoutBranch(this.branchName());
    // this.git.addAll();
    // // 2 commit
    // this.git.commit(`Sync ${this.vendorConfig.name} changes since ${this.vendorSha()}`);
    // // update git sha
    // this.git.addAll();
    // // 2 commit
    // this.git.commit(`Sync ${this.vendorConfig.name} changes since ${this.vendorSha()}`);

    // this.git.push({
    //   branch: this.branchName(),
    //   remote: 'origin',
    //   force: true,
    // });


    let pullRequest = await this.uploadPullRequest({
      branchName,
      title: 'Import test changes from jsc',
      body: this.reporter.generateReport({
        sourceSha,
        targetSha,
        vendor,
        outcomes
      })
    });

    await this.github.addLabel({
      // Read this value out of the config
      labels: [this.vendorConfig.label],
      number: pullRequest.number,
    });

    await this.cleanup();
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

  async cleanup() {
    // reset the branch to master?
  }
}

// wrapper for github
// travis cron job
// reviewed by amal and rick

// today handling what happens when a pr is open. Updating the
// existing pr
//
module.exports = PullRequestManager;
