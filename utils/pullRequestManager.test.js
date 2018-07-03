const { PullRequestManager } = require('./pullRequestManager');


describe('PullRequestManager', () => {
  test('it opens a pull request and adds a label', async () => {
    const reporter = {
      generateReport: () => '',
    };
    const github = {
      openPullRequest: jest.fn(() => Promise.resolve({ number: 1 })),
      addLabel: jest.fn(() => Promise.resolve({ number: 1 })),
    };
    const manager = new PullRequestManager({
      reporter,
      github,
      implConfig: {
        sourceShaRevision: 'a8f7012587250b32ffb43a3cbd8da8a9f9d1565e',
        branchPrefix: 'export-jsc',
        pullRequestLabels: ['export-vendor'],
      },
    });

    await manager.pushPullRequest({});

    expect(github.addLabel).toBeCalledWith({
      number: 1,
      labels: ['export-vendor'],
    });
  });

  describe('#uploadPullRequest', () => {
    test('opens a new pull request', async () => {
      const github = {
        openPullRequest: jest.fn(() => Promise.resolve()),
      };
      const manager = new PullRequestManager({
        implConfig: {
          sourceShaRevision: 'a8f7012587250b32ffb43a3cbd8da8a9f9d1565e',
          branchPrefix: 'export-jsc',
        },
        github,
      });

      await manager.uploadPullRequest('params');

      expect(github.openPullRequest).toBeCalledWith('params');
    });


    test('it updates an existing pull request if one already exists', async () => {
      const github = {
        openPullRequest: jest.fn(() => Promise.reject({
          errors: [{ message: 'A pull request already exists' }],
        })),
        updatePullRequest: jest.fn(() => Promise.resolve()),
      };
      const manager = new PullRequestManager({
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
