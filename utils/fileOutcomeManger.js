const { fileOutcomes, fileStatues , scenarios , exportActions } = require("./constants.js");
const get = require("lodash.get");
const { FileExporter } = require('./fileExporter.js');

const {
    ADDED,
    MODIFIED,
    DELETE,
    RENAMED,
    NO_CHANGE
} = fileStatues;

const {
    DO_NOT_EXPORT,
    DO_NOT_EXPORT_AND_BLOCK_FUTURE_EXPORTS,
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

const {
    ADD_TO_DO_NOT_EXPORT_LIST,
    UPDATE_REFERENCE_IN_DO_NOT_EXPORT_LIST,
    REMOVE_FROM_DO_NOT_EXPORT_LIST,
    OVERWRITE_FILE,


} = exportActions;

class FileOutcomeManager {

    constructor(params) {
        this.targetDiffList = params.targetDiffListObj;
        this.sourceDiffList = params.sourceDiffListObj;
        this.targetAndSourceDiffList = params.targetAndSourceDiffListObj;
        this.fileExporter = params.fileExporter;
        this.fileOutcomes = {
            [DO_NOT_EXPORT]: {
                description: ['DO_NOT_EXPORT.....'],
                files: [],
            },
            [DO_NOT_EXPORT_AND_BLOCK_FUTURE_EXPORTS]: {
                description: ['DO_NOT_EXPORT_AND_BLOCK_FUTURE_EXPORTS.....'],
                files: [],
            },
            [EXPORT_AND_OVERWRITE_PREVIOUS_VERSION]: {
                description: ['EXPORT_AND_OVERWRITE_PREVIOUS_VERSION.....'],
                files: [],
            },
            [APPEND_MODIFIED_TARGET_WITH_NOTE_AND_NEW_SOURCE]: {
                description: ['APPEND_MODIFIED_TARGET_WITH_NOTE_AND_NEW_SOURCE.....'],
                files: [],
            },
            [RE_EXPORT_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION]: {
                description: ['RE_EXPORT_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION.....'],
                files: [],
            },
            [RE_EXPORT_RENAMED_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION]: {
                description: ['RE_EXPORT_RENAMED_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION.....'],
                files: [],
            },
            [RE_EXPORT_SOURCE_NEW_EXTENSION_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION_AND_EXTENSION]: {
                description: ['RE_EXPORT_SOURCE_NEW_EXTENSION_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION_AND_EXTENSION.....'],
                files: [],
            },
            [DELETE_TARGET_FILE]: {
                description: ['DELETE_TARGET_FILE.....'],
                files: [],
            },
            [RENAME_TARGET_FILE]: {
                description: ['RENAME_TARGET_FILE.....'],
                files: [],
            },
            [APPEND_MODIFIED_TARGET_WITH_NOTE_ON_SOURCE_DELETION]: {
                description: ['APPEND_MODIFIED_TARGET_WITH_NOTE_ON_SOURCE_DELETION.....'],
                files: [],
            },
            [RENAME_MODIFIED_TARGET_FILE_WITH_NOTE_ON_RENAME]: {
                description: ['RENAME_MODIFIED_TARGET_FILE_WITH_NOTE_ON_RENAME.....'],
                files: [],
            },
            [UPDATE_EXTENSION_ON_MODIFIED_TARGET_FILE_WITH_NOTE_ON_EXTENSION_CHANGE]: {
                description: ['UPDATE_EXTENSION_ON_MODIFIED_TARGET_FILE_WITH_NOTE_ON_EXTENSION_CHANGE.....'],
                files: [],
            },
            [EXPORT_FILE]: {
                description: ['EXPORT_FILE.....'],
                files: [],
            },
            [UPDATE_EXTENSION_ON_TARGET_FILE]: {
                description: ['UPDATE_EXTENSION_ON_TARGET_FILE.....'],
                files: [],
            }
        };
    }

    init() {

        this.getFileOutcomes();

        Object.keys(this.fileOutcomes).forEach(async (outcome) => {

            const files = this.fileOutcomes[outcome].files;

            switch (fileOutcomes[outcome]) {

                case [DO_NOT_EXPORT]:
                    break;

                case [DO_NOT_EXPORT_AND_BLOCK_FUTURE_EXPORTS]:
                    await this.fileExporter.addFilesToDoNotExportList(files);

                case [EXPORT_AND_OVERWRITE_PREVIOUS_VERSION]:
                    await this.fileExporter.exportAndOverwrite(files);

                case [APPEND_MODIFIED_TARGET_WITH_NOTE_AND_NEW_SOURCE]:
                    await this.fileExporter.exportAndAppendModifiedSource(files);


            }

            });
     }

    getFileOutcomes() {

        Object.keys(this.targetAndSourceDiffList).forEach((filePath) => {

            const renamedFile = get(this.sourceDiffList, filePath, '').split(',')[1];
            const filePathOptions = this.fileExporter.getFilePathOptions({ filePath, renamedFile });
            const {  baseFilePath, renamedBaseFilePath, sourceFilePath, targetFilePath } = filePathOptions;

            const targetStatus = get(this.targetDiffList, targetFilePath, NO_CHANGE);
            const sourceStatus = get(this.sourceDiffList, sourceFilePath, NO_CHANGE).split(',')[0]; // support for renames
            const statusScenario = scenarios[`${targetStatus}${sourceStatus}`];


            if(this.fileOutcomes[statusScenario]) {

                if (renamedFile) {

                    const oldAndRenamedFile = `${baseFilePath},${renamedBaseFilePath}`;
                    this.fileOutcomes[statusScenario].files.push(oldAndRenamedFile);

                } else {
                    this.fileOutcomes[statusScenario].files.push(baseFilePath);
                }

            } else {
                if(statusScenario === 'bug') {
                    console.error('BUG')
                } else {
                    throw new Error(`UNSUPPORTED_SCENARIO: statusScenario is ${statusScenario} for file ${filePath}`);
                }
            }
        });

        return this.fileOutcomes;
    }
}


module.exports = {
    FileOutcomeManager
};
