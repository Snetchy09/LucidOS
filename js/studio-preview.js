import { getFiles } from "./filesystem.js";
import { getActiveProject, updateProject } from "../apps/lucid-projects.js";
import { runLucidScript } from "../apps/lucid-script-runtime.js";

// scene preview
function findAsset(path) {
    const names = (Array.isArray(path) ? path : String(path || "").split("/").filter(Boolean)).slice();
    if (names[0] === "Home") names.shift();
    if (!names.length) return null;
    let folderPath = [];
    for (let i = 0; i < names.length - 1; i++) {
        const folder = getFiles(folderPath).find(item => item.type === "folder" && item.name === names[i]);
        if (!folder) return null;
        folderPath = [...folderPath, folder.name];
    }
    return getFiles(folderPath).find(item => item.type === "file" && item.name === names.at(-1)) || null;
}

async function visualFor(item) {
    const file = findAsset(item.path);
    if (!file) return null;
    const type = file.mimeType || "";
    if (type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name)) {
        const blob = file.content instanceof Blob ? file.content : new Blob([file.content], { type: type || "image/png" });
        return { kind: "image", url: URL.createObjectURL(blob) };
    }
    if (/\.lpaint$/i.test(file.name)) {
        try {
            const raw = typeof file.content === "string" ? file.content : await new Response(file.content).text();
            const data = JSON.parse(raw);
            if (Array.isArray(data.frames) && data.frames.length) return { kind: "animation", frames: data.frames, fps: Number(data.fps) || 8 };
        } catch {}
    }
    return null;
}

async function renderScene(root) {
    const preview = root.querySelector("#lucid-preview");
    const project = getActiveProject();
    if (!preview || !project) return;
    preview.querySelectorAll(".lucid-scene-live-layer").forEach(el => el.remove());
    const scene = Array.isArray(project.scene) ? project.scene : [];
    if (!scene.length) return;
    preview.style.position = "relative";
    const layer = document.createElement("div");
    layer.className = "lucid-scene-live-layer";
    for (const item of scene) {
        const el = document.createElement("div");
        el.className = "lucid-scene-live-object";
        el.style.left = `${Math.max(0, Math.min(100, Number(item.x) || 50))}%`;
        el.style.top = `${Math.max(0, Math.min(100, Number(item.y) || 50))}%`;
        if (item.kind === "button") {
            el.classList.add("is-button");
            const button = document.createElement("button");
            button.textContent = item.label || "Button";
            el.appendChild(button);
        } else if (item.kind === "asset") {
            const visual = await visualFor(item);
            if (visual?.kind === "image") {
                const img = document.createElement("img");
                img.src = visual.url;
                img.alt = item.name || "Asset";
                el.appendChild(img);
            } else if (visual?.kind === "animation") {
                const img = document.createElement("img");
                img.src = visual.frames[0];
                img.alt = item.name || "Animation";
                el.appendChild(img);
                let frame = 0;
                const timer = setInterval(() => {
                    if (!document.body.contains(img)) { clearInterval(timer); return; }
                    frame = (frame + 1) % visual.frames.length;
                    img.src = visual.frames[frame];
                }, 1000 / visual.fps);
            }
        }
        if (el.childNodes.length) layer.appendChild(el);
    }
    preview.appendChild(layer);
}

function bindSceneRun(root) {
    const run = root.querySelector("#studio-run");
    if (!run || run.dataset.assetFixBound) return;
    run.dataset.assetFixBound = "1";
    run.addEventListener("click", () => setTimeout(() => renderScene(root), 80));
}

window.addEventListener("lucid-window-created", event => {
    const root = event.detail?.element?.querySelector?.(".lucid-studio");
    if (!root) return;
    const observer = new MutationObserver(() => bindSceneRun(root));
    observer.observe(root, { childList: true, subtree: true });
    bindSceneRun(root);
});


// live preview
const state = { runtime: null, urls: [] };

function collect(files, path = []) {
    const out = [];
    for (const file of files) {
        if (file.type === "folder") out.push(...collect(file.children || [], [...path, file.name]));
        else out.push({ ...file, path: [...path, file.name] });
    }
    return out;
}

function projectFiles() {
    return ["Pictures", "Music", "Videos"].flatMap(folder => collect(getFiles([folder]), [folder]));
}

