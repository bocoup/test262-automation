const { fileOutcomes, fileStatues , scenarios } = require("./constants.js");

const {
    ADDED,
    MODIFIED,
    DELETE,
    RENAMED,
    NO_CHANGE } = fileStatues;

const {
    DO_NOT_EXPORT,
    DO_NOT_EXPORT_AND_ADD_TO_DO_NOT_EXPORT_LIST,
    EXPORT_AND_OVERWRITE_PREVIOUS_VERSION,
    APPEND_MODIFIED_TARGET_WITH_NOTE_AND_NEW_SOURCE,
    RE_EXPORT_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION,
    RE_EXPORT_RENAMED_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION,
    RE_EXPORT_SOURCE_NEW_EXTENSION_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION_AND_EXTENSION,
    DELETE_TARGET_FILE,
    RENAME_TARGET_FILE,
    APPEND_MODIFIED_TARGET_WITH_NOTE_ON_SOURCE_DELETION,
    RENAME_MODIFIED_TARGET_FILE_WITH_NOTE_ON_RENAME,
    UPDATE_EXTENSION_ON_MODIFIED_TARGET_FILE_WITH_NOTE_ON_EXTENSION_CHANGE,
    EXPORT_FILE,
    UPDATE_EXTENSION_ON_TARGET_FILE
} = fileOutcomes;

class FileOutcomeManager {

    constructor({ targetDiffListPath , sourceDiffListPath, targetAndSourceDiffListPath }) {
        this.targetDiffList = require(targetDiffListPath);
        this.sourceDiffList = require(sourceDiffListPath);
        this.targetAndSourceDiffList = require(targetAndSourceDiffListPath);
    }

    init() {

        let targetStatus = null;
        let sourceStatus = null;
        let fileOutcome = {
            exportActions: [],
            curationList: []
        }; // TODO default no no-op or error of nothing matched

        for (let file in this.targetAndSourceDiffList ) {

            // handle renames first

            targetStatus = this.targetDiffList[file] || NO_CHANGE;
            sourceStatus = this.sourceDiffList[file] || NO_CHANGE;

            const statusScenario = this.getFileOutcome({ targetStatus, sourceStatus });

            switch (scenarios[statusScenario]) {

                case fileOutcomes[DO_NOT_EXPORT]:
                    fileOutcome = []
            }
        }
    }

    // init() {
    //     this.targetStatus = this.setTargetFileStatus(); // TODO combine parameterize & combine into one func
    //     this.sourceStatus = this.setSourceStatus();
    //
    //     this.fileOutcome = this.getFileOutcome();
    // }

    setTargetFileStatus() {}

    //getFileOutcome() {}

     getFileOutcome(targetStatus, sourceStatus) {

        // noop scenarios
        /*
        **** target and source not modified - no-op

        */

        //
        // // Supported Scenarios
        // const DELETED_IN_TARGET_UNMODIFIED_SOURCE = targetStatus === DELETE && sourceStatus === NOT_APPLICABLE; // --> outcome --> add to do-not-export list
        // const ONLY_MODIFIED_IN_TARGET = targetStatus === MODIFIED && sourceStatus === NOT_APPLICABLE; // --> outcome no-op
        // const ONLY_MODIFIED_IN_SOURCE = targetStatus === NOT_APPLICABLE && sourceStatus === MODIFIED; // --> outcome export and overWrite
        // const MODIFIED_IN_SOURCE_AND_TARGET = targetStatus === MODIFIED && sourceStatus === MODIFIED; // --> outcome append target with new source
        // const DELETED_IN_TARGET_AND_MODIFIED_IN_SOURCE = targetStatus === DELETE && sourceStatus === MODIFIED; // copy again with note?
        // // DELETED_IN_SOURCE_AND_UNMODIFIED_IN_TARGET =
        // // DELETED_IN_SOURCE_AND_MODIFIED_IN_TARGET =
        // //
        // switch(scenerio) {
        //     case DELETED_IN_TARGET_UNMODIFIED_SOURCE: {
        //
        //     }
        //
        // }
    }
}


module.exports = {
    FileOutcomeManager
};

// Open Question:
// not expecting new tests to be added in Target, but if they are added, what do we do
