import { createWindow } from "../js/window-manager.js";


/* ==================================================
   LUCID STORE
================================================== */

const apps = [

    {
        id: "calculator",
        name: "Calculator",
        icon: "🧮",
        category: "Utilities",
        description: "A fast and simple system calculator.",
        version: "1.0.0",
        status: "Available"
    },

    {
        id: "notes",
        name: "Notes",
        icon: "📝",
        category: "Productivity",
        description: "Write, organize and save your notes.",
        version: "1.0.0",
        status: "Available"
    },

    {
        id: "browser",
        name: "Lucid Browser",
        icon: "🌐",
        category: "Internet",
        description: "Browse the web from inside Lucid OS.",
        version: "1.0.0",
        status: "Available"
    },

    {
        id: "media",
        name: "Lucid Media",
        icon: "🎵",
        category: "Media",
        description: "Play music and create simple beats.",
        version: "1.0.0",
        status: "Installed"
    },

    {
        id: "terminal",
        name: "Terminal",
        icon: "⌘",
        category: "System",
        description: "Command-line tools for Lucid OS.",
        version: "1.0.0",
        status: "Available"
    },

    {
        id: "paint",
        name: "Paint",
        icon: "🎨",
        category: "Creative",
        description: "A lightweight drawing application.",
        version: "1.0.0",
        status: "Available"
    }

];


function createStoreApp() {

    const content = `

        <div class="lucid-store">

            <header class="store-header">

                <div>

                    <div class="store-eyebrow">
                        LUCID OS
                    </div>

                    <h1>
                        Lucid Store
                    </h1>

                    <p>
                        Discover apps for your desktop.
                    </p>

                </div>


                <div class="store-header-icon">
                    🛍
                </div>

            </header>


            <nav class="store-categories">

                <button
                    class="store-category active"
                    data-category="All"
                >
                    All
                </button>

                <button
                    class="store-category"
                    data-category="Utilities"
                >
                    Utilities
                </button>

                <button
                    class="store-category"
                    data-category="Productivity"
                >
                    Productivity
                </button>

                <button
                    class="store-category"
                    data-category="Internet"
                >
                    Internet
                </button>

                <button
                    class="store-category"
                    data-category="Media"
                >
                    Media
                </button>

                <button
                    class="store-category"
                    data-category="Creative"
                >
                    Creative
                </button>

                <button
                    class="store-category"
                    data-category="System"
                >
                    System
                </button>

            </nav>


            <main
                class="store-grid"
                id="store-grid"
            ></main>

        </div>

    `;


    const windowElement =
        createWindow(
            "Lucid Store",
            content
        );


    setupStore(windowElement);

    return windowElement;

}


/* ==================================================
   SETUP
================================================== */

function setupStore(windowElement) {

    const root =
        windowElement.querySelector(
            ".lucid-store"
        );


    renderApps(
        root,
        "All"
    );


    root
        .querySelectorAll(
            ".store-category"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    root
                        .querySelectorAll(
                            ".store-category"
                        )
                        .forEach(
                            item =>
                                item.classList.remove(
                                    "active"
                                )
                        );


                    button.classList.add(
                        "active"
                    );


                    renderApps(
                        root,
                        button.dataset.category
                    );

                }
            );

        });

}


/* ==================================================
   RENDER APPS
================================================== */

function renderApps(root, category) {

    const grid =
        root.querySelector(
            "#store-grid"
        );


    const filteredApps =
        category === "All"
            ? apps
            : apps.filter(
                app =>
                    app.category === category
            );


    grid.innerHTML = "";


    filteredApps.forEach(app => {

        const card =
            document.createElement(
                "article"
            );


        card.className =
            "store-app-card";


        card.innerHTML = `

            <div class="store-app-icon">
                ${app.icon}
            </div>


            <div class="store-app-content">

                <div class="store-app-top">

                    <h2>
                        ${escapeHTML(app.name)}
                    </h2>

                    <span class="store-app-version">
                        v${escapeHTML(app.version)}
                    </span>

                </div>


                <div class="store-app-category">
                    ${escapeHTML(app.category)}
                </div>


                <p>
                    ${escapeHTML(app.description)}
                </p>


                <div class="store-app-footer">

                    <span class="store-app-status">
                        ${escapeHTML(app.status)}
                    </span>

                    <button
                        class="store-install"
                        data-app="${escapeHTML(app.id)}"
                        ${app.status === "Installed" ? "disabled" : ""}
                    >
                        ${
                            app.status === "Installed"
                                ? "Installed"
                                : "Install"
                        }
                    </button>

                </div>

            </div>

        `;


        const installButton =
            card.querySelector(
                ".store-install"
            );


        installButton.addEventListener(
            "click",
            () => {

                installApp(
                    root,
                    app.id
                );

            }
        );


        grid.appendChild(card);

    });

}


/* ==================================================
   INSTALL
================================================== */

function installApp(root, appId) {

    const app =
        apps.find(
            item =>
                item.id === appId
        );


    if (!app) {
        return;
    }


    app.status =
        "Installed";


    renderApps(
        root,
        "All"
    );


    window.dispatchEvent(
        new CustomEvent(
            "lucid-app-installed",
            {
                detail: {
                    appId: app.id,
                    name: app.name
                }
            }
        )
    );

}


/* ==================================================
   HELPERS
================================================== */

function escapeHTML(text) {

    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* ==================================================
   EXPORT
================================================== */

export {
    createStoreApp
};
