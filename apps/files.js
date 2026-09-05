import { createWindow } from "../js/window-manager.js";
import { lucidFileSystem, saveFileSystem } from "../js/filesystem.js";
import { createTextEditor } from "./text-editor.js";

function createFilesApp() {
    const content = `
        <div class="file-toolbar">
            <button class="file-tool back-button">←</button>
            <button class="file-tool home-button">🏠</button>
            <div class="file-path">Home</div>
            <button class="file-tool new-folder-button">📁+</button>
            <button class="file-tool new-file-button">📄+</button>
            <button class="file-tool delete-button">🗑</button>
        </div>
        <div class="file-list"></div>
        <div class="file-status"></div>
    `;

    const windowElement = createWindow("📁 Files", content);
    const fileList = windowElement.querySelector(".file-list");
    const filePath = windowElement.querySelector(".file-path");
    const status = windowElement.querySelector(".file-status");

    let currentFolder = lucidFileSystem;
    let folderHistory = [];
    let selectedItem = null;

    function getPath(folder) {
        if (folder === lucidFileSystem) return "Home";
        const path = [];
        function find(node, target, trail) {
            if (node === target) return trail;
            for (const child of node.children || []) {
                if (child.type !== "folder") continue;
                const found = find(child, target, [...trail, child.name]);
                if (found) return found;
            }
            return null;
        }
        const found = find(lucidFileSystem, folder, []);
        path.push(...(found || []));
        return ["Home", ...path].join(" / ");
    }

    function fileSize(item) {
        const size = Number(item.size) || Number(item.content?.size) || 0;
        if (!size) return item.type === "folder" ? "Folder" : "Empty";
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / 1024 / 1024).toFixed(1)} MB`;
    }

    function displayFolder() {
        fileList.innerHTML = "";
        filePath.textContent = getPath(currentFolder);
        selectedItem = null;

        if (!currentFolder.children.length) {
            fileList.innerHTML = '<div class="file-empty">This folder is empty.</div>';
            return;
        }

        currentFolder.children.forEach(item => {
            const element = document.createElement("div");
            element.className = "file-item";
            element.innerHTML = `
                <span class="file-item-name">${item.type === "folder" ? "📁" : iconFor(item)} ${escapeHTML(item.name)}</span>
                <span class="file-item-size">${fileSize(item)}</span>
            `;

            element.addEventListener("click", () => {
                fileList.querySelectorAll(".file-item").forEach(other => other.classList.remove("selected"));
                element.classList.add("selected");
                selectedItem = item;
            });

            element.addEventListener("dblclick", () => openItem(item));
            fileList.appendChild(element);
        });
    }

    function openItem(item) {
        if (item.type === "folder") {
            folderHistory.push(currentFolder);
            currentFolder = item;
            displayFolder();
            return;
        }

        const mime = item.mimeType || "";
        if (item.name.endsWith(".txt") || mime.startsWith("text/")) {
            createTextEditor(item);
            return;
        }

        if (mime.startsWith("image/")) {
            const blob = item.content instanceof Blob ? item.content : new Blob([item.content], { type: mime });
            const url = URL.createObjectURL(blob);
            const preview = createWindow(`🖼 ${item.name}`, `<div class="file-preview"><img src="${url}" alt="${escapeHTML(item.name)}"></div>`);
            preview.addEventListener("DOMNodeRemoved", () => URL.revokeObjectURL(url));
            return;
        }

        status.textContent = `${item.name} is stored in Lucid Files.`;
    }

    windowElement.querySelector(".back-button").addEventListener("click", () => {
        if (!folderHistory.length) return;
        currentFolder = folderHistory.pop();
        displayFolder();
    });

    windowElement.querySelector(".home-button").addEventListener("click", () => {
        currentFolder = lucidFileSystem;
        folderHistory = [];
        displayFolder();
    });

    windowElement.querySelector(".new-folder-button").addEventListener("click", async () => {
        const name = prompt("Folder name:");
        if (!name?.trim()) return;
        currentFolder.children.push({ type: "folder", name: name.trim(), children: [] });
        await saveFileSystem();
        displayFolder();
    });

    windowElement.querySelector(".new-file-button").addEventListener("click", async () => {
        const name = prompt("File name:");
        if (!name?.trim()) return;
        currentFolder.children.push({ type: "file", name: name.trim(), content: "", mimeType: "text/plain", size: 0 });
        await saveFileSystem();
        displayFolder();
    });

    windowElement.querySelector(".delete-button").addEventListener("click", async () => {
        if (!selectedItem) return;
        if (!confirm(`Delete ${selectedItem.name}?`)) return;
        const index = currentFolder.children.indexOf(selectedItem);
        if (index === -1) return;
        currentFolder.children.splice(index, 1);
        await saveFileSystem();
        status.textContent = "Deleted ✓";
        displayFolder();
    });

    const refresh = () => displayFolder();
    window.addEventListener("lucid-file-saved", refresh);
    window.addEventListener("lucid-file-deleted", refresh);

    displayFolder();
    return windowElement;
}

function iconFor(file) {
    const mime = file.mimeType || "";
    if (mime.startsWith("audio/")) return "🎵";
    if (mime.startsWith("image/")) return "🖼️";
    if (mime.startsWith("video/")) return "🎬";
    if (file.name.endsWith(".lucidapp")) return "◇";
    if (file.name.endsWith(".lucidbeat")) return "🎛️";
    if (file.name.endsWith(".lpaint")) return "🎨";
    return "📄";
}

function escapeHTML(text) {
    return String(text ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

export { createFilesApp };