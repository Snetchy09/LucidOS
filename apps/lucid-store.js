import { createWindow } from "../js/window-manager.js";
import { isAppInstalled, installExternalApp, installApp, uninstallApp } from "../js/app-registry.js";
import { getStoreApps, getCurrentUser, getAppReviews, saveAppReview, recordAppDownload } from "../js/lucid-store-api.js";
const builtInStoreApps = [{ id: "paint", name: "Lucid Paint", icon: "🎨", icon_url: "", category: "Creative", version: "1.0.0", app_type: "optional", description: "Paint, pixel art, and simple animations.", package_key: null, source_key: null, entry_point: null, review_count: 0, average_rating: 0, download_count: 0 }];
async function createStoreApp() {
    const content = `<div class="lucid-store"><header class="store-header"><div><div class="store-eyebrow">LUCID OS</div><h1>Lucid Store</h1><p>Discover apps for your desktop.</p></div><div class="store-header-icon">🛍</div></header><nav class="store-categories"><button class="store-category active" data-category="All">All</button><button class="store-category" data-category="Utilities">Utilities</button><button class="store-category" data-category="Productivity">Productivity</button><button class="store-category" data-category="Internet">Internet</button><button class="store-category" data-category="Media">Media</button><button class="store-category" data-category="Creative">Creative</button><button class="store-category" data-category="System">System</button></nav><main class="store-grid" id="store-grid"></main></div>`;
    const windowElement = createWindow("Lucid Store", content);
    setupStore(windowElement);
    await loadStoreCatalog(windowElement);
    return windowElement;
}
function setupStore(windowElement) {
    const root = windowElement.querySelector(".lucid-store");
    renderApps(root, "All");
    window.addEventListener("lucid-app-installed", () => renderApps(root, root.querySelector(".store-category.active")?.dataset.category || "All"));
    window.addEventListener("lucid-app-uninstalled", () => renderApps(root, root.querySelector(".store-category.active")?.dataset.category || "All"));
    root.querySelectorAll(".store-category").forEach(button => button.addEventListener("click", () => { root.querySelectorAll(".store-category").forEach(item => item.classList.remove("active")); button.classList.add("active"); renderApps(root, button.dataset.category); }));
}
function renderApps(root, category) {
    const grid = root.querySelector("#store-grid");
    const apps = root.__storeApps || [];
    const normalizedApps = apps.map(app => ({ ...app, icon: app.icon || app.icon_url || "◇", type: app.app_type || "community", installed: isAppInstalled(app.id) }));
    const filteredApps = category === "All" ? normalizedApps : normalizedApps.filter(app => app.category === category);
    grid.innerHTML = "";
    if (!filteredApps.length) { grid.innerHTML = '<div class="store-empty">No apps in this category yet.</div>'; return; }
    filteredApps.forEach(app => {
        const card = document.createElement("article");
        card.className = "store-app-card";
        const rating = Number(app.average_rating || 0);
        const reviews = Number(app.review_count || 0);
        const downloads = Number(app.download_count || 0);
        card.innerHTML = `<div class="store-app-icon">${escapeHTML(app.icon)}</div><div class="store-app-content"><div class="store-app-top"><h2>${escapeHTML(app.name)}</h2><span class="store-app-version">v${escapeHTML(app.version)}</span></div><div class="store-app-category">${escapeHTML(app.category)}</div><p>${escapeHTML(app.description || "A Lucid OS application.")}</p><div class="store-app-meta"><span>${rating ? `★ ${rating.toFixed(1)}` : "—"}${reviews ? ` (${reviews})` : ""}</span><span>${downloads} ${downloads === 1 ? "install" : "installs"}</span></div><button type="button" class="store-open-app">View app</button></div>`;
        card.addEventListener("click", event => { if (!event.target.closest("button")) openAppDetails(app); });
        card.querySelector(".store-open-app").addEventListener("click", () => openAppDetails(app));
        grid.appendChild(card);
    });
}
async function loadStoreCatalog(windowElement) {
    const root = windowElement.querySelector(".lucid-store");
    const grid = root.querySelector("#store-grid");
    grid.innerHTML = '<div class="store-loading">Loading Lucid Store...</div>';
    try {
        const apps = await getStoreApps();
        root.__storeApps = [...builtInStoreApps, ...apps.filter(app => !builtInStoreApps.some(local => local.id === app.id))];
        renderApps(root, "All");
    } catch (error) {
        console.error("Lucid Store failed to load:", error);
        root.__storeApps = builtInStoreApps;
        renderApps(root, "All");
    }
}
async function openAppDetails(app) {
    const user = await getCurrentUser();
    const reviews = await getAppReviews(app.id).catch(() => []);
    const installed = isAppInstalled(app.id);
    const rating = Number(app.average_rating || 0);
    const reviewCount = Number(app.review_count || 0);
    const overlay = document.createElement("div");
    overlay.className = "lucid-account-overlay lucid-store-detail-overlay";
    overlay.innerHTML = `<div class="lucid-store-detail" role="dialog" aria-modal="true"><button class="lucid-dialog-close" type="button">×</button><div class="store-detail-hero"><div class="store-detail-icon">${escapeHTML(app.icon || "◇")}</div><div><div class="account-plan-label">${escapeHTML(app.category || "Other")}</div><h2>${escapeHTML(app.name)}</h2><p>${escapeHTML(app.description || "A Lucid OS application.")}</p><div class="store-detail-rating">${rating ? `★ ${rating.toFixed(1)}` : "No rating"}${reviewCount ? ` · ${reviewCount} review${reviewCount === 1 ? "" : "s"}` : ""}</div></div></div><div class="store-detail-preview">${app.store_images?.length ? app.store_images.map(image => `<img src="${escapeHTML(image)}" alt="${escapeHTML(app.name)} screenshot">`).join("") : app.icon_url ? `<img src="${escapeHTML(app.icon_url)}" alt="${escapeHTML(app.name)} preview">` : '<div class="store-detail-no-preview">No preview images were provided for this app.</div>'}</div><div class="store-detail-actions"><button type="button" class="store-detail-install">${app.type === "core" ? "Included" : installed ? "Uninstall" : "Install"}</button><button type="button" class="store-detail-update" ${!installed || app.type === "core" ? "disabled" : ""}>Update</button><button type="button" class="store-detail-review">Rate</button></div><section class="store-detail-reviews"><div class="store-detail-section-title"><h3>Ratings & reviews</h3><span>${reviewCount}</span></div>${reviews.length ? reviews.map(review => `<article class="store-review"><div class="store-review-head"><strong>${"★".repeat(review.rating)}${"☆".repeat(5-review.rating)}</strong><span>${new Date(review.created_at).toLocaleDateString()}</span></div>${review.review_text ? `<div class="store-review-text">${escapeHTML(review.review_text)}</div>` : ""}</article>`).join("") : '<div class="store-empty">No ratings yet.</div>'}</section></div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector(".lucid-dialog-close").addEventListener("click", close);
    overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
    overlay.querySelector(".store-detail-install").addEventListener("click", async () => {
        const button = overlay.querySelector(".store-detail-install");
        if (app.type === "core") return;
        if (isAppInstalled(app.id)) { uninstallApp(app.id); button.textContent = "Install"; overlay.querySelector(".store-detail-update").disabled = true; }
        else { const installedNow = app.id === "paint" ? installApp(app.id) : installExternalApp(app); if (installedNow) { button.textContent = "Uninstall"; overlay.querySelector(".store-detail-update").disabled = false; } }
    });
    overlay.querySelector(".store-detail-update").addEventListener("click", () => alert("No newer version is available yet."));
    overlay.querySelector(".store-detail-review").addEventListener("click", () => showRatingDialog(app, user, overlay));
}
async function showRatingDialog(app, user, parent) {
    const existing = parent.querySelector(".store-rating-dialog");
    if (existing) existing.remove();
    const dialog = document.createElement("div");
    dialog.className = "store-rating-dialog";
    const plus = ["pro", "premium", "subscriber"].includes(String(user?.app_metadata?.plan || user?.app_metadata?.subscription || "free").toLowerCase());
    dialog.innerHTML = `<div class="store-rating-dialog-inner"><h3>Rate ${escapeHTML(app.name)}</h3><select class="store-review-rating"><option value="5">★★★★★</option><option value="4">★★★★☆</option><option value="3">★★★☆☆</option><option value="2">★★☆☆☆</option><option value="1">★☆☆☆☆</option></select>${plus ? '<textarea class="store-review-input" maxlength="1000" placeholder="Write a comment..."></textarea>' : '<p class="store-comment-note">Written comments are available to Plus members. You can still leave a rating.</p>'}<div class="store-rating-dialog-actions"><button type="button" class="store-rating-cancel">Cancel</button><button type="button" class="store-rating-save">Save rating</button></div></div>`;
    parent.querySelector(".lucid-store-detail").appendChild(dialog);
    dialog.querySelector(".store-rating-cancel").addEventListener("click", () => dialog.remove());
    dialog.querySelector(".store-rating-save").addEventListener("click", async () => {
        const button = dialog.querySelector(".store-rating-save");
        button.disabled = true;
        try { await saveAppReview(app.id, dialog.querySelector(".store-review-rating").value, plus ? dialog.querySelector(".store-review-input").value : ""); dialog.remove(); openAppDetails(app); } catch (error) { alert(error.message || "Could not save rating."); button.disabled = false; }
    });
}
function escapeHTML(text) { return String(text ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
export { createStoreApp };