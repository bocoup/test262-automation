const axios = require('axios');
const assert = require('assert');

const T262_GH_ORG = process.env.T262_GH_ORG || 'tc39';
const T262_GH_REPO_NAME = process.env.T262_GH_REPO_NAME || 'test262';
const T262_BASE_BRANCH = process.env.T262_BASE_BRANCH || 'master';
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'test262-automation';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

/**
   Opens a pull request on the test262 repo. Requires the
   `GITHUB_TOKEN` enviroment variable to be set.
*/
function openPullRequest(branchName, title, body, axios=axios) {
  assert(GITHUB_TOKEN, 'No github token found. Please set the GITHUB_TOKEN enviroment variable before attempting to open a pull request.');
  let headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json'
  };

  // POST /repos/:owner/:repo/pulls
  // https://developer.github.com/v3/pulls/#create-a-pull-request
  return axios.post(`https://api.github.com/repos/${T262_GH_ORG}/${T262_GH_REPO_NAME}/pulls`, {
    title,
    body,
    head: `${GITHUB_USERNAME}:${branchName}`,
    base: T262_BASE_BRANCH,
    maintainer_can_modify: true,
  }, { headers });
}


module.exports = {
  openPullRequest
};
