import { createWindow } from "../js/window-manager.js";
import { saveFileSystem, saveUserFile } from "../js/filesystem.js";

function createTextEditor(file = null) {
    let currentFile = file;
    const startingText = file ? String(file.content ?? "") : "";
    const fileName = file ? file.name : "Untitled";

    const content = `
        <div class="text-editor">
            <div class="editor-toolbar">
                <button class="editor-save">💾 Save</button>
                <span class="editor-status">Ready</span>
            </div>
            <textarea class="editor" spellcheck="false" placeholder="Start typing..."></textarea>
        </div>
    `;

    const windowElement = createWindow("📝 " + fileName, content);
    const editor = windowElement.querySelector(".editor");
    const saveButton = windowElement.querySelector(".editor-save");
    const status = windowElement.querySelector(".editor-status");

    editor.value = startingText;

    saveButton.addEventListener("click", async () => {
        if (!currentFile) {
            const name = prompt("Save document as:", "Untitled.txt");
            if (!name?.trim()) return;

            const cleanName = name.trim().endsWith(".txt") ? name.trim() : `${name.trim()}.txt`;
            await saveUserFile(["Documents"], cleanName, editor.value, "text/plain");
            currentFile = { type: "file", name: cleanName, content: editor.value, mimeType: "text/plain", size: editor.value.length };
            windowElement.querySelector(".window-title").textContent = "📝 " + cleanName;
        } else {
            currentFile.content = editor.value;
            currentFile.mimeType = "text/plain";
            currentFile.size = editor.value.length;
            currentFile.modifiedAt = new Date().toISOString();
            await saveFileSystem();
        }

        status.textContent = "Saved ✓";
        savedText = editor.value;
        setTimeout(() => { status.textContent = "Ready"; }, 1200);
    });

    let savedText = editor.value;

    editor.addEventListener("input", () => {
        status.textContent = editor.value !== savedText ? "Unsaved changes" : "Ready";
    });

    editor.addEventListener("keydown", event => {
        if (event.ctrlKey && event.key.toLowerCase() === "s") {
            event.preventDefault();
            saveButton.click();
        }
    });

    editor.focus();
    return windowElement;
}

export { createTextEditor };