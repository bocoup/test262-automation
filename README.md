# test262-automation
Automation scripts for exporting implementor tests into test262


### Infrastructure

A Travis [cron job](https://docs.travis-ci.com/user/cron-jobs/) runs
daily on the `master` branch.

This job current calls the script defined in
[cron.sh](https://github.com/bocoup/test262-automation/blob/master/cron.sh)
which checkout a copy of webkit and sync's any changes from
JavaScriptCore's test directory to the
`implementation-contributed/javascriptcore` directory on
https://github.com/tc39/test262/.

In order successfully open a pull request a `GITHUB_TOKEN`
environmental variable needs to be injected into the travis
enviorment. This can be done via the [settings
page](https://travis-ci.org/bocoup/test262-automation/settings) for
this repo on travis. Current this is configured with a GITHUB_TOKEN
for the [test262-automation](https://github.com/test262-automation)
user.

#### Debugging

To debug issues specific to the travis enviroment you can push up a
new branch to this repo and use the the [settings
page](https://travis-ci.org/bocoup/test262-automation/settings) to
configure a new cron job on the new branch. The
[.travis.yml](https://github.com/bocoup/test262-automation/blob/master/.travis.yml)
file contains a rule to run any cron jobs not on the `master` branch
with the `--debug` flag.