function toUrl(file) {
    if (!file) return "";
    const blob = file.content instanceof Blob ? file.content : new Blob([file.content], { type: file.mimeType || "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    state.urls.push(url);
    return url;
}

function escape(text) {
    return String(text ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function pathOf(asset) {
    return Array.isArray(asset?.path) ? asset.path.join("/") : String(asset?.path || "");
}

function resolveSource(source, files) {
    let code = String(source || "");
    for (const file of files) {
        if (!file.content) continue;
        const url = toUrl(file);
        const path = pathOf(file);
        for (const value of [path, `Home/${path}`, `/${path}`]) code = code.split(value).join(url);
    }
    return code;
}

function stop() {
    if (state.runtime?.stop) {
        try { state.runtime.stop(); } catch {}
    }
    state.runtime = null;
    state.urls.splice(0).forEach(url => URL.revokeObjectURL(url));
}

function insertSnippet(root, text) {
    const editor = root.querySelector("#lucid-code");
    if (!editor) return;
    const start = editor.selectionStart, end = editor.selectionEnd;
    const value = editor.value;
    editor.value = value.slice(0, start) + text + value.slice(end);
    editor.selectionStart = editor.selectionEnd = start + text.length;
    editor.dispatchEvent(new Event("input"));
    editor.focus();
}

function openLivePreview(root) {
    const project = getActiveProject();
    if (!project) return;
    stop();
    const overlay = document.createElement("div");
    overlay.className = "lucid-live-preview-overlay";
    overlay.innerHTML = `<div class="lucid-live-preview" role="dialog" aria-modal="true"><header><div><span>LIVE PREVIEW</span><h2>${escape(project.name)}</h2><p>Run the actual Lucid Script app while working with its project assets.</p></div><button data-close aria-label="Close preview">×</button></header><div class="lucid-live-preview-body"><aside><div class="live-preview-section-title">Project assets</div><div class="live-preview-assets"></div><div class="live-preview-hint">Use an asset path inside <code>image</code> or <code>sprite src</code>. Preview rewrites the path to the local asset automatically.</div></aside><main><div class="live-preview-toolbar"><span data-status>Starting preview…</span><button data-reload>Reload</button></div><div class="live-preview-host"></div></main></div></div>`;
    document.body.appendChild(overlay);

    const host = overlay.querySelector(".live-preview-host"),
        assets = overlay.querySelector(".live-preview-assets"),
        status = overlay.querySelector("[data-status]"),
        files = projectFiles();

    const close = () => { stop(); overlay.remove(); };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", event => { if (event.target === overlay) close(); });

    const render = () => {
        stop();
        host.innerHTML = "";
        status.textContent = "Running…";
        try {
            const source = resolveSource(project.source, files);
            state.runtime = runLucidScript(source, host, { permissions: [] });
            status.textContent = `Running ${state.runtime.appName || project.name}`;
        } catch (error) {
            status.textContent = "Preview failed";
            host.innerHTML = `<div class="live-preview-error"><strong>Runtime error</strong><span>${escape(error.message || error)}</span></div>`;
        }
    };
    overlay.querySelector("[data-reload]").addEventListener("click", render);

    if (!files.length) {
        assets.innerHTML = '<div class="live-preview-empty">No assets in Pictures, Music or Videos.</div>';
    } else {
        files.forEach(file => {
            const row = document.createElement("div");
            row.className = "live-preview-asset";
            const path = pathOf(file);
            const isImage = (file.mimeType || "").startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
            const isAudio = (file.mimeType || "").startsWith("audio/") || /\.(mp3|wav|ogg|m4a)$/i.test(file.name);
            row.innerHTML = `<div><strong>${escape(file.name)}</strong><small>${escape(path)}</small></div><div class="live-preview-asset-actions">${isImage ? '<button data-image>Insert image</button>' : ''}${isImage ? '<button data-sprite>Insert sprite</button>' : ''}${isAudio ? '<button data-audio>Play</button>' : ''}</div>`;
            if (isImage) {
                row.querySelector("[data-image]")?.addEventListener("click", () => insertSnippet(root, `image "${path}"\n`));
                row.querySelector("[data-sprite]")?.addEventListener("click", () => insertSnippet(root, `sprite "${file.name.replace(/\.[^.]+$/, '')}" {\n    x 100\n    y 100\n    width 64\n    height 64\n    src "${path}"\n}\n`));
            }
            if (isAudio) row.querySelector("[data-audio]")?.addEventListener("click", () => {
                const audio = new Audio(toUrl(file));
                audio.addEventListener("ended", () => URL.revokeObjectURL(audio.src), { once: true });
                audio.play().catch(() => { status.textContent = "Browser blocked audio until interaction."; });
            });
            assets.appendChild(row);
        });
    }
    render();
}

window.addEventListener("lucid-window-created", event => {
    const root = event.detail?.element?.querySelector?.(".lucid-studio");
    if (!root) return;
    root.addEventListener("click", event => {
        const button = event.target.closest(".lucid-studio-preview-button");
        if (!button) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        openLivePreview(root);
    });
});
