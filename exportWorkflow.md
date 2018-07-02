
#### JSC Exported File Types
1 - Test files
2 - Test File Depedencies


### PR Types
1 - new tests + report of changes
2 - new tests + modified tests + report of changes
3 - modified tests + report of changes
4 - report of changes (no test changes....what then? Is a PR of just a report ok?)

| State of File in `test262/vendor/js`c since last export|State of File in `webkit/JSTests/` since last export| File  Type | Export Resolution                                                                                                                                      | Notes                                                      |
|:------------------------------------------------------:|----------------------------------------------------|------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------|
| File has NOT been modified                             | File has NOT been modified                         | test       | Do not export file again                                                                                                                            |                                                            |
| File has been **fully** curated & deleted              | File has NOT been modified                         | test       | Do not export file again for current and all future exports                                                                                                                             | explore adding this to a do not export  list in the future |
| File has been **partially** curated and modified       | File has NOT been modified                         | test       | Do not export file again                                                                                                                               |                                                            |
| File has NOT been modified                             | File HAS been modified                             | test       | Export and override exisiting copy of file in test262                                                                        | |
| File has been **partially** curated and modified       | File HAS been modified                             | test       | Export new version of file and add it to the bottom of the modified file in test262/vendor/jsc with a large comment in between the two verisons for the block for the test262 curator | Add test to report     |
| File has been **fully** curated & deleted              | File HAS been modified                             | test       | Do not export                                                                                                                                | explore exporting it with a comment block as top |
| File has NOT been modified                             | File has been deleted                              | test       | Delete it? | |
| File has NOT been modified                             | File has been renamed/ git mv                      | test       | Rename it? | |
| File has been **partially** curated and modified       | File has been deleted                              | test       | No action, add to PR report log? | |
| File has been **partially** curated and modified       | File has been renamed/git mv                       | test       | Rename it, add to PR report log? | |
| File has been **fully** curated & deleted              | File has been deleted                              | test       | No action, add to RP report log? | |
| File has been **fully** curated & deleted              | File has been renamed/git mv                       | test       | No action, add to RP report log? | |
| File does not exist in test262/vendor/jsc yet          | Newly added JSC file which meets the export criteria | test     | Export to test262/vendor/jsc while keeping naming and directory structure intact     | |
| File does not exist in test262/vendor/jsc yet          | Newly added JSC file does NOT meet export criteria | test       | Do not export file        |

| Scenario                     | State in `test262/vendor/jsc`  since last export | State in `webkit/JSTests/`  since last export | File Type | Outcome | Export Resolution Notes |
|------------------------------|--------------------------------------------------|-----------------------------------------------|-----------|---------|-------------------------|
| TARGET_AND_SOURCE_UNMODIFIED | File has NOT been modified                       | File has NOT been modified                                              |           |         |                         |
|                              |                                                  |                                               |           |         |                         |
|                              |                                                  |                                               |           |         |                         |
|                              |                                                  |                                               |           |         |                         |
|                              |                                                  |                                               |           |         |                         |
|                              |                                                  |                                               |           |         |                         |
|                              |                                                  |                                               |           |         |                         |
|                              |                                                  |                                               |           |         |                         |
|                              |                                                  |                                               |           |         |                         |
|                              |                                                  |                                               |           |         |                         |
|                              |                                                  |                                               |           |         |                         |

| File has NOT been modified                             | File has NOT been modified                         | test       | Do not export file again                                                                                                                            |                                                            |
| File has been **fully** curated & deleted              | File has NOT been modified                         | test       | Do not export file again for current and all future exports                                                                                                                             | explore adding this to a do not export  list in the future |
| File has been **partially** curated and modified       | File has NOT been modified                         | test       | Do not export file again                                                                                                                               |                                                            |
| File has NOT been modified                             | File HAS been modified                             | test       | Export and override exisiting copy of file in test262                                                                        | |
| File has been **partially** curated and modified       | File HAS been modified                             | test       | Export new version of file and add it to the bottom of the modified file in test262/vendor/jsc with a large comment in between the two verisons for the block for the test262 curator | Add test to report     |
| File has been **fully** curated & deleted              | File HAS been modified                             | test       | Do not export                                                                                                                                | explore exporting it with a comment block as top |
| File has NOT been modified                             | File has been deleted                              | test       | Delete it? | |
| File has been **partially** curated and modified       | File has been deleted                              | test       | No action, add to PR report log? | |
| File has been **fully** curated & deleted              | File has been deleted                              | test       | No action, add to RP report log? | |


| File has NOT been modified                             | File has been renamed/ git mv                      | test       | Rename it? | |

| File has been **partially** curated and modified       | File has been renamed/git mv                       | test       | Rename it, add to PR report log? | |
| File has been **fully** curated & deleted              | File has been renamed/git mv                       | test       | No action, add to RP report log? | |
| File does not exist in test262/vendor/jsc yet          | Newly added JSC file which meets the export criteria | test     | Export to test262/vendor/jsc while keeping naming and directory structure intact     | |
| File does not exist in test262/vendor/jsc yet          | Newly added JSC file does NOT meet export criteria | test       | Do not export file        |


## Non-MVP:

#### Managing Changes to Test Dependency Files:

- For now, I am not considering some additional STATUS_SCENARIOS around what happens if/when test dependencies change.
If and when dependencies change for a set of already curated tests or tests which are partially curated, its important that we preserve coverage while curating tests, and we have to come up with a sane way to do that.

- Handling changes to excludes list and ....?

This is will require some more thought and brainstorming before implementation.


