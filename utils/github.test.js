const rewire = require('rewire');

const GitHub = rewire('./github');

describe('Github Util', () => {
  const token = 'secret-github-token';
  const mockRequestConfig = body => ({
    body: JSON.stringify(body),
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${token}`,
      'content-type': 'application/json',
    },
    method: 'POST',
  });
  const config = {
    githubToken: token,
    t252GithubOrg: 'tc39',
    t252GithubRepoName: 'test262',
    t252BaseBranch: 'master',
    t252GithubUsername: 'test262-automation',
  };

  let fetch,
    gitHub;
  beforeEach(() => {
    fetch = jest.fn(() => Promise.resolve({ status: 200, json: () => ({ api: 'response' }) }));
    GitHub.__set__('fetch', fetch);

    gitHub = new GitHub(config);
  });

  test('throws an assertion if there is no github token', () => {
    expect(() => {
      new GitHub({});
    }).toThrow('No github token found');
  });

  describe('#postRequest', () => {
    test('resolves with the json returned by github when the status is 200', () => expect(gitHub.postRequest({})).resolves.toEqual({
      api: 'response',
    }));

    test('rejects with the json response when the status code is not 200', () => {
      const fetch = jest.fn(() => Promise.resolve({
        status: 422,
        json: () => Promise.resolve({ message: 'Validation Failed' }),
      }));
      GitHub.__set__('fetch', fetch);
      const gitHub = new GitHub(config, fetch);

      return expect(gitHub.postRequest({})).rejects.toEqual({
        message: 'Validation Failed',
      });
    });
  });

  describe('#openPullRequest', () => {
    test('opens a pull request using the github api', async () => {
      await expect(gitHub.openPullRequest({
        branchName: 'my-branch',
        title: 'title',
        body: 'description',
      })).resolves.toEqual({ api: 'response' });

      expect(fetch).toBeCalledWith(
        'https://api.github.com/repos/tc39/test262/pulls',
        mockRequestConfig({
          title: 'title',
          body: 'description',
          head: 'test262-automation:my-branch',
          base: 'master',
          maintainer_can_modify: true,
        }),
      );
    });
  });

  describe('#addLabel', () => {
    test('adds a label to an existing pull request using the github api', async () => {
      await expect(gitHub.addLabel({
        number: 123,
        labels: ['test-label'],
      })).resolves.toEqual({ api: 'response' });

      expect(fetch).toBeCalledWith(
        'https://api.github.com/repos/tc39/test262/issues/123/labels',
        mockRequestConfig(['test-label']),
      );
    });
  });
});
