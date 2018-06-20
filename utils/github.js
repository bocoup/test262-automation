const fetch = require('isomorphic-fetch');
const assert = require('assert');

const T262_GH_ORG = process.env.T262_GH_ORG || 'tc39';
const T262_GH_REPO_NAME = process.env.T262_GH_REPO_NAME || 'test262';
const T262_BASE_BRANCH = process.env.T262_BASE_BRANCH || 'master';
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'test262-automation';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const FETCH_SYM = Symbol('fetch')
const TOKEN_SYM = Symbol('token')

class GitHub {

  constructor(githubToken=GITHUB_TOKEN, _fetch=fetch) {
    // use a symbol to make rick happy
    this[FETCH_SYM] = _fetch
    this[TOKEN_SYM] = githubToken
    assert(this[TOKEN_SYM], 'No github token found. Please set the GITHUB_TOKEN enviroment variable before attempting to open a pull request.');
  }

  /**
     Opens a pull request on the test262 repo.

     POST /repos/:owner/:repo/pulls
     https://developer.github.com/v3/pulls/#create-a-pull-request
  */
  openPullRequest(branchName, title, body) {
    let headers = {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'content-type': 'application/json'
    };

    return this.request({
      path: `/repos/${T262_GH_ORG}/${T262_GH_REPO_NAME}/pulls`,
      method: 'POST',
      body: {
        title,
        body,
        head: `${GITHUB_USERNAME}:${branchName}`,
        base: T262_BASE_BRANCH,
        maintainer_can_modify: true,
      }
    })
  }

  /**
     Adds a label to a GitHub pr (or issue).

     https://developer.github.com/v3/issues/labels/#add-labels-to-an-issue
  */
  addLabel(pr_number, label) {
    let headers = {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'content-type': 'application/json'
    };

    return this.request({
      method: 'POST',
      path: `/repos/${T262_GH_ORG}/${T262_GH_REPO_NAME}/issues/${pr_number}/labels`,
      body: [label]
    })
  }

  request({method, path, body}) {
    let headers = {
      Authorization: `token ${this[TOKEN_SYM]}`,
      Accept: 'application/vnd.github.v3+json',
      'content-type': 'application/json'
    };

    return this[FETCH_SYM]('https://api.github.com' + path, {
      body: JSON.stringify(body),
      headers,
      method: 'POST'
    }).then(response => {
      if (response.status === 200) {
        return response.json();
      } else {
        // Github is pretty good about returning json error
        // messages. Although it might be possible for a 500 error not
        // to return json...
        return response.json().then(json => Promise.reject(json));
      }
    });
  }
}

module.exports = GitHub;
