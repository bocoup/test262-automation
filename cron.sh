#!/usr/bin/env bash

BRANCH="test-branch-`date +%Y-%m-%d`"
git checkout -B $BRANCH
touch update-log.txt
echo "Updated at `date`" >> update-log.txt
git add update-log.txt
git commit -m "cron update"
git push https://$GITHUB_TOKEN@github.com/bocoup/test262-automation.git +$BRANCH
git checkout -

