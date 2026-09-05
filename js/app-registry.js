const APP_REGISTRY_KEY = "lucid-installed-apps";
const EXTERNAL_APPS_KEY = "lucid-external-apps";

const appCatalog = [
    { id: "files", name: "Files", icon: "📁", version: "1.0.0", category: "System", type: "core", description: "Browse and manage your Lucid files." },
    { id: "lucid-studio", name: "Lucid Studio", icon: "◇", version: "1.0.0", category: "Developer", type: "core", description: "Create, test, and submit Lucid applications." },
    { id: "settings", name: "Settings", icon: "⚙️", version: "1.0.0", category: "System", type: "core", description: "Configure Lucid OS." },
    { id: "terminal", name: "Terminal", icon: "⌘", version: "1.0.0", category: "System", type: "core", description: "Command-line tools for Lucid OS." },
    { id: "store", name: "Lucid Store", icon: "🛍️", version: "1.0.0", category: "System", type: "core", description: "Discover and install Lucid applications." },
    { id: "calculator", name: "Calculator", icon: "🧮", version: "1.0.0", category: "Utilities", type: "optional", description: "A simple Lucid calculator." },
    { id: "media", name: "Lucid Media", icon: "🎵", version: "1.0.0", category: "Media", type: "optional", description: "Play music and create beats." },
    { id: "notes", name: "Notes", icon: "📝", version: "1.0.0", category: "Productivity", type: "optional", description: "Write and organize your notes." },
    { id: "calendar", name: "Calendar", icon: "📅", version: "1.0.0", category: "Productivity", type: "optional", description: "Manage events and dates." },
    { id: "text-editor", name: "Text Editor", icon: "📄", version: "1.0.0", category: "Productivity", type: "optional", description: "Edit plain text files." },
    { id: "browser", name: "Browser", icon: "🌐", version: "1.0.0", category: "Internet", type: "optional", description: "Browse the web from Lucid OS." }
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

function installExternalApp(app) {
    if (!app || !app.id) return false;
    if (isAppInstalled(app.id)) return false;

    const externalApps = getExternalApps();
    if (externalApps.some(item => item.id === app.id)) return false;

    externalApps.push({
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
    });

    saveExternalApps(externalApps);
    window.dispatchEvent(new CustomEvent("lucid-app-installed", { detail: { appId: app.id, app } }));
    return true;
}

const appLaunchers = {};

function initializeAppRegistry() {
    const saved = localStorage.getItem(APP_REGISTRY_KEY);
    const coreIds = appCatalog.filter(app => app.type === "core").map(app => app.id);

    if (!saved) {
        localStorage.setItem(APP_REGISTRY_KEY, JSON.stringify(coreIds));
        return;
    }

    try {
        const existing = JSON.parse(saved);
        const merged = [...new Set([...existing, ...coreIds])];
        localStorage.setItem(APP_REGISTRY_KEY, JSON.stringify(merged));
    } catch {
        localStorage.setItem(APP_REGISTRY_KEY, JSON.stringify(coreIds));
    }
}

function getInstalledIds() {
    const saved = localStorage.getItem(APP_REGISTRY_KEY);
    if (!saved) { initializeAppRegistry(); return getInstalledIds(); }
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
    const builtInApps = appCatalog.filter(app => installedIds.has(app.id)).map(app => ({ ...app, installed: true }));
    const externalApps = getExternalApps();
    return [...builtInApps, ...externalApps];
}

function getAllApps() {
    const installedIds = new Set(getInstalledIds());
    return appCatalog.map(app => ({ ...app, installed: installedIds.has(app.id) }));
}

function getApp(appId) {
    const builtIn = appCatalog.find(app => app.id === appId);
    if (builtIn) return builtIn;
    const externalApps = getExternalApps();
    return externalApps.find(app => app.id === appId) || null;
}

function isAppInstalled(appId) {
    const builtIn = getInstalledIds().includes(appId);
    if (builtIn) return true;
    return getExternalApps().some(app => app.id === appId);
}

function installApp(appId) {
    const app = getApp(appId);
    if (!app) { console.warn(`Lucid: unknown app "${appId}"`); return false; }
    if (isAppInstalled(appId)) return false;

    const installedIds = getInstalledIds();
    installedIds.push(appId);
    saveInstalledIds(installedIds);

    window.dispatchEvent(new CustomEvent("lucid-app-installed", { detail: { appId, app } }));
    return true;
}

function uninstallApp(appId) {
    const app = getApp(appId);
    if (!app) return false;
    if (app.type === "core") { console.warn(`Lucid: cannot uninstall core app "${appId}"`); return false; }

    const installedIds = getInstalledIds();
    const remaining = installedIds.filter(id => id !== appId);
    saveInstalledIds(remaining);

    const externalApps = getExternalApps();
    const remainingExternal = externalApps.filter(item => item.id !== appId);
    saveExternalApps(remainingExternal);

    removeDesktopPosition(appId);

    window.dispatchEvent(new CustomEvent("lucid-app-uninstalled", { detail: { appId, app } }));
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
    if (typeof launcher !== "function") throw new TypeError(`Invalid launcher for ${appId}`);
    appLaunchers[appId] = launcher;
}

function getAppLauncher(appId) {
    return appLaunchers[appId] || null;
}

function registerApp(app) {
    if (!app || !app.id || !app.name) return false;
    if (appCatalog.some(existing => existing.id === app.id)) return false;
    appCatalog.push({ icon: "◇", version: "1.0.0", category: "Other", type: "optional", description: "A Lucid application.", ...app });
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