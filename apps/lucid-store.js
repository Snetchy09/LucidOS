import { createWindow } from "../js/window-manager.js";
import { isAppInstalled, installExternalApp, uninstallApp } from "../js/app-registry.js";
import { getStoreApps } from "../js/lucid-store-api.js";

async function createStoreApp() {
    const content = `
        <div class="lucid-store">
            <header class="store-header">
                <div>
                    <div class="store-eyebrow">LUCID OS</div>
                    <h1>Lucid Store</h1>
                    <p>Discover apps for your desktop.</p>
                </div>
                <div class="store-header-icon">🛍</div>
            </header>
            <nav class="store-categories">
                <button class="store-category active" data-category="All">All</button>
                <button class="store-category" data-category="Utilities">Utilities</button>
                <button class="store-category" data-category="Productivity">Productivity</button>
                <button class="store-category" data-category="Internet">Internet</button>
                <button class="store-category" data-category="Media">Media</button>
                <button class="store-category" data-category="Creative">Creative</button>
                <button class="store-category" data-category="System">System</button>
            </nav>
            <main class="store-grid" id="store-grid"></main>
        </div>
    `;

    const windowElement = createWindow("Lucid Store", content);
    setupStore(windowElement);
    await loadStoreCatalog(windowElement);
    return windowElement;
}

function setupStore(windowElement) {
    const root = windowElement.querySelector(".lucid-store");
    renderApps(root, "All");

    window.addEventListener("lucid-app-installed", () => {
        const category = root.querySelector(".store-category.active")?.dataset.category || "All";
        renderApps(root, category);
    });

    window.addEventListener("lucid-app-uninstalled", () => {
        const category = root.querySelector(".store-category.active")?.dataset.category || "All";
        renderApps(root, category);
    });

    root.querySelectorAll(".store-category").forEach(button => {
        button.addEventListener("click", () => {
            root.querySelectorAll(".store-category").forEach(item => item.classList.remove("active"));
            button.classList.add("active");
            renderApps(root, button.dataset.category);
        });
    });
}

function renderApps(root, category) {
    const grid = root.querySelector("#store-grid");
    const apps = root.__storeApps || [];

    const normalizedApps = apps.map(app => ({
        ...app,
        icon: app.icon || app.icon_url || "◇",
        type: app.app_type || "community",
        installed: isAppInstalled(app.id)
    }));

    const filteredApps = category === "All"
        ? normalizedApps
        : normalizedApps.filter(app => app.category === category);

    grid.innerHTML = "";

    filteredApps.forEach(app => {
        const card = document.createElement("article");
        card.className = "store-app-card";

        card.innerHTML = `
            <div class="store-app-icon">${escapeHTML(app.icon)}</div>
            <div class="store-app-content">
                <div class="store-app-top">
                    <h2>${escapeHTML(app.name)}</h2>
                    <span class="store-app-version">v${escapeHTML(app.version)}</span>
                </div>
                <div class="store-app-category">${escapeHTML(app.category)}</div>
                <p>${app.description || "A Lucid OS application."}</p>
                <div class="store-app-footer">
                    <span class="store-app-status">
                        ${app.type === "core" ? "System app" : app.installed ? "Installed" : "Available"}
                    </span>
                    <button class="store-install" data-app="${escapeHTML(app.id)}"
                        ${app.type === "core" ? "disabled" : ""}>
                        ${app.type === "core" ? "Included" : app.installed ? "Remove" : "Install"}
                    </button>
                </div>
            </div>
        `;

        const actionButton = card.querySelector(".store-install");
        if (actionButton && app.type !== "core") {
            actionButton.addEventListener("click", () => {
                if (isAppInstalled(app.id)) uninstallApp(app.id);
                else installExternalApp(app);
            });
        }

        grid.appendChild(card);
    });
}

async function loadStoreCatalog(windowElement) {
    const root = windowElement.querySelector(".lucid-store");
    const grid = root.querySelector("#store-grid");

    grid.innerHTML = '<div class="store-loading">Loading Lucid Store...</div>';

    try {
        const apps = await getStoreApps();
        root.__storeApps = apps;
        renderApps(root, "All");
    } catch (error) {
        console.error("Lucid Store failed to load:", error);
        grid.innerHTML = '<div class="store-loading">Unable to connect to Lucid Store.</div>';
    }
}

function escapeHTML(text) {
    return String(text ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export { createStoreApp };
