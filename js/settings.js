const SETTINGS_DATABASE = "LucidOS_Settings";
const SETTINGS_VERSION = 2;
const SETTINGS_STORE = "preferences";

const defaultSettings = {
    theme: "dark",
    userName: "Lucid User",
    notifications: true,
    wallpaper: ""
};

function openSettingsDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(SETTINGS_DATABASE, SETTINGS_VERSION);

        request.onupgradeneeded = event => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(SETTINGS_STORE)) database.createObjectStore(SETTINGS_STORE);
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function loadSettings() {
    const database = await openSettingsDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(SETTINGS_STORE, "readonly");
        const request = transaction.objectStore(SETTINGS_STORE).get("settings");

        request.onsuccess = () => {
            database.close();
            resolve({ ...defaultSettings, ...(request.result || {}) });
        };
        request.onerror = () => {
            database.close();
            reject(request.error);
        };
    });
}

async function saveSettings(settings) {
    const database = await openSettingsDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(SETTINGS_STORE, "readwrite");
        const request = transaction.objectStore(SETTINGS_STORE).put({ ...defaultSettings, ...settings }, "settings");

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

function deleteSettingsDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(SETTINGS_DATABASE);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => resolve();
    });
}

async function resetSettings() {
    await deleteSettingsDatabase();
}

export { loadSettings, saveSettings, resetSettings, deleteSettingsDatabase };