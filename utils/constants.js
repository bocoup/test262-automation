module.exports = {

  fileStatues: {
    ADDED: 'A',
    DELETE: 'D',
    MODIFIED: 'M',
    RENAMED: 'R', // TODO add tech debt issue for R which is  not 100
    NO_CHANGE: 'N', // No change found
    FILE_TYPE_CHANGES: 'T',
  },

  scenarios: { // TODO add notes here to explain statuses
    DA: 4, // would happen if deleted and then re-added in webkit
    DD: 0,
    DM: 4,
    DR: 5,
    DT: 6,
    MA: 3, // would happen if deleted and then re-added in webkit
    MD: 9,
    MM: 3,
    MR: 10,
    MT: 11,

    // Only changes in source
    NM: 2,
    NA: 12, // meets file export criteria
    ND: 7,
    NR: 8,
    NT: 13,

    // Only changes in target
    DN: 1,
    MN: 0,
  },

  fileOutcomes: {
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

  exportActions: {
    ADD_TO_DO_NOT_EXPORT_LIST: 0,
    UPDATE_REFERENCE_IN_DO_NOT_EXPORT_LIST: 1,
    REMOVE_FROM_DO_NOT_EXPORT_LIST: 2,
    OVERWRITE_FILE: 3,
    APPEND_MODIFIED_SOURCE: 4,
    APPEND_MODIFIED_NOTE: 5,
  },
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
