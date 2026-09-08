import { loadSettings, saveSettings, resetSettings } from "../js/settings.js";
import { getInstalledApps, uninstallApp } from "../js/app-registry.js";
import { getStorageUsage, resetUserFiles, deleteDatabase } from "../js/filesystem.js";
import { getCurrentUser, getOwnSubmissions, getReviewQueue, reviewSubmission } from "../js/lucid-store-api.js";
function createSettingsApp(createWindow) {
return loadSettings().then(async settings => {
const content = `<div class="settings-app"><aside class="settings-sidebar"><div class="settings-brand"><span>◈</span><div><strong>LucidOS</strong><small>System settings</small></div></div><button class="settings-tab active" data-page="appearance">🖥️ <span>Appearance</span></button><button class="settings-tab" data-page="account">👤 <span>Account</span></button><button class="settings-tab" data-page="notifications">🔔 <span>Notifications</span></button><button class="settings-tab" data-page="storage">💾 <span>Storage</span></button><button class="settings-tab" data-page="system">⚙️ <span>System</span></button><button class="settings-tab" data-page="about">ℹ️ <span>About</span></button></aside><main class="settings-content"><section class="settings-page" data-page-content="appearance"><div class="settings-page-header"><div><span class="settings-eyebrow">PERSONALIZATION</span><h2>Appearance</h2><p>Customize how LucidOS looks and feels.</p></div></div><div class="settings-section-card"><div class="settings-section-heading"><div><strong>Theme</strong><small>Choose the appearance used across LucidOS.</small></div><select class="theme-select"><option value="dark">Dark</option><option value="light">Light</option></select></div></div><div class="settings-section-card"><div class="settings-section-heading"><div><strong>Online wallpaper</strong><small>Use an image URL as your desktop background.</small></div></div><input class="wallpaper-input settings-wide" type="url" placeholder="https://example.com/wallpaper.jpg"><p class="settings-hint">Leave the wallpaper empty to use LucidOS's default dark space background.</p><div class="settings-actions"><button class="save-wallpaper">Save wallpaper</button><button class="clear-wallpaper">Use default</button><span class="wallpaper-status"></span></div></div></section><section class="settings-page" data-page-content="account" hidden><div class="settings-page-header"><div><span class="settings-eyebrow">LUCID IDENTITY</span><h2>Account</h2><p class="account-page-description">Your Lucid account works across Settings, Store, Studio, reviews, and subscriptions.</p></div><div class="settings-page-mark">◉</div></div><section class="account-auth-card"><div class="account-card-icon">◉</div><div class="account-card-copy"><strong>Lucid Account</strong><small class="account-auth-detail">Sign in or create an account to use LucidOS services.</small></div><button type="button" class="account-auth-button">Sign in / Create account</button></section><section class="account-plan-card"><div><span class="account-plan-label">LUCID PLUS</span><h3>Free plan</h3><p>100 MB publishing limit and access to the Lucid Store.</p></div><button type="button" class="account-plan-button">Upgrade to Plus</button></section><section class="settings-section-card"><div class="settings-section-heading"><div><strong>Local profile</strong><small>Your display name on this device.</small></div></div><div class="settings-profile-grid"><label><span>User name</span><input class="username-input" type="text"></label><button class="save-account">Save changes</button><span class="account-status"></span></div></section><section class="settings-section-card account-submissions-card"><div class="settings-section-heading"><div><strong>My submissions</strong><small>Track apps you have sent to the Lucid Store.</small></div><button type="button" class="submissions-refresh">Refresh</button></div><div class="account-submissions-list"></div></section><section class="settings-section-card reviewer-card" hidden><div class="settings-section-heading"><div><strong>Store review queue</strong><small>Approve or reject pending developer submissions.</small></div><button type="button" class="reviewer-refresh">Refresh</button></div><div class="reviewer-list"></div></section></section><section class="settings-page" data-page-content="notifications" hidden><div class="settings-page-header"><div><span class="settings-eyebrow">SYSTEM BEHAVIOR</span><h2>Notifications</h2><p>Control how LucidOS handles notifications.</p></div></div><section class="settings-section-card"><div class="settings-section-heading"><div><strong>Allow notifications</strong><small>Let Lucid apps display notifications.</small></div><input class="notifications-toggle" type="checkbox"></div></section></section><section class="settings-page" data-page-content="storage" hidden><div class="settings-page-header"><div><span class="settings-eyebrow">LOCAL DATA</span><h2>Storage</h2><p>Manage files and data stored by LucidOS in this browser.</p></div></div><div class="storage-box"><strong class="storage-size">Calculating...</strong><span>Used by Lucid Files</span></div><section class="settings-section-card"><strong>Folders</strong><p>Documents · Downloads · Pictures · Music · Videos · Desktop</p></section><button class="storage-reset danger-action">Reset user files</button><span class="storage-status"></span></section><section class="settings-page" data-page-content="system" hidden><div class="settings-page-header"><div><span class="settings-eyebrow">SYSTEM</span><h2>System</h2><p>Manage installed Lucid applications and reset the OS.</p></div></div><div class="installed-apps"></div><div class="danger-zone"><h3>Reset LucidOS</h3><p>Erase local files, settings, installed apps, and cached data from this browser.</p><button class="erase-everything">Erase everything</button></div></section><section class="settings-page" data-page-content="about" hidden><div class="settings-page-header"><div><span class="settings-eyebrow">ABOUT</span><h2>About LucidOS</h2><p>LucidOS is a simulated operating system running inside your browser.</p></div></div><section class="settings-section-card about-card"><div><strong>LucidOS</strong><span>Version 0.2</span></div><p>Built as a browser-based desktop environment for Lucid applications.</p></section></section></main></div>`;
const windowElement = createWindow("⚙️ Settings", content);
const themeSelect = windowElement.querySelector(".theme-select");
const usernameInput = windowElement.querySelector(".username-input");
const notificationsToggle = windowElement.querySelector(".notifications-toggle");
const wallpaperInput = windowElement.querySelector(".wallpaper-input");
const user = await getCurrentUser();
themeSelect.value = settings.theme;
usernameInput.value = settings.userName;
notificationsToggle.checked = settings.notifications;
wallpaperInput.value = settings.wallpaper || "";
applyTheme(settings.theme);
if (user?.email) windowElement.querySelector(".account-page-description").textContent = user.email;
const role = String(user?.app_metadata?.role || "").toLowerCase();
const reviewerCard = windowElement.querySelector(".reviewer-card");
if (["admin", "reviewer"].includes(role)) {
reviewerCard.hidden = false;
await renderReviewQueue(windowElement);
}
await renderOwnSubmissions(windowElement);
windowElement.querySelectorAll(".settings-tab").forEach(tab => tab.addEventListener("click", async () => {
windowElement.querySelectorAll(".settings-tab").forEach(other => other.classList.remove("active"));
tab.classList.add("active");
windowElement.querySelectorAll(".settings-page").forEach(page => page.hidden = page.dataset.pageContent !== tab.dataset.page);
if (tab.dataset.page === "system") renderInstalledApps(windowElement);
if (tab.dataset.page === "storage") updateStorage(windowElement);
if (tab.dataset.page === "account") { await renderOwnSubmissions(windowElement); if (!reviewerCard.hidden) await renderReviewQueue(windowElement); }
}));
themeSelect.addEventListener("change", async () => { settings.theme = themeSelect.value; applyTheme(settings.theme); await saveSettings(settings); window.dispatchEvent(new CustomEvent("lucid-settings-changed", { detail: { theme: settings.theme, wallpaper: settings.wallpaper } })); });
windowElement.querySelector(".save-account").addEventListener("click", async () => { settings.userName = usernameInput.value.trim() || "Lucid User"; await saveSettings(settings); const status = windowElement.querySelector(".account-status"); status.textContent = "Saved ✓"; setTimeout(() => status.textContent = "", 1200); });
notificationsToggle.addEventListener("change", async () => { settings.notifications = notificationsToggle.checked; await saveSettings(settings); });
windowElement.querySelector(".save-wallpaper").addEventListener("click", async () => { const value = wallpaperInput.value.trim(); if (value) { try { const url = new URL(value); if (!["https:", "http:"].includes(url.protocol)) throw new Error(); } catch { windowElement.querySelector(".wallpaper-status").textContent = "Enter a valid http(s) image URL."; return; } } settings.wallpaper = value; await saveSettings(settings); window.dispatchEvent(new CustomEvent("lucid-settings-changed", { detail: { wallpaper: value } })); windowElement.querySelector(".wallpaper-status").textContent = value ? "Wallpaper saved ✓" : "Default restored ✓"; });
windowElement.querySelector(".clear-wallpaper").addEventListener("click", async () => { settings.wallpaper = ""; wallpaperInput.value = ""; await saveSettings(settings); window.dispatchEvent(new CustomEvent("lucid-settings-changed", { detail: { wallpaper: "" } })); windowElement.querySelector(".wallpaper-status").textContent = "Default restored ✓"; });
windowElement.querySelector(".submissions-refresh").addEventListener("click", () => renderOwnSubmissions(windowElement));
windowElement.querySelector(".reviewer-refresh").addEventListener("click", () => renderReviewQueue(windowElement));
windowElement.querySelector(".storage-reset").addEventListener("click", async () => { if (!confirm("Reset the Lucid Files folders? Your saved files will be removed.")) return; await resetUserFiles(); updateStorage(windowElement); windowElement.querySelector(".storage-status").textContent = "Files reset ✓"; });
windowElement.querySelector(".erase-everything").addEventListener("click", async () => { if (!confirm("Erase everything stored by LucidOS on this browser?")) return; if (!confirm("This cannot be undone. Continue?")) return; try { await deleteDatabase(); await resetSettings(); await new Promise(resolve => { const request = indexedDB.deleteDatabase("lucid-media-db"); request.onsuccess = request.onerror = request.onblocked = () => resolve(); }); } finally { localStorage.clear(); location.reload(); } });
updateStorage(windowElement);
return windowElement;
});
}
async function renderOwnSubmissions(windowElement) {
const container = windowElement.querySelector(".account-submissions-list");
if (!container) return;
container.innerHTML = '<div class="settings-empty">Loading submissions…</div>';
try {
const submissions = await getOwnSubmissions();
container.innerHTML = submissions.length ? submissions.map(item => `<div class="submission-row"><div><strong>${escapeHTML(item.name)}</strong><small>v${escapeHTML(item.version)} · ${escapeHTML(item.status)}</small></div><span>${item.status === "rejected" ? escapeHTML(item.rejection_reason || "No reason given") : escapeHTML(new Date(item.submitted_at).toLocaleDateString())}</span></div>`).join("") : '<div class="settings-empty">No submissions yet.</div>';
} catch (error) {
container.innerHTML = `<div class="settings-empty">${escapeHTML(error.message || "Unable to load submissions.")}</div>`;
}
}
async function renderReviewQueue(windowElement) {
const container = windowElement.querySelector(".reviewer-list");
if (!container) return;
container.innerHTML = '<div class="settings-empty">Loading review queue…</div>';
try {
const submissions = await getReviewQueue();
container.innerHTML = submissions.length ? submissions.map(item => `<div class="reviewer-row"><div><strong>${escapeHTML(item.name)}</strong><small>v${escapeHTML(item.version)} · ${escapeHTML(item.category)} · ${Math.ceil(Number(item.package_size || 0) / 1024)} KB</small><p>${escapeHTML(item.description || "")}</p></div><div class="reviewer-actions"><button data-review="approved" data-id="${item.id}">Approve</button><button data-review="rejected" data-id="${item.id}">Reject</button></div></div>`).join("") : '<div class="settings-empty">Nothing waiting for review.</div>';
container.querySelectorAll("button[data-review]").forEach(button => button.addEventListener("click", async () => { const decision = button.dataset.review; let reason = ""; if (decision === "rejected") { reason = prompt("Why is this submission being rejected?") || ""; if (!reason.trim()) return; } button.disabled = true; try { await reviewSubmission(button.dataset.id, decision, reason); await renderReviewQueue(windowElement); } catch (error) { alert(error.message || "Review failed."); button.disabled = false; } }));
} catch (error) {
container.innerHTML = `<div class="settings-empty">${escapeHTML(error.message || "Reviewer access unavailable.")}</div>`;
}
}
function renderInstalledApps(windowElement) {
const container = windowElement.querySelector(".installed-apps");
const apps = getInstalledApps();
const optional = apps.filter(app => app.type !== "core");
container.innerHTML = optional.length ? optional.map(app => `<div class="installed-app-row"><span class="installed-app-icon">${app.icon}</span><div><strong>${escapeHTML(app.name)}</strong><small>v${escapeHTML(app.version || "1.0.0")}</small></div><button class="uninstall-app" data-app-id="${escapeHTML(app.id)}">Uninstall</button></div>`).join("") : '<div class="settings-empty">No optional apps installed.</div>';
container.querySelectorAll(".uninstall-app").forEach(button => button.addEventListener("click", () => { const app = apps.find(item => item.id === button.dataset.appId); if (!app || !confirm(`Uninstall ${app.name}?`)) return; uninstallApp(app.id); renderInstalledApps(windowElement); }));
}
function updateStorage(windowElement) { windowElement.querySelector(".storage-size").textContent = formatBytes(getStorageUsage()); }
function formatBytes(bytes) { if (!bytes) return "0 KB"; const units = ["B", "KB", "MB", "GB"]; const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1); return `${(bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0)} ${units[index]}`; }
function applyTheme(theme) { document.documentElement.dataset.theme = theme || "dark"; }
function escapeHTML(text) { return String(text ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
export { createSettingsApp };
