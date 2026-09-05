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
        </div>
        <div class="file-list"></div>
    `;

    const windowElement = createWindow("📁 Files", content);

    const fileList = windowElement.querySelector(".file-list");
    const filePath = windowElement.querySelector(".file-path");

    let currentFolder = lucidFileSystem;
    let folderHistory = [];
    let selectedItem = null;

    function displayFolder() {
        fileList.innerHTML = "";
        filePath.textContent = getPath(currentFolder);

        currentFolder.children.forEach(item => {
            const element = document.createElement("div");
            element.className = "file-item";

            if (item.type === "folder") {
                element.textContent = "📁 " + item.name;
            } else {
                element.textContent = "📄 " + item.name;
            }

            element.addEventListener("click", () => {
                fileList.querySelectorAll(".file-item").forEach(other => other.classList.remove("selected"));
                element.classList.add("selected");
                selectedItem = item;
            });

            element.addEventListener("dblclick", () => {
                if (item.type === "folder") {
                    folderHistory.push(currentFolder);
                    currentFolder = item;
                    selectedItem = null;
                    displayFolder();
                } else if (item.name.endsWith(".txt")) {
                    createTextEditor(item);
                }
            });

            fileList.appendChild(element);
        });
    }

    function getPath(folder) {
        if (folder === lucidFileSystem) return "Home";
        return "Home / " + folder.name;
    }

    windowElement.querySelector(".back-button").addEventListener("click", () => {
        if (folderHistory.length > 0) {
            currentFolder = folderHistory.pop();
            selectedItem = null;
            displayFolder();
        }
    });

    windowElement.querySelector(".home-button").addEventListener("click", () => {
        currentFolder = lucidFileSystem;
        folderHistory = [];
        selectedItem = null;
        displayFolder();
    });

    windowElement.querySelector(".new-folder-button").addEventListener("click", async () => {
        const name = prompt("Folder name:");
        if (!name) return;
        currentFolder.children.push({ type: "folder", name, children: [] });
        await saveFileSystem();
        displayFolder();
    });

    windowElement.querySelector(".new-file-button").addEventListener("click", async () => {
        const name = prompt("File name:");
        if (!name) return;
        currentFolder.children.push({ type: "file", name, content: "" });
        await saveFileSystem();
        displayFolder();
    });

    displayFolder();
    return windowElement;
}

export { createFilesApp };