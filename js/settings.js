const SETTINGS_DATABASE =
    "LucidOS_Settings";

const SETTINGS_VERSION = 1;

const SETTINGS_STORE =
    "preferences";


const defaultSettings = {

    theme: "dark",

    userName: "Lucid User",

    notifications: true

};


/* =========================
   DATABASE
========================= */

function openSettingsDatabase() {

    return new Promise(
        function (resolve, reject) {

            const request =
                indexedDB.open(
                    SETTINGS_DATABASE,
                    SETTINGS_VERSION
                );


            request.onupgradeneeded =
                function (event) {

                    const database =
                        event.target.result;


                    if (
                        !database.objectStoreNames
                            .contains(
                                SETTINGS_STORE
                            )
                    ) {

                        database.createObjectStore(
                            SETTINGS_STORE
                        );

                    }

                };


            request.onsuccess =
                function () {

                    resolve(
                        request.result
                    );

                };


            request.onerror =
                function () {

                    reject(
                        request.error
                    );

                };

        }
    );
}


/* =========================
   LOAD
========================= */

async function loadSettings() {

    const database =
        await openSettingsDatabase();


    return new Promise(
        function (resolve, reject) {

            const transaction =
                database.transaction(
                    SETTINGS_STORE,
                    "readonly"
                );


            const store =
                transaction.objectStore(
                    SETTINGS_STORE
                );


            const request =
                store.get("settings");


            request.onsuccess =
                function () {

                    if (request.result) {

                        resolve(
                            request.result
                        );

                    } else {

                        resolve(
                            structuredClone(
                                defaultSettings
                            )
                        );

                    }

                };


            request.onerror =
                function () {

                    reject(
                        request.error
                    );

                };

        }
    );
}


/* =========================
   SAVE
========================= */

async function saveSettings(
    settings
) {

    const database =
        await openSettingsDatabase();


    return new Promise(
        function (resolve, reject) {

            const transaction =
                database.transaction(
                    SETTINGS_STORE,
                    "readwrite"
                );


            const store =
                transaction.objectStore(
                    SETTINGS_STORE
                );


            const request =
                store.put(
                    settings,
                    "settings"
                );


            request.onsuccess =
                function () {

                    resolve();

                };


            request.onerror =
                function () {

                    reject(
                        request.error
                    );

                };

        }
    );
}


export {
    loadSettings,
    saveSettings
};
