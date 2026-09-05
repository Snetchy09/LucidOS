import { supabase } from "./lucid-store-api.js";
import { runLucidScript, buildManifest } from "../apps/lucid-script-runtime.js";
import { publishLucidPackage, gzipBlob } from "./lucid-publish.js";

const PUBLISH_BUTTON_CLASS = "lucid-studio-publish-button";

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

async function buildPublishPackage(code) {
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

        const packageData = {
            manifest,
            source: {
                "main.lucid": code
            }
        };

        const json = new Blob([
            JSON.stringify(packageData)
        ], { type: "application/json" });

        const compressed = await gzipBlob(json);
        return { manifest, blob: compressed };
    } finally {
        mount.remove();
    }
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
        if (!supabase) {
            throw new Error("Supabase authentication is not configured.");
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            throw new Error("Sign in to your developer account before publishing.");
        }

        const { manifest, blob } = await buildPublishPackage(codeEditor.value);
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

        const limit = error.maxBytes
            ? ` Limit: ${(error.maxBytes / 1024 / 1024).toFixed(0)} MB.`
            : "";
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
    document.querySelectorAll(".studio-editor-actions").forEach(attachPublishButton);
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
