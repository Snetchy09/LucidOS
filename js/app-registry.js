import { deleteUserFile, saveUserFile } from "./filesystem.js";

const APP_REGISTRY_KEY = "lucid-installed-apps";
const EXTERNAL_APPS_KEY = "lucid-external-apps";
const REGISTRY_VERSION_KEY = "lucid-app-registry-v3";

const appCatalog = [
    { id: "files", name: "Files", icon: "📁", version: "1.0.0", category: "System", type: "core", description: "Browse and manage your Lucid files." },
    { id: "lucid-studio", name: "Lucid Studio", icon: "◇", version: "1.0.0", category: "Developer", type: "core", description: "Create, test, and submit Lucid applications." },
    { id: "settings", name: "Settings", icon: "⚙️", version: "1.0.0", category: "System", type: "core", description: "Configure LucidOS." },
    { id: "terminal", name: "Terminal", icon: "⌘", version: "1.0.0", category: "System", type: "core", description: "Command-line tools for LucidOS." },
    { id: "store", name: "Lucid Store", icon: "🛍️", version: "1.0.0", category: "System", type: "core", description: "Discover and install Lucid applications." },
    { id: "calculator", name: "Calculator", icon: "🧮", version: "1.0.0", category: "Utilities", type: "optional", description: "A simple Lucid calculator." },
    { id: "media", name: "Lucid Media", icon: "🎵", version: "1.0.0", category: "Media", type: "optional", description: "Play music and create beats." },
    { id: "paint", name: "Lucid Paint", icon: "🎨", version: "1.0.0", category: "Creative", type: "optional", description: "Paint, pixel art, and simple animations." },
    { id: "notes", name: "Notes", icon: "📝", version: "1.0.0", category: "Productivity", type: "optional", description: "Write and organize your notes." },
    { id: "calendar", name: "Calendar", icon: "📅", version: "1.0.0", category: "Productivity", type: "optional", description: "Manage events and dates." },
    { id: "text-editor", name: "Text Editor", icon: "📄", version: "1.0.0", category: "Productivity", type: "optional", description: "Edit plain text files." },
    { id: "browser", name: "Browser", icon: "🌐", version: "1.0.0", category: "Internet", type: "optional", description: "Browse the web from LucidOS." }
];

function getExternalApps() {
    const saved = localStorage.getItem(EXTERNAL_APPS_KEY);
    if (!saved) return [];

    try {
        const apps = JSON.parse(saved);
        return Array.isArray(apps) ? apps : [];
    } catch {
        return [];
    }
}

function saveExternalApps(apps) {
    localStorage.setItem(EXTERNAL_APPS_KEY, JSON.stringify(apps));
}

function writeInstalledAppFile(app) {
    if (!app || !app.id || app.type === "core") return;

    const manifest = {
        type: "lucid-app",
        id: app.id,
        name: app.name,
        version: app.version || "1.0.0",
        category: app.category || "Other",
        description: app.description || ""
    };

    saveUserFile(
        ["Downloads"],
        `${app.id}.lucidapp`,
        JSON.stringify(manifest, null, 2),
        "application/json"
    ).catch(error => console.warn("Lucid: could not save app package:", error));
}

function removeInstalledAppFile(appId) {
    deleteUserFile(["Downloads"], `${appId}.lucidapp`).catch(() => {});
}

function installExternalApp(app) {
    if (!app || !app.id || isAppInstalled(app.id)) return false;

    const externalApps = getExternalApps();
    if (externalApps.some(item => item.id === app.id)) return false;

    const installed = {
        id: app.id,
        name: app.name,
        icon: app.icon || app.icon_url || "◇",
        version: app.version || "1.0.0",
        category: app.category || "Other",
        description: app.description || "",
        type: app.app_type || "community",
        package_key: app.package_key || null,
        entry_point: app.entry_point || null,
        installed: true,
        external: true
    };

    externalApps.push(installed);
    saveExternalApps(externalApps);
    writeInstalledAppFile(installed);
    window.dispatchEvent(new CustomEvent("lucid-app-installed", {
        detail: { appId: app.id, app: installed }
    }));
    return true;
}

const appLaunchers = {};

