module.exports = {

  /*
  *
  *
  *
  *
  * */
  FILE_STATUSES: {
    ADDED: 'A',
    DELETE: 'D',
    MODIFIED: 'M',
    RENAMED: 'R', // TODO add tech debt issue for R %'s ex R74, R100, R20
    FILE_TYPE_CHANGES: 'T',
    NO_CHANGE: 'N', // Note: this is NOT a git status, but a status we attribute if there is no change found for a file an the target or source repo
  },

  /*
  *
  *
  *
  *
  * */
  STATUS_SCENARIOS: { // TODO add notes here to explain statuses
    DA: 4, // would happen if it was previously deleted in source and then deleted in target and re-added in source at the time of comparision
    DD: 0,
    DM: 4,
    DR: 5,
    DT: 6,
    MA: 3, // would happen if it was previously deleted in source and then modified in target and re-added in source at the time of comparision
    MD: 9,
    MM: 3,
    MR: 10,
    MT: 11,

    // NO_CHANGE in target --> Only changes in source
    NM: 2,
    NA: 12, // meets file export criteria
    ND: 7,
    NR: 8,
    NT: 13,

    // NO_CHANGE in target --> Only changes in target
    DN: 1,
    MN: 0,
  },

  FILE_OUTCOMES: {
    DO_NOT_EXPORT: 0,
    DO_NOT_EXPORT_AND_BLOCK_FUTURE_EXPORTS: 1, // UPDATE DNE LIST +
    EXPORT_AND_OVERWRITE_PREVIOUS_VERSION: 2,
    APPEND_MODIFIED_TARGET_WITH_NOTE_AND_NEW_SOURCE: 3,
    RE_EXPORT_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION: 4, // UPDATE DNE LIST
    RE_EXPORT_RENAMED_SOURCE_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION: 5, // UPDATE DNE LIST -
    RE_EXPORT_SOURCE_NEW_EXTENSION_WITH_NOTE_ON_PREVIOUS_TARGET_DELETION_AND_EXTENSION: 6, // UPDATE DNE LIST -
    DELETE_TARGET_FILE: 7,
    RENAME_TARGET_FILE: 8,
    APPEND_MODIFIED_TARGET_WITH_NOTE_ON_SOURCE_DELETION: 9,
    RENAME_MODIFIED_TARGET_FILE_WITH_NOTE_ON_RENAME: 10,
    UPDATE_EXTENSION_ON_MODIFIED_TARGET_FILE_WITH_NOTE_ON_EXTENSION_CHANGE: 11,
    EXPORT_FILE: 12,
    UPDATE_EXTENSION_ON_TARGET_FILE: 13,
  },

  EXPORT_ACTIONS: { // TODO delete?
    ADD_TO_DO_NOT_EXPORT_LIST: 0,
    UPDATE_REFERENCE_IN_DO_NOT_EXPORT_LIST: 1,
    REMOVE_FROM_DO_NOT_EXPORT_LIST: 2,
    OVERWRITE_FILE: 3,
    APPEND_MODIFIED_SOURCE: 4,
    APPEND_MODIFIED_NOTE: 5,
  },

  EXPORT_MESSAGES: {

    TEMPLATE:`
    /*
    ********************************** test262-automation **********************************
    {exportMessage}
    */`,

    3: `Summary: The two files have now diverged.
        File Status: Partially curated & modified.
        Source Status: Modified since its export.
        Below is the current and modified source which was exported on {exportDateTime}`,

    4: `Summary: Source material changed after curation & deletion of exported file.
        File Status: Fully curated & deleted
        Source Status: Modified since curation & deletion.
        Below is the current and modified source which was exported on {exportDateTime}`,

    5: `Summary: Source file renamed after curation & deletion of exported file.
        File Status: Fully curated & deleted
        Source Status: Renamed since curation & deletion.
        This file name and location now matches the source which was exported on {exportDateTime}`,

    6: `Summary: Source file type changed after curation & deletion of exported file.
        File Status: Fully curated & deleted
        Source Status: File type change since curation & deletion.
        This file type now matches the new type of the source which was exported on {exportDateTime}`,

    9: `Summary: Source file deleted after partial curation.
        File Status: Partially curated & modified.
        Source Status: Deleted since export.
        This message was added on {exportDateTime}`,

    10: `Summary: Source file renamed after partial curation & modification of exported file.
        File Status: Partially curated & modified.
        Source Status: Renamed since export.
        This file name and location now matches the source which was exported on {exportDateTime}`,

    11: `Summary: Source file type changed after partial curation & modification of exported file.
        File Status: Partially curated & modified.
        Source Status: File type change since export.
        This file type and location now matches the source which was exported on {exportDateTime}`
  }
};

/*
       o   A: addition of a file

       o   C: copy of a file into a new one

       o   D: deletion of a file

       o   M: modification of the contents or mode of a file

       o   R: renaming of a file

       o   T: change in the type of the file

       o   U: file is unmerged (you must complete the merge before it can be committed)

       o   X: "unknown" change type (most probably a bug, please report it)
*/

/*

NOTE: Order should be read as targetStatus, sourceStatus.
For example, DM can be read as deleted in target and modified in source.

EXPECTED SCENARIOS
DA // would happen if deleted and then re-added in webkit
DD // #winning
DM
DR
DT
MA // would happen if deleted and then re-added in webkit
MD
MM
MR
MT

ERROR SCENARIOS
AU
AX
CU
CX
DU
DX
MU
MX
RU
RX
TU
TX
UA
UC
UD
UM
UR
UT
UU
UX
XA
XC
XD
XM
XR
XT
XU
XX

SCENARIOS FOR UNEXPECTED CHANGES IN TEST262
AA
AC
AD
AM
AR
AT
CA
CC
CD
CM
CR
CT
RA
RC
RD
RM
RR
RT
TA
TC
TD
TM
TR
TT

EXPECTED BUT UNHANDLED SCENARIOS FOR C (aka haven't implemented support for this yet...)
DC
MC

*/
