

const GITHUB_SYM = Symbol('github')

class PullRequestManager {
  constructor(github) {
    this[GITHUB_SYM] = github
  }

  // Opens or updates a pr
  openPr() {

  }
}
