const STORAGE_KEY = "lucid_os_state";


const defaultState = {

    level: 0,

    visits: 0,

    browserVisits: 0,

    terminalVisits: 0,

    filesVisits: 0,

    settingsVisits: 0,

    chatVisits: 0,

    firstSeen: Date.now()

};


/* =========================
   LOAD
========================= */

function loadLucidState() {

    const saved =
        localStorage.getItem(
            STORAGE_KEY
        );


    if (!saved) {

        saveLucidState(
            defaultState
        );

        return {
            ...defaultState
        };

    }


    try {

        return {
            ...defaultState,
            ...JSON.parse(saved)
        };

    } catch {

        saveLucidState(
            defaultState
        );

        return {
            ...defaultState
        };

    }

}


/* =========================
   SAVE
========================= */

function saveLucidState(
    state
) {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
    );

}


/* =========================
   LEVEL
========================= */

function getLucidLevel() {

    return loadLucidState().level;

}


/* =========================
   VISITS
========================= */

function recordVisit(
    app
) {

    const state =
        loadLucidState();


    state.visits++;


    if (app === "browser") {
        state.browserVisits++;
    }


    if (app === "terminal") {
        state.terminalVisits++;
    }


    if (app === "files") {
        state.filesVisits++;
    }


    if (app === "settings") {
        state.settingsVisits++;
    }


    if (app === "chat") {
        state.chatVisits++;
    }


    updateProgression(
        state
    );


    saveLucidState(
        state
    );


    return state;

}


/* =========================
   PROGRESSION
========================= */

function updateProgression(
    state
) {

    /*
        the progression is slow , so it won't
        change very quickly
    */


    if (
        state.visits >= 8 &&
        state.level < 1
    ) {

        state.level = 1;

    }


    if (
        state.visits >= 20 &&
        state.level < 2
    ) {

        state.level = 2;

    }


    if (
        state.visits >= 40 &&
        state.level < 3
    ) {

        state.level = 3;

    }


    if (
        state.visits >= 70 &&
        state.level < 4
    ) {

        state.level = 4;

    }


    if (
        state.visits >= 120 &&
        state.level < 5
    ) {

        state.level = 5;

    }

}


/* =========================
   MANUAL LEVEL
========================= */

function setLucidLevel(
    level
) {

    const state =
        loadLucidState();


    state.level =
        Math.max(
            0,
            Math.min(
                5,
                level
            )
        );


    saveLucidState(
        state
    );

}


export {
    loadLucidState,
    saveLucidState,
    getLucidLevel,
    recordVisit,
    setLucidLevel
};
