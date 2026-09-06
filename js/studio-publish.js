import { supabase } from "./lucid-store-api.js";
import { getFiles } from "./filesystem.js";
import { getActiveProject, updateProject } from "../apps/lucid-projects.js";
import { runLucidScript, buildManifest } from "../apps/lucid-script-runtime.js";
import { publishLucidPackage, gzipBlob } from "./lucid-publish.js";

const PUBLISH_BUTTON_CLASS = "lucid-studio-publish-button";
const ASSETS_BUTTON_CLASS = "lucid-studio-assets-button";

function slugify(text) {
    return String(text)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 50) || "lucid-app";
}

function escapeHTML(text) {
    return String(text ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function collectAssets(folderName, files, path = [folderName]) {
    const assets = [];
    for (const file of files) {
        if (file.type === "folder") {
            assets.push(...collectAssets(file.name, file.children || [], [...path, file.name]));
            continue;
        }
        assets.push({
            name: file.name,
            mimeType: file.mimeType || "application/octet-stream",
            path: [...path, file.name]
        });
    }
    return assets;
}

function getProjectAssets() {
    const categories = ["Pictures", "Music", "Videos"];
    return categories.flatMap(folder => collectAssets(folder, getFiles([folder])));
}

function assetKey(path) {
    return Array.isArray(path) ? path.join("/") : String(path || "");
}

function findAsset(path) {
    const names = Array.isArray(path) ? [...path] : String(path || "").split("/").filter(Boolean);
    if (names[0] === "Home") names.shift();
    let folder = null;
    for (let i = 0; i < names.length - 1; i++) {
        folder = getFiles(folder ? [...folder, names[i]] : [names[i]]).find(item => item.type === "folder");
        if (!folder) return null;
    }
    const parentPath = names.slice(0, -1);
    return getFiles(parentPath).find(item => item.type === "file" && item.name === names.at(-1)) || null;
}

async function blobToBase64(content) {
    if (content instanceof Blob) {
        const buffer = await content.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }
        return btoa(binary);
    }

    const bytes = new TextEncoder().encode(String(content ?? ""));
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

async function buildPublishPackage(code, project) {
    const mount = document.createElement("div");
    mount.hidden = true;
    document.body.appendChild(mount);

    try {
        const result = runLucidScript(code, mount, { permissions: [] });
        const manifest = buildManifest({
            id: slugify(result.appName),
            name: result.appName,
            version: "1.0.0",
            description: "A Lucid Script application.",
            permissions: []
        });

        const assets = [];
        for (const selected of Array.isArray(project?.assets) ? project.assets : []) {
            const path = Array.isArray(selected) ? selected : selected.path;
            const file = findAsset(path);
            if (!file) continue;
            assets.push({
                path: assetKey(path),
                name: file.name,
                mimeType: file.mimeType || "application/octet-stream",
                data: await blobToBase64(file.content)
            });
        }

        const packageData = {
            manifest,
            source: { "main.lucid": code },
            assets
        };

        const json = new Blob([JSON.stringify(packageData)], { type: "application/json" });
        const compressed = await gzipBlob(json);
        return { manifest, blob: compressed };
    } finally {
        mount.remove();
    }
}

function renderAssetDialog(root) {
    const project = getActiveProject();
    if (!project) return;

    root.querySelector(".lucid-studio-assets-dialog")?.remove();

    const available = getProjectAssets();
    const selected = new Set((Array.isArray(project.assets) ? project.assets : []).map(asset => assetKey(Array.isArray(asset) ? asset : asset.path)));
    const overlay = document.createElement("div");
    overlay.className = "lucid-studio-assets-dialog studio-dialog-overlay";
    overlay.innerHTML = `
        <div class="studio-dialog" role="dialog" aria-modal="true">
            <div class="studio-dialog-header">
                <div>
                    <h2>Project Assets</h2>
                    <p>Choose artwork and music from Lucid Files.</p>
                </div>
                <button class="studio-dialog-close" aria-label="Close">×</button>
            </div>
            <div class="studio-assets-list"></div>
            <div class="studio-dialog-actions">
                <button class="studio-secondary-btn" id="studio-assets-close">Done</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const list = overlay.querySelector(".studio-assets-list");
    if (!available.length) {
        list.innerHTML = '<div class="studio-assets-empty">No assets found. Save something in Lucid Paint or import music in Lucid Media first.</div>';
    } else {
        available.forEach(asset => {
            const key = assetKey(asset.path);
            const row = document.createElement("label");
            row.className = "studio-asset-row";
            row.innerHTML = `
                <input type="checkbox" ${selected.has(key) ? "checked" : ""}>
                <span class="studio-asset-icon">${asset.mimeType.startsWith("image/") ? "🖼️" : asset.mimeType.startsWith("audio/") ? "🎵" : "📄"}</span>
                <span class="studio-asset-info"><strong>${escapeHTML(asset.name)}</strong><small>Home / ${escapeHTML(asset.path.slice(0, -1).join(" / "))}</small></span>
            `;
            row.querySelector("input").addEventListener("change", event => {
                if (event.target.checked) selected.add(key);
                else selected.delete(key);
            });
            list.appendChild(row);
        });
    }

    const close = () => overlay.remove();
    overlay.querySelector(".studio-dialog-close").addEventListener("click", close);
    overlay.querySelector("#studio-assets-close").addEventListener("click", () => {
        const assets = available.filter(asset => selected.has(assetKey(asset.path)));
        updateProject(project.id, { assets });
        close();
    });
    overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
}

async function publishCurrentProject(root) {
    const codeEditor = root.querySelector("#lucid-code");
    const status = root.querySelector("#studio-editor-status");
    const button = root.querySelector(`.${PUBLISH_BUTTON_CLASS}`);
    if (!codeEditor || !status || !button) return;

    button.disabled = true;
    const originalLabel = button.textContent;
    button.textContent = "Publishing...";

    try {
        if (!supabase) throw new Error("Supabase authentication is not configured.");
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Sign in to your developer account before publishing.");

        const project = getActiveProject();
        const { manifest, blob } = await buildPublishPackage(codeEditor.value, project);
        const result = await publishLucidPackage({
            accessToken: session.access_token,
            appId: manifest.id,
            name: manifest.name,
            version: manifest.version,
            blob
        });

        const user = session.user;
        const { error } = await supabase.from("lucid_app_submissions").insert({
            developer_id: user.id,
            name: manifest.name,
            description: manifest.description,
            category: "Other",
            version: manifest.version,
            status: "pending",
            storage_provider: "b2",
            package_key: result.key,
            package_size: result.size
        });

        if (error) throw error;
        status.textContent = `Published to B2 · ${(result.size / 1024 / 1024).toFixed(2)} MB`;
        showPublishNotice(root, `“${manifest.name}” was uploaded and submitted for review.`);
    } catch (error) {
        console.error("Lucid publish failed:", error);
        status.textContent = "Publish failed";
        const limit = error.maxBytes ? ` Limit: ${(error.maxBytes / 1024 / 1024).toFixed(0)} MB.` : "";
        showPublishNotice(root, `${error.message || "Unable to publish this app."}${limit}`, true);
    } finally {
        button.disabled = false;
        button.textContent = originalLabel;
    }
}

function showPublishNotice(root, message, isError = false) {
    let notice = root.querySelector(".lucid-publish-notice");
    if (!notice) {
        notice = document.createElement("div");
        notice.className = "lucid-publish-notice";
        root.querySelector("#studio-body")?.prepend(notice);
    }
    notice.textContent = message;
    notice.dataset.error = isError ? "true" : "false";
    clearTimeout(notice._timer);
    notice._timer = setTimeout(() => notice.remove(), 7000);
}

function attachAssetsButton(toolbar) {
    if (toolbar.querySelector(`.${ASSETS_BUTTON_CLASS}`)) return;
    const button = document.createElement("button");
    button.className = `studio-secondary-btn ${ASSETS_BUTTON_CLASS}`;
    button.textContent = "Assets";
    button.title = "Choose assets from Lucid Files";
    toolbar.appendChild(button);
    button.addEventListener("click", () => {
        const root = toolbar.closest(".lucid-studio");
        if (root) renderAssetDialog(root);
    });
}

function attachPublishButton(toolbar) {
    if (toolbar.querySelector(`.${PUBLISH_BUTTON_CLASS}`)) return;
    const button = document.createElement("button");
    button.className = `studio-primary-btn ${PUBLISH_BUTTON_CLASS}`;
    button.textContent = "Publish";
    button.title = "Upload this app package to Lucid storage";
    toolbar.appendChild(button);
    button.addEventListener("click", () => {
        const root = toolbar.closest(".lucid-studio");
        if (root) publishCurrentProject(root);
    });
}

const observer = new MutationObserver(() => {
    document.querySelectorAll(".studio-editor-actions").forEach(toolbar => {
        attachAssetsButton(toolbar);
        attachPublishButton(toolbar);
    });
});

observer.observe(document.body, { childList: true, subtree: true });
