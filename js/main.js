import { createFilesApp } from "../apps/files.js";
import { createStoreApp } from "../apps/lucid-store.js";
import { createMediaApp } from "../apps/media.js";
import { createLucidPaint } from "../apps/lucid-paint.js";
import { createCalculator } from "../apps/calculator.js";
import { createNotes } from "../apps/notes.js";
import { createCalendar } from "../apps/calendar.js";
import { createTextEditor } from "../apps/text-editor.js";
import { createTerminal } from "../apps/terminal.js";
import { loadFileSystem } from "./filesystem.js";
import { loadSettings } from "./settings.js";
import { createSettingsApp } from "../apps/settings.js";
import { createBrowser } from "../apps/browser.js";
import { getLucidLevel } from "./lucid-state.js";
import { initializeAppRegistry, getInstalledApps, registerAppLauncher, getAppLauncher } from "./app-registry.js";
import { createLucidStudio } from "../apps/lucid-studio.js";
console.log("Lucid level:", getLucidLevel());
await loadFileSystem();
initializeAppRegistry();
registerAppLauncher("lucid-studio", createLucidStudio);
registerAppLauncher("files", createFilesApp);
registerAppLauncher("settings", createSettingsApp);
registerAppLauncher("terminal", createTerminal);
registerAppLauncher("store", createStoreApp);
registerAppLauncher("calculator", createCalculator);
registerAppLauncher("media", createMediaApp);
registerAppLauncher("paint", createLucidPaint);
registerAppLauncher("notes", createNotes);
registerAppLauncher("calendar", createCalendar);
registerAppLauncher("text-editor", createTextEditor);
registerAppLauncher("browser", createBrowser);
function updateClock() {
    const clock = document.getElementById("clock");
    if (!clock) return;
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const text = `${hours}:${minutes}`;
    if (clock.textContent !== text) clock.textContent = text;
}
updateClock();
setInterval(updateClock, 1000);
const DESKTOP_POSITIONS_KEY = "lucid-desktop-positions";
let launcherOpen = false;
let launcherAnimation = 0;
function isOrbObscured() {
    const orb = document.getElementById("start-button");
    if (!orb) return false;
    const r = orb.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const windows = document.querySelectorAll(".window:not(.minimized)");
    for (const win of windows) {
        const wr = win.getBoundingClientRect();
        if (cx >= wr.left && cx <= wr.right && cy >= wr.top && cy <= wr.bottom) return true;
    }
    return false;
}
function loadDesktopPositions() {
    try {
        return JSON.parse(localStorage.getItem(DESKTOP_POSITIONS_KEY)) || {};
    } catch {
        return {};
    }
}
function saveDesktopPosition(appId, x, y) {
    const positions = loadDesktopPositions();
    positions[appId] = { x, y };
    localStorage.setItem(DESKTOP_POSITIONS_KEY, JSON.stringify(positions));
}
function escapeHTML(text) {
    return String(text ?? "").replaceAll("&", "&" + "amp;").replaceAll("<", "&" + "lt;").replaceAll(">", "&" + "gt;").replaceAll('"', "&" + "quot;").replaceAll("'", "&#039;");
}
function launchLucidApp(app) {
    closeLucidLauncher();
    const launcher = getAppLauncher(app.id);
    if (!launcher) {
        console.warn(`Lucid: app ${app.id} has no launcher`);
        return;
    }
    launcher();
}
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
function buildDesktopApps() {
    const container = document.getElementById("desktop-apps");
    if (!container) return;
    container.innerHTML = "";
    const installedApps = getInstalledApps();
    const positions = loadDesktopPositions();
    installedApps.forEach((app, index) => {
        const button = document.createElement("button");
        button.className = "desktop-app";
        button.innerHTML = `<span class="desktop-app-icon">${app.icon}</span><span class="desktop-app-name">${escapeHTML(app.name)}</span>`;
        const saved = positions[app.id];
        const position = saved || defaultPositions[index % defaultPositions.length];
        button.style.left = "50%";
        button.style.top = "50%";
        button.dataset.targetX = position.x;
        button.dataset.targetY = position.y;
        setupDesktopApp(button, app);
        container.appendChild(button);
    });
}
function shuffleApps(apps) {
    const result = Array.from(apps);
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
function createVoidOrigin(rect, targetX, targetY) {
    const side = Math.floor(Math.random() * 4);
    let x;
    let y;
    if (side === 0) {
        x = Math.random() * rect.width;
        y = -rect.height * (0.35 + Math.random() * 0.45);
    } else if (side === 1) {
        x = rect.width + rect.width * (0.2 + Math.random() * 0.6);
        y = Math.random() * rect.height;
    } else if (side === 2) {
        x = Math.random() * rect.width;
        y = rect.height + rect.height * (0.2 + Math.random() * 0.6);
    } else {
        x = -rect.width * (0.2 + Math.random() * 0.6);
        y = Math.random() * rect.height;
    }
    return { x: x - targetX, y: y - targetY };
}
function moveAppsToSavedPositions() {
    const container = document.getElementById("desktop-apps");
    if (!container) return;
    launcherAnimation += 1;
    const animationId = launcherAnimation;
    const rect = container.getBoundingClientRect();
    const apps = shuffleApps([...container.querySelectorAll(".desktop-app")]);
    let cursor = 0;
    let group = 0;
    while (cursor < apps.length) {
        const batchSize = Math.min(1 + Math.floor(Math.random() * 2), apps.length - cursor);
        for (let i = 0; i < batchSize; i++) {
            const app = apps[cursor + i];
            app.getAnimations().forEach(animation => animation.cancel());
            const targetX = Number(app.dataset.targetX);
            const targetY = Number(app.dataset.targetY);
            const targetPX = targetX / 100 * rect.width;
            const targetPY = targetY / 100 * rect.height;
            const origin = createVoidOrigin(rect, targetPX, targetPY);
            const driftX = origin.x * (0.08 + Math.random() * 0.05);
            const driftY = origin.y * (0.08 + Math.random() * 0.05);
            const delay = group * (280 + Math.random() * 220) + i * 70;
            app.style.left = `${targetX}%`;
            app.style.top = `${targetY}%`;
            app.style.opacity = "0";
            app.animate([
                { transform: `translate3d(-50%, -50%, 0) translate3d(${origin.x}px, ${origin.y}px, 0) scale(${0.72 + Math.random() * 0.1})`, opacity: 0 },
                { transform: `translate3d(-50%, -50%, 0) translate3d(${driftX}px, ${driftY}px, 0) scale(0.97)`, opacity: 0.65, offset: 0.58 },
                { transform: "translate3d(-50%, -50%, 0) translate3d(0, 0, 0) scale(1)", opacity: 1 }
            ], { duration: 1250 + Math.random() * 350, delay, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" });
        }
        cursor += batchSize;
        group += 1;
    }
    setTimeout(() => {
        if (animationId !== launcherAnimation || !launcherOpen) return;
        apps.forEach(app => {
            app.style.opacity = "1";
        });
    }, group * 500 + 1900);
}
function moveAppsToVoid() {
    launcherAnimation += 1;
    const container = document.getElementById("desktop-apps");
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const apps = shuffleApps([...container.querySelectorAll(".desktop-app")]);
    apps.forEach((app, index) => {
        app.getAnimations().forEach(animation => animation.cancel());
        const targetX = Number(app.dataset.targetX);
        const targetY = Number(app.dataset.targetY);
        const targetPX = targetX / 100 * rect.width;
        const targetPY = targetY / 100 * rect.height;
        const origin = createVoidOrigin(rect, targetPX, targetPY);
        app.animate([
            { transform: "translate3d(-50%, -50%, 0) translate3d(0, 0, 0) scale(1)", opacity: 1 },
            { transform: `translate3d(-50%, -50%, 0) translate3d(${origin.x * 0.18}px, ${origin.y * 0.18}px, 0) scale(0.94)`, opacity: 0.45, offset: 0.38 },
            { transform: `translate3d(-50%, -50%, 0) translate3d(${origin.x}px, ${origin.y}px, 0) scale(0.68)`, opacity: 0 }
        ], { duration: 900 + Math.random() * 350, delay: index * 55, easing: "cubic-bezier(0.7, 0, 0.84, 0)", fill: "forwards" });
    });
}
function openLucidLauncher() {
    if (launcherOpen) return;
    const desktop = document.getElementById("desktop");
    if (!desktop) return;
    launcherOpen = true;
    desktop.classList.add("lucid-launcher-open");
    moveAppsToSavedPositions();
}
function closeLucidLauncher() {
    if (!launcherOpen) return;
    const desktop = document.getElementById("desktop");
    launcherOpen = false;
    moveAppsToVoid();
    setTimeout(() => {
        if (!launcherOpen) desktop.classList.remove("lucid-launcher-open");
    }, 1050);
}
function setupDesktopApp(element, app) {
    let dragging = false;
    let moved = false;
    let startPointerX = 0;
    let startPointerY = 0;
    let startLeft = 0;
    let startTop = 0;
    element.addEventListener("pointerdown", event => {
        if (!launcherOpen || event.button !== 0) return;
        dragging = true;
        moved = false;
        startPointerX = event.clientX;
        startPointerY = event.clientY;
        startLeft = parseFloat(element.dataset.targetX);
        startTop = parseFloat(element.dataset.targetY);
        element.setPointerCapture(event.pointerId);
        event.preventDefault();
    });
    element.addEventListener("pointermove", event => {
        if (!dragging) return;
        const desktop = document.getElementById("desktop-apps");
        const rect = desktop.getBoundingClientRect();
        const dx = event.clientX - startPointerX;
        const dy = event.clientY - startPointerY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true;
        let x = startLeft + (dx / rect.width) * 100;
        let y = startTop + (dy / rect.height) * 100;
        x = Math.max(8, Math.min(92, x));
        y = Math.max(10, Math.min(88, y));
        element.dataset.targetX = x;
        element.dataset.targetY = y;
        element.style.left = `${x}%`;
        element.style.top = `${y}%`;
    });
    element.addEventListener("pointerup", () => {
        if (!dragging) return;
        dragging = false;
        if (moved) saveDesktopPosition(app.id, Number(element.dataset.targetX), Number(element.dataset.targetY));
    });
    element.addEventListener("click", event => {
        if (moved) {
            event.preventDefault();
            moved = false;
            return;
        }
        launchLucidApp(app);
    });
}
function applyWallpaper(url) {
    const desktop = document.getElementById("desktop");
    if (!desktop) return;
    const cleanUrl = String(url || "").trim();
    if (!cleanUrl) {
        desktop.style.removeProperty("background-image");
        desktop.style.removeProperty("background-size");
        desktop.style.removeProperty("background-position");
        desktop.style.removeProperty("background-repeat");
        return;
    }
    desktop.style.backgroundImage = `url("${cleanUrl.replaceAll('"', '\\"')}")`;
    desktop.style.backgroundSize = "cover";
    desktop.style.backgroundPosition = "center";
    desktop.style.backgroundRepeat = "no-repeat";
}
function applyStoredTheme(theme) {
    document.documentElement.dataset.theme = theme === "light" ? "light" : "dark";
}
buildDesktopApps();
loadSettings().then(settings => {
    applyStoredTheme(settings.theme);
    applyWallpaper(settings.wallpaper);
}).catch(error => console.warn("Lucid: could not load settings", error));
window.addEventListener("lucid-settings-changed", event => {
    if (event.detail?.theme) applyStoredTheme(event.detail.theme);
    if (event.detail?.wallpaper !== undefined) applyWallpaper(event.detail.wallpaper);
});
window.addEventListener("lucid-app-installed", () => buildDesktopApps());
window.addEventListener("lucid-app-uninstalled", () => buildDesktopApps());
const startButton = document.getElementById("start-button");
if (startButton) {
    startButton.addEventListener("click", event => {
        event.stopPropagation();
        if (isOrbObscured()) return;
        if (launcherOpen) closeLucidLauncher();
        else openLucidLauncher();
    });
}
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && launcherOpen) closeLucidLauncher();
});
