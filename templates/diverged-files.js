module.exports = {
  targetAndSourceModified:
    ({ modifiedSourceContent, exportTimeDate }) => `
/*
* ********************** test262-automation **********************
* The original source file was modified before being fully curated.
* Below is the modified source which was update on:  ${exportTimeDate}
*/
${modifiedSourceContent}`,

  targetModifiedSourceDeleted:
    ({ exportTimeDate }) =>
      `
/*
* ********************** test262-automation **********************
* The original source file was deleted while this file was being partially curated. 
* Below is the modified source which was update on:  ${exportTimeDate}
*/`
}







