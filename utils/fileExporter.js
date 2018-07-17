const debug = require('debug')("test262-automation:log");
const fs = require('fs');
const util = require('util');
const cpFile = require('cp-file');

const { EXPORT_MESSAGES, FILE_OUTCOMES } = require('./constants.js');

const {
  DO_NOT_EXPORT,
  DO_NOT_EXPORT_AND_BLOCK_FUTURE_EXPORTS,
  EXPORT_AND_OVERWRITE_PREVIOUS_VERSION,
  APPEND_MODIFIED_TARGET_WITH_NOTE_AND_NEW_SOURCE,
  RE_EXPORT_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION,
  RE_EXPORT_RENAMED_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION,
  DELETE_TARGET_FILE,
  RENAME_TARGET_FILE,
  APPEND_MODIFIED_TARGET_WITH_NOTE_ON_SOURCE_DELETION,
  RENAME_MODIFIED_TARGET_FILE_WITH_NOTE_ON_RENAME,
  EXPORT_FILE,
} = FILE_OUTCOMES;

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const appendFile = util.promisify(fs.appendFile);
const unlink = util.promisify(fs.unlink);
const rename = util.promisify(fs.rename);


class FileExporter {
  constructor(params) {
    this.curationLogsPath = params.curationLogsPath;
    this.sourceDirectory = params.sourceDirectory;
    this.targetDirectory = params.targetDirectory;
    this.exportDateTime = params.exportDateTime;
    this.fileOutcomes = params.fileOutcomes;
  }

  async init() {
    return Object.keys(this.fileOutcomes).reduce(async (promise, outcome) => {
      await promise;
      const files = this.fileOutcomes[outcome].files;

      if (files.length) {
        switch (parseInt(outcome)) {
          case DO_NOT_EXPORT: // MN DD
            return await this.updateFileReferenceInCurationLog({ files, outcome });

          case DO_NOT_EXPORT_AND_BLOCK_FUTURE_EXPORTS: // DN
            return await this.addFilesToDoNotExportList({ files, outcome });

          case EXPORT_AND_OVERWRITE_PREVIOUS_VERSION: // NM
            return await this.exportAndOverwrite({ files, outcome });

          case APPEND_MODIFIED_TARGET_WITH_NOTE_AND_NEW_SOURCE:
            return await this.exportAndAppendModifiedSource({ files, outcome });

          case RE_EXPORT_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION:
            return await this.exportModifiedSourceWithNoteOnTargetDeletion({ files, outcome });

          case RE_EXPORT_RENAMED_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION:
            return await this.reExportRenamedSourceWithSourceWithNoteOnDeletion({ files, outcome });

          case DELETE_TARGET_FILE:
            return await this.deleteTargetFile({ files, outcome });

          case RENAME_TARGET_FILE:
            return await this.renameTargetFile({ files, outcome });

          case APPEND_MODIFIED_TARGET_WITH_NOTE_ON_SOURCE_DELETION:
            return await this.appendModifiedTargetWithNoteOnDeletion({ files, outcome });
          case RENAME_MODIFIED_TARGET_FILE_WITH_NOTE_ON_RENAME:
            return await this.renameModifiedTargetWithNoteOnDeletion({ files, outcome });
          case EXPORT_FILE:
            return await this.exportFile({ files, outcome });
          default:
            throw new Error('NO OUTCOME FOUND');
        }
      }
    });
  }

  _getExportMessage({ outcome, modifiedSourceContent }) {
    let exportMessage = EXPORT_MESSAGES[outcome].replace(/{exportDateTime}/, this.exportDateTime);
    exportMessage = EXPORT_MESSAGES.TEMPLATE.replace(/{exportMessage}/, exportMessage);

    if (modifiedSourceContent) {
      exportMessage = `${exportMessage}
      ${modifiedSourceContent}`;
    }

    return exportMessage;
  }

  async reExportRenamedSourceWithSourceWithNoteOnDeletion({ files, outcome }) {
    files.forEach(async (filePath) => {
      const [
        /* renameWithPercent is unused */,
        /* oldFilePath is unused */,
        newFilePath
      ] = filePath.split(',');
      await this._copySourceFileToTarget(newFilePath);
      const appendData = await this._getExportMessage({ outcome });
      await this._appendToTargetFile({ appendData, filePath: newFilePath });
    });
  }

