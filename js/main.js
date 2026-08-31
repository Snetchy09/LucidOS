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

/* ==================================================
   LUCID APP REGISTRY
================================================== */

const lucidApps = [

    {
        id: "files",
        name: "Files",
        icon: "📁",
        launcher: createFilesApp
    },

    {
        id: "calculator",
        name: "Calculator",
        icon: "🧮",
        launcher: createCalculator
    },

    {
        id: "media",
        name: "Lucid Media",
        icon: "🎵",
        launcher: createMediaApp
    },

    {
        id: "notes",
        name: "Notes",
        icon: "📝",
        launcher: createNotes
    },

    {
        id: "calendar",
        name: "Calendar",
        icon: "📅",
        launcher: createCalendar
    },

    {
        id: "text-editor",
        name: "Text Editor",
        icon: "📄",
        launcher: createTextEditor
    },

    {
        id: "terminal",
        name: "Terminal",
        icon: "⌘",
        launcher: createTerminal
    },

    {
        id: "browser",
        name: "Browser",
        icon: "🌐",
        launcher: createBrowser
    },

    {
        id: "settings",
        name: "Settings",
        icon: "⚙️",
        launcher: createSettingsApp
    },

    {
        id: "store",
        name: "Lucid Store",
        icon: "🛍️",
        launcher: createStoreApp
    }

];

/* ==================================================
   LUCID DESKTOP
================================================== */

const DESKTOP_POSITIONS_KEY =
    "lucid-desktop-positions";


let launcherOpen = false;


/* ==================================================
   POSITION STORAGE
================================================== */

function loadDesktopPositions() {

    try {

        return JSON.parse(
            localStorage.getItem(
                DESKTOP_POSITIONS_KEY
            )
        ) || {};

    } catch {

        return {};

    }

}


function saveDesktopPosition(
    appId,
    x,
    y
) {

    const positions =
        loadDesktopPositions();


    positions[appId] = {
        x,
        y
    };


    localStorage.setItem(
        DESKTOP_POSITIONS_KEY,
        JSON.stringify(
            positions
        )
    );

}


/* ==================================================
   ESCAPE HTML
================================================== */

