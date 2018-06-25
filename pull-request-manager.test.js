const PullRequestManager = require('./pull-request-manager');


describe('PullRequestManager', function() {

  test('branchname should be the prefix plus a short sha', function() {
    let manager = new PullRequestManager({
      config: {
        sourceShaRevision: 'a8f7012587250b32ffb43a3cbd8da8a9f9d1565e',
        branchPrefix: 'export-jsc',
      },
    });

    expect(manager.branchName()).toBe('export-jsc-a8f7012')
  });

  test('it opens a pull request and adds a label', async function() {
    let git = {
      checkoutBranch() {},
      addAll() {},
      commit() {},
      push() {},
    };
    let github = {
        openPullRequest: jest.fn(() => Promise.resolve({number: 1})),
        addLabel: jest.fn(() => Promise.resolve({number: 1})),
      };
    let manager = new PullRequestManager({
      git,
      github,
      config: {
        sourceShaRevision: 'a8f7012587250b32ffb43a3cbd8da8a9f9d1565e',
        branchPrefix: 'export-jsc',
        label: 'export-vendor'
      },
    });

    await manager.pushPullRequest();
    
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
        config: {
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
        config: {
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