  async _readModifiedSourceFile(filePath) {
    return await readFile(`${this.sourceDirectory}${filePath}`, 'utf8');
  }

  async _updateTargetFile({ newTarget, filePath }) {
    return await writeFile(`${this.targetDirectory}${filePath}`, newTarget);
  }

  async _appendToTargetFile({ appendData, filePath }) {
    return await appendFile(`${this.targetDirectory}${filePath}`, appendData);
  }

  async _copySourceFileToTarget(filePath) {
    // TODO does file already exist there?
    return await cpFile(`${this.sourceDirectory}${filePath}`, `${this.targetDirectory}${filePath}`, { overwrite: false });
  }

  async _copySourceFileToRenamedTarget(newFilePath) {
    return await cpFile(`${this.sourceDirectory}${newFilePath}`, `${this.targetDirectory}${newFilePath}`);
  }

  async updateFileReferenceInCurationLog({ files, outcome }) {
    console.log('files', files);
    console.log('outcome', outcome);
  }

  async addFilesToDoNotExportList({ files /*, outcome is unused */ }) {
    const curationLog = await readFile(this.curationLogsPath);
    const curationLogData = JSON.parse(curationLog);

    debug('curationLogData BEFORE', curationLogData);

    files.forEach((filePath) => {
      curationLogData.curatedFiles[filePath] = 'DELETED_IN_TARGET';
    });

    debug('curationLogData AFTER', curationLogData);

    await writeFile(this.curationLogsPath, JSON.stringify(curationLogData, null, 2));
  }

  // TODO maybe use a copy cmd here instead?
  async exportAndOverwrite({ files /*, outcome is unused */ }) {
    files.forEach(async (filePath) => {
      const newSource = await this._readModifiedSourceFile(filePath);

      await this._updateTargetFile({ filePath, newTarget: newSource });
    });
  }

  async exportAndAppendModifiedSource({ files, outcome }) {
    files.forEach(async (filePath) => {
      const modifiedSourceContent = await this._readModifiedSourceFile(filePath);
      const appendData = this._getExportMessage({ outcome, modifiedSourceContent });

      await this._appendToTargetFile({ appendData, filePath });
    });
  }

  async exportModifiedSourceWithNoteOnTargetDeletion({ files, outcome }) {
    files.forEach(async (filePath) => {
      await this._copySourceFileToTarget(filePath);
      const appendData = await this._getExportMessage({ outcome });
      await this._appendToTargetFile({ appendData, filePath });
    });
  }

  async deleteTargetFile({ files /*, outcome is unused */ }) {
    files.forEach(async filePath => await unlink(`${this.targetDirectory}${filePath}`));
  }

  async renameTargetFile({ files /*, outcome is unused */ }) {
    files.forEach(async (filePath) => {
      const [renameWithPercent, oldFilePath, newFilePath] = filePath.split(',');
      await rename(`${this.targetDirectory}${oldFilePath}`, `${this.targetDirectory}${newFilePath}`);

      if (renameWithPercent !== 'R100') {
        await this._copySourceFileToRenamedTarget(newFilePath);
      }
    });
  }

  async appendModifiedTargetWithNoteOnDeletion({ files, outcome }) {
    files.forEach(async (filePath) => {
      const appendData = await this._getExportMessage({ outcome });
      await this._appendToTargetFile({ appendData, filePath });
    });
  }

  async renameModifiedTargetWithNoteOnDeletion({ files, outcome }) {
    files.forEach(async (filePath) => {
      const [renameWithPercent, oldFilePath, newFilePath] = filePath.split(',');

      await rename(`${this.targetDirectory}${oldFilePath}`, `${this.targetDirectory}${newFilePath}`);

      if (renameWithPercent !== 'R100') {
        await this._copySourceFileToTarget(newFilePath);
      }
      const appendData = await this._getExportMessage({ outcome });
      await this._appendToTargetFile({ appendData, filePath: newFilePath });
    });
  }

  async exportFile({ files /*, outcome is unused */ }) {
    files.forEach(async (filePath) => {
      await this._copySourceFileToTarget(filePath);
    });
  }
}

module.exports = {
  FileExporter,
};
