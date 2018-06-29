#!/usr/bin/env bash
node index.js --pull-request --implementation jsc --debug --t262-git-remote "https://$GITHUB_TOKEN@github.com/test262-automation/mock-test262.git"
