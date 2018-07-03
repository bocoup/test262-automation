# test262-automation
Automation scripts for exporting implementor tests into test262

### Usage

_Requires Node Version 10.5+_

```
npm install
node index.js -implemation "IMPLEMATION" -p
```

For a list of avaliable implemations:
```
node index.js --help
```

```
Usage: test262-automation -implementation [implementation] [options]

Options:
  --help                            Show help                          [boolean]
  --version                         Show version number                [boolean]
  --debug
  --pull-request, -p                                            [default: false]
  --implementation, -i              Specify implementor engine
                                            [string] [required] [choices: "jsc"]
  --t262-github-org                 The github org or user that owns the test262
                                    repo
  --t262-github-repo-name           The name of the test262 repo on github
  --t262-github-base-branch         The branch on test262 to target when opening
                                    a pr
  --t262-github-username            The user that will open a pull request
  --t262-github-remote              The git remote on github to push the branch
                                    with changes
  --github-token                    A github Oauth token for the user that will
                                    be used to open the pull request
  --target-git                      The git repo to use as the target for
                                    applying changes
  --target-revision-at-last-export  The starting sha or branch to use when
                                    comparing changes since the last sync
  --target-branch                   The branch to sync changes too.
  --source-git                      The git repo to use as the source of the
                                    changes to sync
  --source-revision-at-last-export  The starting sha or branch to use when
                                    comparing changes since the last sync
  --source-branch                   The branch to sync changes from
 ```


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


