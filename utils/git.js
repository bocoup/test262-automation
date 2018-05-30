const { exec } = require('child_process');

/*
    Parametrized Methods
     set cwd
    inherit stndio
*/

function cloneRepo(params) {
    const {targetGit, sourceExcludes } = params;

    exec(`git clone ${targetGit}`, (err, stdout) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(stdout);
        console.log(`Completed clone of ${sourceExcludes}`);
    });
}

function checkoutNewBranch() {

}

module.exports = {
    cloneRepo
};