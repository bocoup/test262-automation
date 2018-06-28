const fs = require('fs');
const util = require('util');
const cpFile = require('cp-file');

const fsPromises = fs.promises;
const { EXPORT_MESSAGES } = require('./constants.js');
const get = require('lodash.get');
const { GitUtil } = require('./git.js');


const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const appendFile = util.promisify(fs.appendFile);
const unlink = util.promisify(fs.unlink);
const rename = util.promisify(fs.rename);

class FileExporter {

  constructor(params) {
    this.curationLogsPath = params.curationLogsPath;
    this.modifiedFileTemplatePath = params.modifiedFileTemplatePath;
    this.sourceDirectory = params.sourceDirectory;
    this.targetDirectory = params.targetDirectory;
    this.exportDateTime = params.exportDateTime;
  }

  getFilePathOptions({ filePath, sourceDiffList }) {
    const baseFilePath = this.trimFilePath(filePath);
    const sourceFilePath = `${this.sourceDirectory}${baseFilePath}`;
    const targetFilePath = `${this.targetDirectory}${baseFilePath}`;
    const renamedFilePath = get(sourceDiffList, sourceFilePath, '').split(',')[1];

    return {
      isSourceFilePath: this.isSourceFilePath(filePath),
      sourceFilePath,
      targetFilePath,
      renamedFilePath,
      baseFilePath,
      renamedBaseFilePath: renamedFilePath ? this.trimFilePath(renamedFilePath) : null,
    };
  }

  isSourceFilePath(path) {
    return path.includes(this.sourceDirectory);
  }

  trimFilePath(path) {
    return this.isSourceFilePath(path) ? path.slice(this.sourceDirectory.length, path.length) : path.slice(this.targetDirectory.length, path.length);
  }

  _getExportMessage({ outcome , modifiedSourceContent }) {
    let exportMessage = EXPORT_MESSAGES[outcome].replace(/{exportDateTime}/, this.exportDateTime);
    exportMessage =  EXPORT_MESSAGES['TEMPLATE'].replace(/{exportMessage}/, exportMessage);

    if(modifiedSourceContent){
      exportMessage = `${exportMessage}
      ${modifiedSourceContent}`
    }

    return  exportMessage;
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

  async updateFileReferenceInCurationLog({ files, outcome }) {
    console.log('files', files);
    console.log('outcome', outcome);
  }

  async addFilesToDoNotExportList({ files, outcome }) {
    console.log('DEBUG AMAL', process.cwd())
    const curationLog = await readFile(this.curationLogsPath);
    const curationLogData = JSON.parse(curationLog);

    curationLogData.DO_NOT_EXPORT.push(...files);

    await writeFile(this.curationLogsPath, JSON.stringify(curationLogData, null, 2));
  }

  // TODO maybe use a copy cmd here instead?
  async exportAndOverwrite({ files, outcome }) {
    files.forEach(async filePath => {
      const newSource = await this._readModifiedSourceFile(filePath);

      await this._updateTargetFile({ filePath, newTarget: newSource });
    });
  }

  async exportAndAppendModifiedSource({ files, outcome }) {
    files.forEach(async filePath => {

      const modifiedSourceContent = await this._readModifiedSourceFile(filePath);
      const appendData = this._getExportMessage({ outcome, modifiedSourceContent });

      await this._appendToTargetFile({ appendData, filePath });
    });
  }

  async exportModifiedSourceWithNoteOnTargetDeletion({ files, outcome }) {
    files.forEach(async filePath => {
      await this._copySourceFileToTarget(filePath);
      const appendData = await this._getExportMessage({ outcome });
      await this._appendToTargetFile({ appendData, filePath })
    });
  }

  async deleteTargetFile({ files, outcome }) {
    files.forEach(async filePath => await unlink(`${this.targetDirectory}${filePath}`));
  }

  async renameTargetFile({ files, outcome }) {
    files.forEach(async filePath => {
      const [ oldFile , newFile ] = filePath.split(',');
      await rename(`${this.targetDirectory}${oldFile}`, `${this.targetDirectory}${newFile}`);
    });
  }

  async appendModifiedTargetWithNoteOnDeletion({ files, outcome }) {
    files.forEach(async filePath => {
      const appendData = await this._getExportMessage({ outcome });
      await this._appendToTargetFile({appendData, filePath })
    });
  }

  async renameModifiedTargetWithNoteOnDeletion({ files, outcome }) {
    files.forEach(async filePath => {
      const [ oldFile , newFile ] = filePath.split(',');
      await rename(`${this.targetDirectory}${oldFile}`, `${this.targetDirectory}${newFile}`);
      const appendData = await this._getExportMessage({ outcome });
      await this._appendToTargetFile({appendData, filePath: newFile })
    });
  }

  async exportFile({files, outcome }) {
    files.forEach(async filePath => {
      await this._copySourceFileToTarget(filePath);
    });
  }
}

module.exports = {
  FileExporter,
};
