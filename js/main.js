import {
    createFilesApp
} from "../apps/files.js";

import {
    createStoreApp
} from "../apps/lucid-store.js";

import {
  createMediaApp
} from "../apps/media.js";

import {
  createCalculator
} from "../apps/calculator.js";

import {
  createNotes
} from "../apps/notes.js";

import {
    createCalendar
} from "../apps/calendar.js";

import {
    createTextEditor
} from "../apps/text-editor.js";

import {
    createTerminal
} from "../apps/terminal.js";

import {
    loadFileSystem
} from "./filesystem.js";

import {
  createSettingsApp
} from "../apps/settings.js";

import {
  createBrowser
} from "../apps/browser.js";

import {
  getLucidLevel,
  setLucidLevel
} from "./lucid-state.js";

console.log(
  "Lucid level:",
  getLucidLevel()
)

await loadFileSystem();

/* =========================
   START MENU
========================= */

const startButton =
    document.getElementById(
        "start-button"
    );


const startMenu =
    document.getElementById(
        "start-menu"
    );


startButton.addEventListener(
    "click",
    function () {

        if (
            startMenu.style.display ===
            "block"
        ) {

            startMenu.style.display =
                "none";

        } else {

            startMenu.style.display =
                "block";

        }

    }
);

const settingsButton =
    document.getElementById(
        "settings-button"
    );

/* =========================
   SETTINGS
========================= */

settingsButton.addEventListener(
    "click",
    function () {

        startMenu.style.display =
            "none";

        createSettingsApp();

    }
);

/* =========================
   FILES
========================= */

const filesButton =
    document.getElementById(
        "files-button"
    );


filesButton.addEventListener(
    "click",
    function () {

        startMenu.style.display =
            "none";

        createFilesApp();

    }
);


/* =========================
   TEXT EDITOR
========================= */

const editorButton =
    document.getElementById(
        "editor-button"
    );


editorButton.addEventListener(
    "click",
    function () {

        startMenu.style.display =
            "none";

        createTextEditor();

    }
);


/* =========================
   CLOCK
========================= */

function updateClock() {

    const now =
        new Date();


    const hours =
        String(
            now.getHours()
        ).padStart(2, "0");


    const minutes =
        String(
            now.getMinutes()
        ).padStart(2, "0");


    document.getElementById(
        "clock"
    ).textContent =
        hours + ":" + minutes;
}


updateClock();


setInterval(
    updateClock,
    1000
);

/* =========================
   TERMINAL
========================= */

const terminalButton =
    document.getElementById(
        "terminal-button"
    );


terminalButton.addEventListener(
    "click",
    function () {

        startMenu.style.display =
            "none";

        createTerminal();

    }
);

/* =========================
   BROWSER
========================= */

const browserButton =
    document.getElementById(
        "browser-button"
    );


browserButton.addEventListener(
    "click",
    function () {

        startMenu.style.display =
            "none";

        createBrowser();

    }
);

/* =========================
   CALENDAR
========================= */

const calendarButton =
    document.getElementById(
        "calendar-button"
    );


calendarButton.addEventListener(
    "click",
    function () {

        startMenu.style.display =
            "none";

        createCalendar();

    }
);

/* =========================
   CALCULATOR
========================= */

const calculatorButton =
    document.getElementById(
        "calculator-button"
    );

calculatorButton.addEventListener(
    "click",
    function () {

        startMenu.style.display =
            "none";

        createCalculator();

    }
);

/* =========================
   NOTES
========================= */

const notesButton =
    document.getElementById(
        "notes-button"
    );

notesButton.addEventListener(
    "click",
    function () {

        startMenu.style.display =
            "none";

        createNotes();

    }
);

/* =========================
   MEDIA
========================= */

const mediaButton =
    document.getElementById(
        "media-button"
    );

mediaButton.addEventListener(
    "click",
    function () {

        startMenu.style.display =
            "none";

        createMediaApp();

    }
);

/* =========================
   LUCID STORE
========================= */

const storeButton =
    document.getElementById(
        "store-button"
    );


storeButton.addEventListener(
    "click",
    function () {

        startMenu.style.display =
            "none";

        createStoreApp();

    }
);
