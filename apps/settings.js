import { createWindow } from "../js/window-manager.js";
import { loadSettings, saveSettings } from "../js/settings.js";

async function createSettingsApp() {
    const settings = await loadSettings();

    const content = `
        <div class="settings-app">
            <div class="settings-sidebar">
                <button class="settings-tab active" data-page="appearance">🖥️ Appearance</button>
                <button class="settings-tab" data-page="account">👤 Account</button>
                <button class="settings-tab" data-page="notifications">🔔 Notifications</button>
                <button class="settings-tab" data-page="storage">💾 Storage</button>
                <button class="settings-tab" data-page="about">ℹ️ About</button>
            </div>
            <div class="settings-content">
                <div class="settings-page" data-page-content="appearance">
                    <h2>Appearance</h2>
                    <p>Change how LucidOS looks.</p>
                    <label class="setting-row">
                        <span>Theme</span>
                        <select class="theme-select">
                            <option value="dark">Dark</option>
                            <option value="light">Light</option>
                        </select>
                    </label>
                </div>
                <div class="settings-page" data-page-content="account" hidden>
                    <h2>Account</h2>
                    <p>Your LucidOS identity.</p>
                    <label class="setting-row">
                        <span>User name</span>
                        <input class="username-input" type="text">
                    </label>
                    <button class="save-account">Save</button>
                    <span class="account-status"></span>
                </div>
                <div class="settings-page" data-page-content="notifications" hidden>
                    <h2>Notifications</h2>
                    <label class="setting-row">
                        <span>Allow notifications</span>
                        <input class="notifications-toggle" type="checkbox">
                    </label>
                </div>
                <div class="settings-page" data-page-content="storage" hidden>
                    <h2>Storage</h2>
                    <p>LucidOS virtual storage</p>
                    <div class="storage-box">
                        <strong>Local browser storage</strong><br>IndexedDB
                    </div>
                </div>
                <div class="settings-page" data-page-content="about" hidden>
                    <h2>About LucidOS</h2>
                    <p>LucidOS is a simulated operating system running inside your browser.</p>
                    <p>Version 0.1</p>
                </div>
            </div>
        </div>
    `;

    const windowElement = createWindow("⚙️ Settings", content);

    const themeSelect = windowElement.querySelector(".theme-select");
    const usernameInput = windowElement.querySelector(".username-input");
    const notificationsToggle = windowElement.querySelector(".notifications-toggle");

    themeSelect.value = settings.theme;
    usernameInput.value = settings.userName;
    notificationsToggle.checked = settings.notifications;

    const tabs = windowElement.querySelectorAll(".settings-tab");
    const pages = windowElement.querySelectorAll(".settings-page");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const target = tab.dataset.page;
            tabs.forEach(other => other.classList.remove("active"));
            tab.classList.add("active");
            pages.forEach(page => {
                page.hidden = page.dataset.pageContent !== target;
            });
        });
    });

    themeSelect.addEventListener("change", async () => {
        settings.theme = themeSelect.value;
        await saveSettings(settings);
    });

    const saveAccount = windowElement.querySelector(".save-account");
    const accountStatus = windowElement.querySelector(".account-status");

    saveAccount.addEventListener("click", async () => {
        settings.userName = usernameInput.value.trim() || "Lucid User";
        await saveSettings(settings);
        accountStatus.textContent = "Saved ✓";
        setTimeout(() => { accountStatus.textContent = ""; }, 1500);
    });

    notificationsToggle.addEventListener("change", async () => {
        settings.notifications = notificationsToggle.checked;
        await saveSettings(settings);
    });

    return windowElement;
}

export { createSettingsApp };