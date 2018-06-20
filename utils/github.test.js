const GitHub = require('./github');

test('throws an assertion if there is no github token', () => {
  expect(() => {
    new GitHub(null)
  }).toThrow('No github token found');
});

test('opens a pull request using the github api', () => {
  let fetch = jest.fn(() => Promise.resolve({status: 200, json: () => Promise.resolve()}))
  let gitHub = new GitHub('secret-github-token', fetch)

  gitHub.openPullRequest('my-branch', 'title', 'description')

  expect(fetch).toBeCalledWith(
    'https://api.github.com/repos/tc39/test262/pulls', {
      body: JSON.stringify({
        title: 'title',
        body: 'description',
        head: 'test262-automation:my-branch',
        base: 'master',
        maintainer_can_modify: true,
      }),
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: 'token secret-github-token',
        'content-type': 'application/json',
      },
      method: 'POST',
    });
});

test('resolves with the json returned by github when the status is 200', () => {
  let fetch = jest.fn(() => Promise.resolve({
    status: 200,
    json: () => Promise.resolve({ pullRequest: 123 })
  }))
  let gitHub = new GitHub('secret-github-token', fetch)

  return expect(gitHub.openPullRequest('my-branch', 'title', 'description')).resolves.toEqual({
    pullRequest: 123
  });
});

test('rejects with the json response when the status code is not 200', () => {
  let fetch = jest.fn(() => Promise.resolve({
    status: 422,
    json: () => Promise.resolve({ message: 'Validation Failed' })
  }))
  let gitHub = new GitHub('secret-github-token', fetch)

  return expect(gitHub.openPullRequest('my-branch', 'title', 'description')).rejects.toEqual({
    message: 'Validation Failed'
  });
});

test('adds a label to an existing pull request', () => {
  let fetch = jest.fn(() => Promise.resolve({status: 200, json: () => Promise.resolve()}))
  let gitHub = new GitHub('secret-github-token', fetch)

  gitHub.addLabel(123, 'test-label')

  expect(fetch).toBeCalledWith(
    'https://api.github.com/repos/tc39/test262/issues/123/labels', {
      body: JSON.stringify(['test-label']),
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: 'token secret-github-token',
        'content-type': 'application/json',
      },
      method: 'POST',
    });
});
