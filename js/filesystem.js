const DATABASE_NAME = "LucidOS";
const DATABASE_VERSION = 1;
const STORE_NAME = "system";

const defaultFileSystem = {
    type: "folder",
    name: "Home",
    children: [
        { type: "folder", name: "Documents", children: [{ type: "file", name: "Welcome.txt", content: "Welcome to LucidOS." }] },
        { type: "folder", name: "Downloads", children: [] },
        { type: "folder", name: "Pictures", children: [] },
        { type: "folder", name: "Music", children: [] },
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
            if (request.result) {
                lucidFileSystem = request.result;
            } else {
                lucidFileSystem = structuredClone(defaultFileSystem);
            }
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

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export { lucidFileSystem, loadFileSystem, saveFileSystem };