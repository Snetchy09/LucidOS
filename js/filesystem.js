const DATABASE_NAME = "LucidOS";
const DATABASE_VERSION = 2;
const STORE_NAME = "system";

const defaultFileSystem = {
    type: "folder",
    name: "Home",
    children: [
        { type: "folder", name: "Documents", children: [{ type: "file", name: "Welcome.txt", content: "Welcome to LucidOS." }] },
        { type: "folder", name: "Downloads", children: [] },
        { type: "folder", name: "Pictures", children: [] },
        { type: "folder", name: "Music", children: [] },
        { type: "folder", name: "Videos", children: [] },
        { type: "folder", name: "Desktop", children: [] }
    ]
};

let lucidFileSystem = null;

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

        request.onupgradeneeded = event => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function loadFileSystem() {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get("filesystem");

        request.onsuccess = () => {
            lucidFileSystem = request.result || structuredClone(defaultFileSystem);
            resolve(lucidFileSystem);
        };

        request.onerror = () => reject(request.error);
    });
}

async function saveFileSystem() {
    if (!lucidFileSystem) return;

    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(lucidFileSystem, "filesystem");

        request.onsuccess = () => {
            database.close();
            resolve();
        };
        request.onerror = () => {
            database.close();
            reject(request.error);
        };
    });
}

function findChild(folder, name) {
    return folder?.children?.find(item => item.name === name) || null;
}

function findFolder(path = []) {
    let folder = lucidFileSystem;
    const names = Array.isArray(path) ? path.filter(Boolean) : [];

    if (names[0] === "Home") names.shift();

    for (const name of names) {
        folder = findChild(folder, name);
        if (!folder || folder.type !== "folder") return null;
    }

    return folder;
}

function ensureFolder(path = []) {
    if (!lucidFileSystem) return null;

    let folder = lucidFileSystem;
    const names = Array.isArray(path) ? path.filter(Boolean) : [];
    if (names[0] === "Home") names.shift();

    for (const name of names) {
        let next = findChild(folder, name);
        if (!next) {
            next = { type: "folder", name, children: [] };
            folder.children.push(next);
        }
        if (next.type !== "folder") return null;
        folder = next;
    }

    return folder;
}

async function saveUserFile(path, name, content, mimeType = "application/octet-stream") {
    const folder = ensureFolder(path);
    if (!folder || !name) throw new Error("Invalid Lucid file path.");

    const existing = findChild(folder, name);
    const file = {
        type: "file",
        name,
        mimeType,
        size: Number(content?.size) || (typeof content === "string" ? content.length : 0),
        content,
        modifiedAt: new Date().toISOString()
    };

    if (existing) Object.assign(existing, file);
    else folder.children.push(file);

    await saveFileSystem();
    window.dispatchEvent(new CustomEvent("lucid-file-saved", {
        detail: { path: [...path, name], file }
    }));
    return file;
}

function getFiles(path = []) {
    const folder = findFolder(path);
    if (!folder) return [];
    return [...folder.children];
}

async function deleteUserFile(path, name) {
    const folder = findFolder(path);
    if (!folder) return false;

    const index = folder.children.findIndex(item => item.name === name);
    if (index === -1) return false;

    folder.children.splice(index, 1);
    await saveFileSystem();
    window.dispatchEvent(new CustomEvent("lucid-file-deleted", {
        detail: { path: [...path, name] }
    }));
    return true;
}

function getStorageUsage(node = lucidFileSystem) {
    if (!node) return 0;
    if (node.type === "file") return Number(node.size) || Number(node.content?.size) || 0;
    return (node.children || []).reduce((total, child) => total + getStorageUsage(child), 0);
}

async function resetUserFiles() {
    lucidFileSystem = structuredClone(defaultFileSystem);
    await saveFileSystem();
}

function deleteDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DATABASE_NAME);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => resolve();
    });
}

export {
    lucidFileSystem,
    loadFileSystem,
    saveFileSystem,
    findFolder,
    ensureFolder,
    saveUserFile,
    getFiles,
    deleteUserFile,
    getStorageUsage,
    resetUserFiles,
    deleteDatabase
};