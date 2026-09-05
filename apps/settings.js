import { createWindow } from "../js/window-manager.js";
import { loadSettings, saveSettings, resetSettings } from "../js/settings.js";
import { getInstalledApps, uninstallApp } from "../js/app-registry.js";
import { getStorageUsage, resetUserFiles, deleteDatabase } from "../js/filesystem.js";

function createSettingsApp() {
    return loadSettings().then(settings => {
        const content = `
            <div class="settings-app">
                <div class="settings-sidebar">
                    <button class="settings-tab active" data-page="appearance">🖥️ Appearance</button>
                    <button class="settings-tab" data-page="account">👤 Account</button>
                    <button class="settings-tab" data-page="notifications">🔔 Notifications</button>
                    <button class="settings-tab" data-page="storage">💾 Storage</button>
                    <button class="settings-tab" data-page="system">⚙️ System</button>
                    <button class="settings-tab" data-page="about">ℹ️ About</button>
                </div>
                <div class="settings-content">
                    <div class="settings-page" data-page-content="appearance">
                        <h2>Appearance</h2>
                        <p>Change how LucidOS looks.</p>
                        <label class="setting-row"><span>Theme</span><select class="theme-select"><option value="dark">Dark</option><option value="light">Light</option></select></label>
                        <label class="setting-row settings-wide"><span>Online wallpaper</span><input class="wallpaper-input" type="url" placeholder="https://example.com/wallpaper.jpg"></label>
                        <p class="settings-hint">Leave the wallpaper empty to use LucidOS's default dark space background.</p>
                        <div class="settings-actions"><button class="save-wallpaper">Save wallpaper</button><button class="clear-wallpaper">Use default</button></div>
                        <span class="wallpaper-status"></span>
                    </div>

                    <div class="settings-page" data-page-content="account" hidden>
                        <h2>Account</h2>
                        <p>Your local LucidOS identity.</p>
                        <label class="setting-row"><span>User name</span><input class="username-input" type="text"></label>
                        <button class="save-account">Save</button> <span class="account-status"></span>
                    </div>

                    <div class="settings-page" data-page-content="notifications" hidden>
                        <h2>Notifications</h2>
                        <label class="setting-row"><span>Allow notifications</span><input class="notifications-toggle" type="checkbox"></label>
                    </div>

                    <div class="settings-page" data-page-content="storage" hidden>
                        <h2>Storage</h2>
                        <p>Everything saved by Lucid apps lives in IndexedDB on this device.</p>
                        <div class="storage-box"><strong class="storage-size">Calculating...</strong><br>Used by Lucid Files</div>
                        <div class="storage-box"><strong>Folders</strong><br>Documents · Downloads · Pictures · Music · Videos · Desktop</div>
                        <button class="storage-reset">Reset user files</button>
                        <span class="storage-status"></span>
                    </div>

                    <div class="settings-page" data-page-content="system" hidden>
                        <h2>System</h2>
                        <p>Manage installed Lucid applications and reset the OS.</p>
                        <div class="installed-apps"></div>
                        <div class="danger-zone">
                            <h3>Reset LucidOS</h3>
                            <p>Erase local files, settings, installed apps, and cached data from this browser.</p>
                            <button class="erase-everything">Erase everything</button>
                        </div>
                    </div>

                    <div class="settings-page" data-page-content="about" hidden>
                        <h2>About LucidOS</h2>
                        <p>LucidOS is a simulated operating system running inside your browser.</p>
                        <p>Version 0.2</p>
                    </div>
                </div>
            </div>
        `;

        const windowElement = createWindow("⚙️ Settings", content);
        const themeSelect = windowElement.querySelector(".theme-select");
        const usernameInput = windowElement.querySelector(".username-input");
        const notificationsToggle = windowElement.querySelector(".notifications-toggle");
        const wallpaperInput = windowElement.querySelector(".wallpaper-input");

        themeSelect.value = settings.theme;
        usernameInput.value = settings.userName;
        notificationsToggle.checked = settings.notifications;
        wallpaperInput.value = settings.wallpaper || "";
        applyTheme(settings.theme);

        windowElement.querySelectorAll(".settings-tab").forEach(tab => {
            tab.addEventListener("click", () => {
                windowElement.querySelectorAll(".settings-tab").forEach(other => other.classList.remove("active"));
                tab.classList.add("active");
                windowElement.querySelectorAll(".settings-page").forEach(page => {
                    page.hidden = page.dataset.pageContent !== tab.dataset.page;
                });
                if (tab.dataset.page === "system") renderInstalledApps(windowElement);
                if (tab.dataset.page === "storage") updateStorage(windowElement);
            });
        });

        themeSelect.addEventListener("change", async () => {
            settings.theme = themeSelect.value;
            applyTheme(settings.theme);
            await saveSettings(settings);
            window.dispatchEvent(new CustomEvent("lucid-settings-changed", { detail: { theme: settings.theme, wallpaper: settings.wallpaper } }));
        });

        windowElement.querySelector(".save-account").addEventListener("click", async () => {
            settings.userName = usernameInput.value.trim() || "Lucid User";
            await saveSettings(settings);
            const status = windowElement.querySelector(".account-status");
            status.textContent = "Saved ✓";
            setTimeout(() => status.textContent = "", 1200);
        });

        notificationsToggle.addEventListener("change", async () => {
            settings.notifications = notificationsToggle.checked;
            await saveSettings(settings);
        });

        windowElement.querySelector(".save-wallpaper").addEventListener("click", async () => {
            const value = wallpaperInput.value.trim();
            if (value) {
                try {
                    const url = new URL(value);
                    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
                } catch {
                    windowElement.querySelector(".wallpaper-status").textContent = "Enter a valid http(s) image URL.";
                    return;
                }
            }

            settings.wallpaper = value;
            await saveSettings(settings);
            window.dispatchEvent(new CustomEvent("lucid-settings-changed", { detail: { wallpaper: value } }));
            windowElement.querySelector(".wallpaper-status").textContent = value ? "Wallpaper saved ✓" : "Default restored ✓";
        });

        windowElement.querySelector(".clear-wallpaper").addEventListener("click", async () => {
            settings.wallpaper = "";
            wallpaperInput.value = "";
            await saveSettings(settings);
            window.dispatchEvent(new CustomEvent("lucid-settings-changed", { detail: { wallpaper: "" } }));
            windowElement.querySelector(".wallpaper-status").textContent = "Default restored ✓";
        });

        windowElement.querySelector(".storage-reset").addEventListener("click", async () => {
            if (!confirm("Reset the Lucid Files folders? Your saved files will be removed.")) return;
            await resetUserFiles();
            updateStorage(windowElement);
            windowElement.querySelector(".storage-status").textContent = "Files reset ✓";
        });

        windowElement.querySelector(".erase-everything").addEventListener("click", async () => {
            if (!confirm("Erase everything stored by LucidOS on this browser?")) return;
            if (!confirm("This cannot be undone. Continue?")) return;

            try {
                await deleteDatabase();
                await resetSettings();
                await new Promise(resolve => {
                    const request = indexedDB.deleteDatabase("lucid-media-db");
                    request.onsuccess = request.onerror = request.onblocked = () => resolve();
                });
            } finally {
                localStorage.clear();
                location.reload();
            }
        });

        updateStorage(windowElement);
        return windowElement;
    });
}

