const OutcomeReporter = require('./outcomeReporter')
const {stripIndent} = require('common-tags')

describe('OutcomeReporter', function() {
  it('should render a file list with the targetSubDirectory', async function() {
    let reporter = new OutcomeReporter({
      implConfig: { targetSubDirectory: "test262/implementation-contributed/jsc" }
    });

    expect(reporter.renderFileList(
      [
        '/stress/for-in-array-mode.js',
        '/stress/for-of-array-mode.js',
      ]
    ))
      .toBe(` - [test262/implementation-contributed/jsc/stress/for-in-array-mode.js](../../blob/test262/implementation-contributed/jsc/stress/for-in-array-mode.js)
 - [test262/implementation-contributed/jsc/stress/for-of-array-mode.js](../../blob/test262/implementation-contributed/jsc/stress/for-of-array-mode.js)`);
  });

  it('should use the commit shas in the heading', function() {
    let reporter = new OutcomeReporter({
      implConfig: {
        targetSubDirectory: "test262/implementation-contributed/jsc",
        targetGit: 'git@github.com:test262-automation/mock-test262.git',
      }
    });

    expect(reporter.renderHeading({
      vendor: 'jsc',
      sourceSha: 'abc',
      targetSha: '123',
    }))
      .toBe(stripIndent`
# Import JavaScript Test Changes from jsc

Changes imported in this pull request include all changes made since
[abc](https://github.com/test262-automation/mock-test262/blob/abc) in jsc and all changes made since [123](../blob/123) in
test262.
`)
  });

  it('should not render a subsection if the files array is empty', function() {
    let reporter = new OutcomeReporter({
      implConfig: { targetSubDirectory: "test262/implementation-contributed/jsc" }
    });

    expect(reporter.renderSubSection(0, {files: []}, 'jsc'))
      .toBe('')
  });

  it('should render a subsection', function() {
    let reporter = new OutcomeReporter({
      implConfig: { targetSubDirectory: "test262/implementation-contributed/jsc" }
    });

    expect(reporter.renderSubSection(0, {files: ['/a.js']}, 'jsc'))
      .toBe(`
### 1 Ignored File

These files were updated or added in the jsc repo but they
are not synced to test262 because they are excluded.

 - [test262/implementation-contributed/jsc/a.js](../../blob/test262/implementation-contributed/jsc/a.js)
`.trim())
  });


  it('should generate a report', function() {
    let reporter = new OutcomeReporter({
      implConfig: {
        targetSubDirectory: "test262/implementation-contributed/jsc",
        targetGit: 'git@github.com:test262-automation/mock-test262.git',
      }
    });

    expect(reporter.generateReport({
      sourceSha: '123',
      targetSha: 'abc',
      vendor: 'jsc',
      outcomes: { '0': { files: ['/a.js']}}
    }))
      .toBe(`
# Import JavaScript Test Changes from jsc

Changes imported in this pull request include all changes made since
[123](https://github.com/test262-automation/mock-test262/blob/123) in jsc and all changes made since [abc](../blob/abc) in
test262.

### 1 Ignored File

These files were updated or added in the jsc repo but they
are not synced to test262 because they are excluded.

 - [test262/implementation-contributed/jsc/a.js](../../blob/test262/implementation-contributed/jsc/a.js)
`.trim())
  });
});