function escapeHTML(text) {

    return String(text)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


/* ==================================================
   LAUNCH APP
================================================== */

function launchLucidApp(app) {

    closeLucidLauncher();

    app.launcher();

}


/* ==================================================
   DEFAULT POSITIONS
================================================== */

const defaultPositions = [

    { x: 50, y: 20 },

    { x: 30, y: 26 },

    { x: 70, y: 26 },

    { x: 23, y: 45 },

    { x: 77, y: 45 },

    { x: 28, y: 67 },

    { x: 72, y: 67 },

    { x: 50, y: 76 },

    { x: 38, y: 38 },

    { x: 62, y: 38 }

];


/* ==================================================
   BUILD DESKTOP APPS
================================================== */

function buildDesktopApps() {

    const container =
        document.getElementById(
            "desktop-apps"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    const positions =
        loadDesktopPositions();


    lucidApps.forEach(
        (app, index) => {

            const button =
                document.createElement(
                    "button"
                );


            button.className =
                "desktop-app";


            button.innerHTML = `

                <span
                    class="desktop-app-icon"
                >
                    ${app.icon}
                </span>

                <span
                    class="desktop-app-name"
                >
                    ${escapeHTML(
                        app.name
                    )}
                </span>

            `;


            const saved =
                positions[app.id];


            const position =
                saved ||
                defaultPositions[
                    index %
                    defaultPositions.length
                ];


            /*
                The app starts visually
                at the Orb.

                The actual destination
                is stored as left/top.
            */

            button.style.left =
                `${position.x}%`;

            button.style.top =
                `${position.y}%`;


            button.style.setProperty(
                "--origin-x",
                "0px"
            );

            button.style.setProperty(
                "--origin-y",
                "0px"
            );


            /*
                Start at the center of
                the screen before the
                launcher is opened.
            */

            button.style.left =
                "50%";

            button.style.top =
                "50%";


            button.dataset.targetX =
                position.x;

            button.dataset.targetY =
                position.y;


            setupDesktopApp(
                button,
                app
            );


            container.appendChild(
                button
            );

        }
    );

}


/* ==================================================
   POSITION APPS
================================================== */

function moveAppsToSavedPositions() {

    const apps =
        document.querySelectorAll(
            ".desktop-app"
        );


    apps.forEach(
        app => {

            app.style.left =
                `${app.dataset.targetX}%`;


            app.style.top =
                `${app.dataset.targetY}%`;

        }
    );

}


/* ==================================================
   MOVE APPS BACK TO ORB
================================================== */

function moveAppsToOrb() {

    const apps =
        document.querySelectorAll(
            ".desktop-app"
        );


    apps.forEach(
        app => {

            app.style.left =
                "50%";

            app.style.top =
                "50%";

        }
    );

}


/* ==================================================
   OPEN LAUNCHER
================================================== */

function openLucidLauncher() {

    if (launcherOpen) {
        return;
    }


    const desktop =
        document.getElementById(
            "desktop"
        );


    launcherOpen = true;


    desktop.classList.add(
        "lucid-launcher-open"
    );


    /*
        Give the CSS a frame to
        register the open state,
        then release the apps
        from the Orb.
    */

    requestAnimationFrame(
        () => {

            requestAnimationFrame(
                () => {

                    moveAppsToSavedPositions();

                }
            );

        }
    );

}


/* ==================================================
   CLOSE LAUNCHER
================================================== */

function closeLucidLauncher() {

    if (!launcherOpen) {
        return;
    }


    const desktop =
        document.getElementById(
            "desktop"
        );


    launcherOpen = false;


    /*
        Pull everything back
        into the Orb.
    */

    moveAppsToOrb();


    setTimeout(
        () => {

            desktop.classList.remove(
                "lucid-launcher-open"
            );

        },
        550
    );

}


/* ==================================================
   DESKTOP APP INTERACTION
================================================== */

function setupDesktopApp(
    element,
    app
) {

    let dragging = false;

    let moved = false;

    let startPointerX = 0;

    let startPointerY = 0;

    let startLeft = 0;

    let startTop = 0;


    element.addEventListener(
        "pointerdown",
        event => {

            if (!launcherOpen) {
                return;
            }


            if (
                event.button !== 0
            ) {

                return;

            }


            dragging = true;

            moved = false;


            startPointerX =
                event.clientX;

            startPointerY =
                event.clientY;


            startLeft =
                parseFloat(
                    element.dataset.targetX
                );


            startTop =
                parseFloat(
                    element.dataset.targetY
                );


            element.setPointerCapture(
                event.pointerId
            );


            event.preventDefault();

        }
    );


    element.addEventListener(
        "pointermove",
        event => {

            if (!dragging) {
                return;
            }


            const desktop =
                document.getElementById(
                    "desktop-apps"
                );


            const rect =
                desktop.getBoundingClientRect();


            const dx =
                event.clientX -
                startPointerX;


            const dy =
                event.clientY -
                startPointerY;


            if (
                Math.abs(dx) > 5 ||
                Math.abs(dy) > 5
            ) {

                moved = true;

            }


            let x =
                startLeft +
                (
                    dx /
                    rect.width
                ) *
                100;


            let y =
                startTop +
                (
                    dy /
                    rect.height
                ) *
                100;


            x =
                Math.max(
                    8,
                    Math.min(
                        92,
                        x
                    )
                );


            y =
                Math.max(
                    10,
                    Math.min(
                        88,
                        y
                    )
                );


            element.dataset.targetX =
                x;

            element.dataset.targetY =
                y;


            element.style.left =
                `${x}%`;

            element.style.top =
                `${y}%`;

        }
    );


    element.addEventListener(
        "pointerup",
        event => {

            if (!dragging) {
                return;
            }


            dragging = false;


            if (moved) {

                saveDesktopPosition(
                    app.id,
                    Number(
                        element.dataset.targetX
                    ),
                    Number(
                        element.dataset.targetY
                    )
                );

            }

        }
    );


    element.addEventListener(
        "click",
        event => {

            /*
                Clicking opens the app.
                Dragging does not.
            */

            if (moved) {

                event.preventDefault();

                moved = false;

                return;

            }


            launchLucidApp(
                app
            );

        }
    );

}

/* ==================================================
   INITIALIZE DESKTOP
================================================== */

buildDesktopApps();


/* ==================================================
   ORB BUTTON
================================================== */

const startButton =
    document.getElementById(
        "start-button"
    );


if (startButton) {

    startButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            if (launcherOpen) {

                closeLucidLauncher();

            } else {

                openLucidLauncher();

            }

        }
    );

}
