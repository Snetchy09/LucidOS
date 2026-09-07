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
        card.innerHTML = `<div class="store-app-icon">${escapeHTML(app.icon)}</div><div class="store-app-content"><div class="store-app-top"><h2>${escapeHTML(app.name)}</h2><span class="store-app-version">v${escapeHTML(app.version)}</span></div><div class="store-app-category">${escapeHTML(app.category)}</div><p>${escapeHTML(app.description || "A Lucid OS application.")}</p><div class="store-app-meta"><span class="store-rating">${rating ? `★ ${rating.toFixed(1)}` : "—"}${reviews ? ` (${reviews})` : ""}</span><span>${downloads} ${downloads === 1 ? "install" : "installs"}</span></div><div class="store-app-footer"><span class="store-app-status">${app.type === "core" ? "System app" : app.installed ? "Installed" : "Available"}</span><span class="store-app-actions"><button class="store-reviews" type="button">Reviews</button><button class="store-install" data-app="${escapeHTML(app.id)}" ${app.type === "core" ? "disabled" : ""}>${app.type === "core" ? "Included" : app.installed ? "Remove" : "Install"}</button></span></div></div>`;
        const actionButton = card.querySelector(".store-install");
        if (actionButton && app.type !== "core") actionButton.addEventListener("click", async () => { if (app.id === "paint") { if (isAppInstalled(app.id)) uninstallApp(app.id); else installApp(app.id); } else if (isAppInstalled(app.id)) uninstallApp(app.id); else if (installExternalApp(app)) await recordAppDownload(app.id, app.version); });
        card.querySelector(".store-reviews").addEventListener("click", () => showReviews(app));
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
async function showReviews(app) {
    const reviews = await getAppReviews(app.id).catch(() => []);
    const user = await getCurrentUser();
    const plan = String(user?.app_metadata?.plan || user?.app_metadata?.subscription || "free").toLowerCase();
    const plus = ["pro", "premium", "subscriber"].includes(plan);
    const overlay = document.createElement("div");
    overlay.className = "lucid-account-overlay lucid-store-review-overlay";
    overlay.innerHTML = `<div class="lucid-plans-dialog"><button class="lucid-dialog-close" type="button">×</button><div class="account-plan-label">${escapeHTML(app.name)}</div><h2>Reviews</h2><div class="store-review-list">${reviews.length ? reviews.map(review => `<article class="store-review"><div class="store-review-head"><strong>${"★".repeat(review.rating)}${"☆".repeat(5-review.rating)}</strong><span>${new Date(review.created_at).toLocaleDateString()}</span></div>${review.review_text || review.review ? `<div class="store-review-text">${escapeHTML(review.review_text || review.review)}</div>` : ""}</article>`).join("") : '<div class="store-empty">No reviews yet.</div>'}</div>${user ? `<div class="store-review-form"><select class="store-review-rating"><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select>${plus ? '<textarea class="store-review-input" maxlength="1000" placeholder="Write a comment..."></textarea>' : '<div class="store-review-plus-note">Plus members can add a written comment. Anyone signed in can leave a rating.</div>'}<button class="account-plan-button">Save rating</button></div>` : '<p class="store-empty">Sign in to rate this app.</p>'}</div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector(".lucid-dialog-close").addEventListener("click", close);
    overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
    overlay.querySelector(".store-review-form button")?.addEventListener("click", async () => {
        const button = overlay.querySelector(".store-review-form button");
        button.disabled = true;
        try {
            const rating = overlay.querySelector(".store-review-rating").value;
            const comment = plus ? overlay.querySelector(".store-review-input").value : "";
            await saveAppReview(app.id, rating, comment);
            close();
        } catch (error) {
            alert(error.message || "Could not save rating.");
            button.disabled = false;
        }
    });
}
function escapeHTML(text) { return String(text ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
export { createStoreApp };