let fetch = require('isomorphic-fetch');
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

    this[T262_GH_ORG] = config.t252GithubOrg;
    this[T262_GH_REPO_NAME] = config.t252GithubRepoName;
    this[T262_BASE_BRANCH] = config.t252BaseBranch;
    this[GITHUB_USERNAME] = config.t252GithubUsername;
    this[GITHUB_TOKEN] = config.githubToken;

    assert(this[GITHUB_TOKEN], 'No github token found. Please set the GITHUB_TOKEN enviroment variable before attempting to open a pull request.');
  }

  /**
     Opens a pull request on the test262 repo.

     POST /repos/:owner/:repo/pulls
     https://developer.github.com/v3/pulls/#create-a-pull-request
  */
  openPullRequest({branchName, title, body}) {
    return this.postRequest({
      path: `/repos/${this[T262_GH_ORG]}/${this[T262_GH_REPO_NAME]}/pulls`,
      body: {
        title,
        body,
        head: `${this[GITHUB_USERNAME]}:${branchName}`,
        base: this[T262_BASE_BRANCH],
        maintainer_can_modify: true,
      }
    });
  }

  /**
     Adds a label to a GitHub pr (or issue).

     POST /repos/:owner/:repo/issues/:number/labels
     https://developer.github.com/v3/issues/labels/#add-labels-to-an-issue
  */
  addLabel({number, labels}) {
    return this.postRequest({
      path: `/repos/${this[T262_GH_ORG]}/${this[T262_GH_REPO_NAME]}/issues/${number}/labels`,
      body: labels
    });
  }


  async postRequest({path, body}) {
    let headers = {
      Authorization: `token ${this[GITHUB_TOKEN]}`,
      Accept: 'application/vnd.github.v3+json',
      'content-type': 'application/json'
    };

    let response = await fetch('https://api.github.com' + path, {
      body: JSON.stringify(body),
      headers,
      method: 'POST'
    });

    if (response.status === 200) {
      return response.json();
    } else {
      // The Github API is pretty good about always returning json
      // error messages. Although it might be possible for a 500 error
      // not to return json...
      let json = await response.json();
      return Promise.reject(json);
    }
  }
}

module.exports = GitHub;
