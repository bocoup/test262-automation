# Test262 Automation - Roadmap for MVP Export Workflow

Any *`non-mvp`* features or tasks are annotated with this flag

- [x] Discovery and Design [3.5d]

### Infrastructure
- [x] Scaffold new repo with basic cli, implementation configs required for running scripts, basic logging and execution entry points [1.5d]
- [ ] Add logger util with support for debug, info, error, warn modes & piping outputs to both log files and console [1.5d]
- [ ] Extend the CLI with support for overriding config values and flags for setting modes & log levels [0.5d]
- [ ] Extend the CLI with support for validating supported implementations via config files [0.5d]
- [ ] `non-mvp` Extend the CLI with support for auto generating a new config file [1d]

### Git Utils & Setup
- [x] Create a config based GitManager util for handling cloning target & source repos to a temp os directory, and checking out uniquely hashed branches [1d]
- [x] Extend git util with support for fetching and comparing diff's between the target, and source repos using the sha in config as a baseline (HEAD >--< SHA) [2d]
- [x] Extend git util with support for filtering diff name & status lists to include target & source directory and exclude glob path patterns in config [1d]
- [x] Extend git util with support for transforming the filtered diff name & status lists for safer parsing, and publish final lists to files in the working os temp dir [0.5d]
- [ ] Extend git util with support for making a commit [0.5d]
- [ ] Extend git with support for a clean up script on success to remove all created, files, logs, and reports [0.5d]

### File Scenarios, Outcomes and Exporting
- [x] Create for FileOutcome manager which consumes the diff lists and enumarated file scenerios constants to determine a outcome for if, and how a file should be exported [2d]
- [x] Create a scaffold for FileExporter util for handling input of file status and name diff lists and output of the FileOutcome to taking apporiation action [1d]
- [ ] `in-progress` Extend FileExporter with a Queue manager for batching and grouping exports with shared outcomes [0.5d]
-  See (ADD WIKI link) for more details on target & source file scenerios and their matched outcomes. [5d] in total for all scenerio
    - [x] Scenerio: `DELETED_IN_TARGET_UNMODIFIED_SOURCE` --> Outcome: `ADD_TO_DO_NOT_EXPORT_LIST`
    - [x] Scenerio: `ONLY_MODIFIED_IN_TARGET` Outcome: ``
    - TODO @ amal add link and update this section

### Tooling
- [ ] Add linter, scripts for setting up npm publish & version bumps, support for git prehook commits to run scripts on push [1d]

### Testing
- [ ] Developer testing + bug fixing of completed automated mvp workflow with live and mock data to shake out missed error handling, feature support or bugs [5d]
- [ ] Adding unit tests for all JS scripts and utils [3d]
- [ ] Addding unit tests for the JSON config structure and templates to ensure keys & values, and value type contract. Input data will be real config files. [0.5d]
- [ ] Create mock repos for to simulate webkit and test262 [2d]

### Reports,Logs and Pull Request
- [ ] Create a PullRequestManager for creating pull requests with labels when the FileExporter has completed making it changes [1d]
- [ ] Extend PullRequestManager to create a summary report to be included in target PR and call the git util clean up script on success [1.5d]

### Automation
- [ ] make github user account, with forks of target and source projects and setup travis account with github user credentials [0.5d]
- [ ] create cron job for running exporter script with jsc as the specific engine [1.5d]
- [ ] `non-mvp` Create job for running tests, linter, etc on PR requests and post results [1d]

### Documentation
- [ ] Add documention to READme with usage guide, etc [1d]