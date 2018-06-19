process.env.GITHUB_TOKEN = 'secret-github-token'
const { openPullRequest } = require('./pr');

test('opens a pull request using the github api', () => {
  let mockAxios = {
    post: jest.fn()
  }

  openPullRequest('my-branch', 'title', 'description', mockAxios)

  expect(mockAxios.post).toBeCalledWith(
    'https://api.github.com/repos/tc39/test262/pulls', {
      base: 'master',
      body: 'description',
      head: 'test262-automation:my-branch',
      maintainer_can_modify: true,
      title: 'title',
    }, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: 'token secret-github-token',
      }
    });
});
