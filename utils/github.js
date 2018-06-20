const isomorphicFetch = require('isomorphic-fetch');
const assert = require('assert');

const T262_GH_ORG = process.env.T262_GH_ORG || 'tc39';
const T262_GH_REPO_NAME = process.env.T262_GH_REPO_NAME || 'test262';
const T262_BASE_BRANCH = process.env.T262_BASE_BRANCH || 'master';
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'test262-automation';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const FETCH_SYM = Symbol('fetch');
const TOKEN_SYM = Symbol('token');

class GitHub {

  constructor(githubToken=GITHUB_TOKEN, fetch=isomorphicFetch) {
    this[FETCH_SYM] = fetch;
    this[TOKEN_SYM] = githubToken;
    assert(this[TOKEN_SYM], 'No github token found. Please set the GITHUB_TOKEN enviroment variable before attempting to open a pull request.');
  }

  /**
     Opens a pull request on the test262 repo.

     POST /repos/:owner/:repo/pulls
     https://developer.github.com/v3/pulls/#create-a-pull-request
  */
  openPullRequest(branchName, title, body) {
    return this.request({
      path: `/repos/${T262_GH_ORG}/${T262_GH_REPO_NAME}/pulls`,
      body: {
        title,
        body,
        head: `${GITHUB_USERNAME}:${branchName}`,
        base: T262_BASE_BRANCH,
        maintainer_can_modify: true,
      }
    });
  }

  /**
     Adds a label to a GitHub pr (or issue).

     POST /repos/:owner/:repo/issues/:number/labels
     https://developer.github.com/v3/issues/labels/#add-labels-to-an-issue
  */
  addLabel(number, label) {
    return this.request({
      path: `/repos/${T262_GH_ORG}/${T262_GH_REPO_NAME}/issues/${number}/labels`,
      body: [label]
    });
  }


  async request({path, body}) {
    let headers = {
      Authorization: `token ${this[TOKEN_SYM]}`,
      Accept: 'application/vnd.github.v3+json',
      'content-type': 'application/json'
    };

    let response = await this[FETCH_SYM]('https://api.github.com' + path, {
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
