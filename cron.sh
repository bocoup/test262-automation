#!/usr/bin/env bash
while sleep 9m; do echo "=====[ $SECONDS seconds still running ]====="; done &
node index.js --pull-request --implementation jsc --debug --t262-git-remote "https://$GITHUB_TOKEN@github.com/test262-automation/test262.git"
