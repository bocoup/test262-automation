const { PullRequestManager } = require('./pullRequestManager');


describe('PullRequestManager', function() {

  test('it opens a pull request and adds a label', async function() {
    let reporter = {
      generateReport: () => ''
    };
    let github = {
        openPullRequest: jest.fn(() => Promise.resolve({number: 1})),
        addLabel: jest.fn(() => Promise.resolve({number: 1})),
      };
    let manager = new PullRequestManager({
      reporter,
      github,
      implConfig: {
        sourceShaRevision: 'a8f7012587250b32ffb43a3cbd8da8a9f9d1565e',
        branchPrefix: 'export-jsc',
        pullRequestLabels: ['export-vendor']
      },
    });

    await manager.pushPullRequest({});
    
    expect(github.addLabel).toBeCalledWith({
      number: 1,
      labels: ['export-vendor']
    });
  });

  describe('#uploadPullRequest', function() {
    test('opens a new pull request', async function() {
      let github = {
        openPullRequest: jest.fn(() => Promise.resolve())
      };
      let manager = new PullRequestManager({
        implConfig: {
          sourceShaRevision: 'a8f7012587250b32ffb43a3cbd8da8a9f9d1565e',
          branchPrefix: 'export-jsc',
        },
        github,
      });

      await manager.uploadPullRequest('params');

      expect(github.openPullRequest).toBeCalledWith('params');
    });


    test('it updates an existing pull request if one already exists', async function() {
      let github = {
        openPullRequest: jest.fn(() => Promise.reject({
          errors: [{ message: 'A pull request already exists' }]
        })),
        updatePullRequest: jest.fn(() => Promise.resolve())
      };
      let manager = new PullRequestManager({
        implConfig: {
          sourceShaRevision: 'a8f7012587250b32ffb43a3cbd8da8a9f9d1565e',
          branchPrefix: 'export-jsc',
        },
        github,
      });

      await manager.uploadPullRequest('params');

      expect(github.openPullRequest).toBeCalledWith('params');
      expect(github.updatePullRequest).toBeCalledWith('params');
    });
  });
});
