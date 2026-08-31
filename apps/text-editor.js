import {
    createWindow
} from "../js/window-manager.js";

import {
    lucidFileSystem,
    saveFileSystem
} from "../js/filesystem.js";


function createTextEditor(file = null) {

    const startingText =
        file ? file.content : "";


    const fileName =
        file ? file.name : "Untitled";


    const content = `

        <div class="text-editor">

            <div class="editor-toolbar">

                <button class="editor-save">
                    💾 Save
                </button>

                <span class="editor-status">
                    Ready
                </span>

            </div>

            <textarea
                class="editor"
                spellcheck="false"
                placeholder="Start typing..."
            ></textarea>

        </div>

    `;


    const windowElement =
        createWindow(
            "📝 " + fileName,
            content
        );


    const editor =
        windowElement.querySelector(
            ".editor"
        );


    const saveButton =
        windowElement.querySelector(
            ".editor-save"
        );


    const status =
        windowElement.querySelector(
            ".editor-status"
        );


    editor.value =
        startingText;


    /* =========================
       SAVE
    ========================= */

    saveButton.addEventListener(
        "click",
        async function () {

            if (!file) {

                status.textContent =
                    "Nothing to save";

                return;

            }


            file.content =
                editor.value;


            await saveFileSystem();


            status.textContent =
                "Saved ✓";


            setTimeout(
                function () {

                    status.textContent =
                        "Ready";

                },
                1500
            );

        }
    );


    /* =========================
       UNSAVED CHANGES
    ========================= */

    let savedText =
        editor.value;


    editor.addEventListener(
        "input",
        function () {

            if (
                editor.value !==
                savedText
            ) {

                status.textContent =
                    "Unsaved changes";

            } else {

                status.textContent =
                    "Ready";

            }

        }
    );


    /* =========================
       KEYBOARD SHORTCUT
    ========================= */

    editor.addEventListener(
        "keydown",
        function (event) {

            if (
                event.ctrlKey &&
                event.key.toLowerCase() === "s"
            ) {

                event.preventDefault();

                saveButton.click();

            }

        }
    );


    editor.focus();


    return windowElement;
}


export {
    createTextEditor
};
