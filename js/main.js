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

/* =========================
   CLOCK
========================= */

function updateClock() {

    const clock =
        document.getElementById(
            "clock"
        );


    if (!clock) {
        return;
    }


    const now =
        new Date();


    const hours =
        String(
            now.getHours()
        ).padStart(
            2,
            "0"
        );


    const minutes =
        String(
            now.getMinutes()
        ).padStart(
            2,
            "0"
        );


    clock.textContent =
        `${hours}:${minutes}`;

}


updateClock();


setInterval(
    updateClock,
    1000
);

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

    const container =
        document.getElementById(
            "desktop-apps"
        );

    if (!container) {
        return;
    }


    const rect =
        container.getBoundingClientRect();


    const centerX =
        rect.width / 2;

    const centerY =
        rect.height / 2;


    const apps =
        container.querySelectorAll(
            ".desktop-app"
        );


    apps.forEach(
        (app, index) => {

            const targetX =
                Number(
                    app.dataset.targetX
                );

            const targetY =
                Number(
                    app.dataset.targetY
                );


            const targetPX =
                targetX / 100 *
                rect.width;


            const targetPY =
                targetY / 100 *
                rect.height;


            const dx =
                targetPX -
                centerX;


            const dy =
                targetPY -
                centerY;


            const distance =
                Math.hypot(
                    dx,
                    dy
                );


            const finalAngle =
                Math.atan2(
                    dy,
                    dx
                );


            const direction =
                index % 2 === 0
                    ? 1
                    : -1;

            const orbitAngle =
                direction * 0.9;


            const delay =
                index * 35;


            app.style.left =
                `${targetX}%`;


            app.style.top =
                `${targetY}%`;


            const startX =
                centerX -
                targetPX;


            const startY =
                centerY -
                targetPY;


            const midAngle =
                finalAngle -
                orbitAngle;


            const midRadius =
                distance * 0.55;


            const midX =
                centerX +
                Math.cos(midAngle) *
                midRadius;


            const midY =
                centerY +
                Math.sin(midAngle) *
                midRadius;


            const midTranslateX =
                midX -
                targetPX;


            const midTranslateY =
                midY -
                targetPY;


            app.animate(
                [

                    {
                        transform:
                            `
                            translate3d(
                                -50%,
                                -50%,
                                0
                            )
                            translate3d(
                                ${startX}px,
                                ${startY}px,
                                0
                            )
                            scale(0.08)
                            rotate(
                                ${direction * -30}deg
                            )
                            `,

                        opacity: 0
                    },


                    {
                        transform:
                            `
                            translate3d(
                                -50%,
                                -50%,
                                0
                            )
                            translate3d(
                                ${midTranslateX}px,
                                ${midTranslateY}px,
                                0
                            )
                            scale(0.68)
                            rotate(
                                ${direction * 22}deg
                            )
                            `,

                        opacity: 0.8,

                        offset: 0.52
                    },


                    {
                        transform:
                            `
                            translate3d(
                                -50%,
                                -50%,
                                0
                            )
                            translate3d(
                                0,
                                0,
                                0
                            )
                            scale(1)
                            rotate(0deg)
                            `,

                        opacity: 1
                    }

                ],

                {
                    duration: 820,

                    delay,

                    easing: "cubic-bezier(0.16, 1, 0.3, 1)",

                    fill: "forwards"
                }

            );

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
        (app, index) => {

            const targetX =
                Number(
                    app.dataset.targetX
                );

            const targetY =
                Number(
                    app.dataset.targetY
                );


            const container =
                document.getElementById(
                    "desktop-apps"
                );


            const rect =
                container.getBoundingClientRect();


            const targetPX =
                targetX / 100 *
                rect.width;


            const targetPY =
                targetY / 100 *
                rect.height;


            const centerX =
                rect.width / 2;


            const centerY =
                rect.height / 2;


            const dx =
                centerX -
                targetPX;


            const dy =
                centerY -
                targetPY;


            const distance =
                Math.hypot(dx, dy);


            const angle =
                Math.atan2(
                    dy,
                    dx
                );


            const direction =
                index % 2 === 0
                    ? 1
                    : -1;


            const orbitAngle =
                angle +
                direction * 0.9;


            const midRadius =
                distance * 0.55;


            const midX =
                centerX +
                Math.cos(
                    orbitAngle
                ) *
                midRadius;


            const midY =
                centerY +
                Math.sin(
                    orbitAngle
                ) *
                midRadius;


            const midTranslateX =
                midX -
                targetPX;


            const midTranslateY =
                midY -
                targetPY;


            app.animate(
                [

                    {
                        transform:
                            `
                            translate3d(
                                -50%,
                                -50%,
                                0
                            )
                            translate3d(
                                0,
                                0,
                                0
                            )
                            scale(1)
                            rotate(0deg)
                            `,

                        opacity: 1
                    },


                    {
                        transform:
                            `
                            translate3d(
                                -50%,
                                -50%,
                                0
                            )
                            translate3d(
                                ${midTranslateX}px,
                                ${midTranslateY}px,
                                0
                            )
                            scale(0.68)
                            rotate(
                                ${direction * -22}deg
                            )
                            `,

                        opacity: 0.75,

                        offset: 0.48
                    },


                    {
                        transform:
                            `
                            translate3d(
                                -50%,
                                -50%,
                                0
                            )
                            translate3d(
                                ${dx}px,
                                ${dy}px,
                                0
                            )
                            scale(0.08)
                            rotate(
                                ${direction * 30}deg
                            )
                            `,

                        opacity: 0
                    }

                ],

                {
                    duration: 620,

                    delay: index * 22,

                    easing: "cubic-bezier(0.7, 0, 0.84, 0)",

                    fill: "forwards"
                }

            );

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


    moveAppsToSavedPositions();

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


    moveAppsToOrb();


    setTimeout(
        () => {

            desktop.classList.remove(
                "lucid-launcher-open"
            );

        },
        700
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

    const desktop =
        document.getElementById(
            "desktop"
        );


    desktop.addEventListener(
        "click",
        event => {
            if (
                event.target.closest(
                    ".desktop-app"
                )
            ) {

                return;

            }


            const rect =
                desktop.getBoundingClientRect();


            const centerX =
                rect.left +
                rect.width / 2;

            const centerY =
                rect.top +
                rect.height / 2;

            const distance =
                Math.hypot(
                    event.clientX -
                    centerX,

                    event.clientY -
                    centerY
                );


            if (
                distance <= 65
            ) {

                if (launcherOpen) {

                    closeLucidLauncher();

                } else {

                    openLucidLauncher();

                }

            }

        }
    );

}
