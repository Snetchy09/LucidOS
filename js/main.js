import {
    createFilesApp
} from "../apps/files.js";

import {
    createTextEditor
} from "../apps/text-editor.js";

import {
    createTerminal
} from "../apps/terminal.js";

import {
    loadFileSystem
} from "./filesystem.js";

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