function initializeAppRegistry() {
    const saved = localStorage.getItem(APP_REGISTRY_KEY);
    const coreIds = appCatalog
        .filter(app => app.type === "core")
        .map(app => app.id);

    if (!saved) {
        localStorage.setItem(APP_REGISTRY_KEY, JSON.stringify(coreIds));
        localStorage.setItem(REGISTRY_VERSION_KEY, "3");
        return;
    }

    try {
        let existing = JSON.parse(saved);
        if (!Array.isArray(existing)) throw new Error("Invalid registry");

        const version = localStorage.getItem(REGISTRY_VERSION_KEY);

        // Paint used to be installed on first launch. Remove that legacy default
        // once, so new installs start clean and Paint can come from the Store.
        if (version !== "3") existing = existing.filter(id => id !== "paint");

        const merged = [...new Set([...existing, ...coreIds])];
        localStorage.setItem(APP_REGISTRY_KEY, JSON.stringify(merged));
        localStorage.setItem(REGISTRY_VERSION_KEY, "3");
    } catch {
        localStorage.setItem(APP_REGISTRY_KEY, JSON.stringify(coreIds));
        localStorage.setItem(REGISTRY_VERSION_KEY, "3");
    }
}

function getInstalledIds() {
    const saved = localStorage.getItem(APP_REGISTRY_KEY);
    if (!saved) {
        initializeAppRegistry();
        return getInstalledIds();
    }

    try {
        const ids = JSON.parse(saved);
        if (!Array.isArray(ids)) throw new Error("Invalid registry");
        return ids;
    } catch {
        initializeAppRegistry();
        return getInstalledIds();
    }
}

function saveInstalledIds(ids) {
    localStorage.setItem(APP_REGISTRY_KEY, JSON.stringify([...new Set(ids)]));
}

function getInstalledApps() {
    const installedIds = new Set(getInstalledIds());
    const builtInApps = appCatalog
        .filter(app => installedIds.has(app.id))
        .map(app => ({ ...app, installed: true }));

    return [...builtInApps, ...getExternalApps()];
}

function getAllApps() {
    const installedIds = new Set(getInstalledIds());
    return appCatalog.map(app => ({ ...app, installed: installedIds.has(app.id) }));
}

function getApp(appId) {
    const builtIn = appCatalog.find(app => app.id === appId);
    if (builtIn) return builtIn;
    return getExternalApps().find(app => app.id === appId) || null;
}

function isAppInstalled(appId) {
    if (getInstalledIds().includes(appId)) return true;
    return getExternalApps().some(app => app.id === appId);
}

function installApp(appId) {
    const app = getApp(appId);
    if (!app || isAppInstalled(appId)) return false;

    const installedIds = getInstalledIds();
    installedIds.push(appId);
    saveInstalledIds(installedIds);
    writeInstalledAppFile(app);
    window.dispatchEvent(new CustomEvent("lucid-app-installed", {
        detail: { appId, app }
    }));
    return true;
}

function uninstallApp(appId) {
    const app = getApp(appId);
    if (!app || app.type === "core") return false;

    saveInstalledIds(getInstalledIds().filter(id => id !== appId));
    saveExternalApps(getExternalApps().filter(item => item.id !== appId));
    removeInstalledAppFile(appId);
    removeDesktopPosition(appId);

    window.dispatchEvent(new CustomEvent("lucid-app-uninstalled", {
        detail: { appId, app }
    }));
    return true;
}

function removeDesktopPosition(appId) {
    const key = "lucid-desktop-positions";

    try {
        const positions = JSON.parse(localStorage.getItem(key)) || {};
        delete positions[appId];
        localStorage.setItem(key, JSON.stringify(positions));
    } catch {}
}

function registerAppLauncher(appId, launcher) {
    if (typeof launcher !== "function") {
        throw new TypeError(`Invalid launcher for ${appId}`);
    }
    appLaunchers[appId] = launcher;
}

function getAppLauncher(appId) {
    return appLaunchers[appId] || null;
}

function registerApp(app) {
    if (!app || !app.id || !app.name || appCatalog.some(existing => existing.id === app.id)) {
        return false;
    }

    appCatalog.push({
        icon: "◇",
        version: "1.0.0",
        category: "Other",
        type: "optional",
        description: "A Lucid application.",
        ...app
    });
    return true;
}

export {
    appCatalog,
    initializeAppRegistry,
    getInstalledApps,
    getAllApps,
    getApp,
    isAppInstalled,
    installApp,
    installExternalApp,
    uninstallApp,
    registerApp,
    registerAppLauncher,
    getAppLauncher
};