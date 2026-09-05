import { getLucidLevel } from "./lucid-state.js";

function getAnomalyLevel() {
    return getLucidLevel();
}

function shouldAnomalyAppear(anomalyName) {
    return false;
}

function getAnomalyValue(name, normalValue) {
    return normalValue;
}

function notifyAnomalyEngine(eventName, data = {}) {
    return;
}

export { getAnomalyLevel, shouldAnomalyAppear, getAnomalyValue, notifyAnomalyEngine };