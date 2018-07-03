const fetch = require('isomorphic-fetch');
const assert = require('assert');

const T262_GH_ORG = Symbol('T262_GH_ORG');
const T262_GH_REPO_NAME = Symbol('T262_GH_REPO_NAME');
const T262_BASE_BRANCH = Symbol('T262_BASE_BRANCH');
const GITHUB_USERNAME = Symbol('GITHUB_USERNAME');
const GITHUB_TOKEN = Symbol('GITHUB_TOKEN');

/**
   The `GitHub` class is a simple wrapper around the github api that
   is pre-configured to work with the test262 github repo.
 */
class GitHub {
  constructor(config) {
    this[T262_GH_ORG] = config.t262GithubOrg;
    this[T262_GH_REPO_NAME] = config.t262GithubRepoName;
    this[T262_BASE_BRANCH] = config.t262BaseBranch;
    this[GITHUB_USERNAME] = config.t262GithubUsername;
    this[GITHUB_TOKEN] = config.githubToken;

    assert(this[GITHUB_TOKEN], 'No github token found. Please set the GITHUB_TOKEN enviroment variable before attempting to open a pull request.');
  }

  /**
     Opens a pull request on the test262 repo.

     POST /repos/:owner/:repo/pulls
     https://developer.github.com/v3/pulls/#create-a-pull-request
  */
  openPullRequest({ branchName, title, body }) {
    const head = `${this[GITHUB_USERNAME]}:${branchName}`;
    return this.request({
      method: 'POST',
      path: `/repos/${this[T262_GH_ORG]}/${this[T262_GH_REPO_NAME]}/pulls`,
      body: {
        title,
        body,
        head,
        base: this[T262_BASE_BRANCH],
        maintainer_can_modify: true,
      },
    });
  }

  async updatePullRequest({ branchName, title, body }) {
    const head = `${this[GITHUB_USERNAME]}:${branchName}`;
    const pullRequest = await this.request({
      path: `/repos/${this[T262_GH_ORG]}/${this[T262_GH_REPO_NAME]}/pulls?head=${head}`,
    })[0];

    const number = pullRequest.number;
    return this.request({
      method: 'PATCH',
      path: `/repos/${this[T262_GH_ORG]}/${this[T262_GH_REPO_NAME]}/pulls/${number}`,
      body: {
        title,
        body,
      },
    });
  }

  /**
     Adds a label to a GitHub pr (or issue).

     POST /repos/:owner/:repo/issues/:number/labels
     https://developer.github.com/v3/issues/labels/#add-labels-to-an-issue
  */
  addLabel({ number, labels }) {
    return this.request({
      method: 'POST',
      path: `/repos/${this[T262_GH_ORG]}/${this[T262_GH_REPO_NAME]}/issues/${number}/labels`,
      body: labels,
    });
  }

  async request({ path, body, method = 'GET' }) {
    const headers = {
      Authorization: `token ${this[GITHUB_TOKEN]}`,
      Accept: 'application/vnd.github.v3+json',
      'content-type': 'application/json',
    };

    const response = await fetch(`https://api.github.com${path}`, {
      body: JSON.stringify(body),
      headers,
      method,
    });

    if (response.status < 300) {
      return response.json();
    }
    // The Github API is pretty good about always returning json
    // error messages. Although it might be possible for a 500 error
    // not to return json...
    const json = await response.json();
    return Promise.reject(json);
  }
}

module.exports = GitHub;