function renderInstalledApps(windowElement) {
    const container = windowElement.querySelector(".installed-apps");
    const apps = getInstalledApps();
    const optional = apps.filter(app => app.type !== "core");

    container.innerHTML = optional.length ? optional.map(app => `
        <div class="installed-app-row">
            <span class="installed-app-icon">${app.icon}</span>
            <div><strong>${escapeHTML(app.name)}</strong><small>v${escapeHTML(app.version || "1.0.0")}</small></div>
            <button class="uninstall-app" data-app-id="${escapeHTML(app.id)}">Uninstall</button>
        </div>
    `).join("") : '<div class="settings-empty">No optional apps installed.</div>';

    container.querySelectorAll(".uninstall-app").forEach(button => {
        button.addEventListener("click", () => {
            const app = apps.find(item => item.id === button.dataset.appId);
            if (!app || !confirm(`Uninstall ${app.name}?`)) return;
            uninstallApp(app.id);
            renderInstalledApps(windowElement);
        });
    });
}

function updateStorage(windowElement) {
    const size = getStorageUsage();
    windowElement.querySelector(".storage-size").textContent = formatBytes(size);
}

function formatBytes(bytes) {
    if (!bytes) return "0 KB";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme || "dark";
}

function escapeHTML(text) {
    return String(text ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

export { createSettingsApp };