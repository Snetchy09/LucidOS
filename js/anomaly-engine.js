/*
    ==========================================
             LUCIDOS ANOMALY ENGINE
    ==========================================

    still in work , planning to make it work when the OS is built and enaugh apps are there.

*/


import {
    getLucidLevel
} from "./lucid-state.js";


/* =========================
   CURRENT LEVEL
========================= */

function getAnomalyLevel() {
/*template */

    return getLucidLevel();

}


/* =========================
   ANOMALY CHECK
========================= */

function shouldAnomalyAppear(
    anomalyName
) {

    /*
     TEMPORARY
    */

    return false;

}


/* =========================
   ANOMALY VALUE
========================= */

function getAnomalyValue(
    name,
    normalValue
) {

    /*
        also for future use
    */

    return normalValue;

}


/* =========================
   EVENT HOOK
========================= */

function notifyAnomalyEngine(
    eventName,
    data = {}
) {

    /*
        again for future use
    */

    return;

}


export {
    getAnomalyLevel,
    shouldAnomalyAppear,
    getAnomalyValue,
    notifyAnomalyEngine
};
