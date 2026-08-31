import {
    createWindow
} from "../js/window-manager.js";

import {
    lucidFileSystem,
    saveFileSystem
} from "../js/filesystem.js";

import {
    createTextEditor
} from "./text-editor.js";


function createFilesApp() {

    const content = `

        <div class="file-toolbar">

            <button class="file-tool back-button">
                ←
            </button>

            <button class="file-tool home-button">
                🏠
            </button>

            <div class="file-path">
                Home
            </div>

            <button class="file-tool new-folder-button">
                📁+
            </button>

            <button class="file-tool new-file-button">
                📄+
            </button>

        </div>

        <div class="file-list"></div>

    `;


    const windowElement =
        createWindow(
            "📁 Files",
            content
        );


    const fileList =
        windowElement.querySelector(
            ".file-list"
        );


    const filePath =
        windowElement.querySelector(
            ".file-path"
        );


    let currentFolder =
        lucidFileSystem;


    let folderHistory = [];


    let selectedItem = null;


    function displayFolder() {

        fileList.innerHTML = "";


        filePath.textContent =
            getPath(currentFolder);


        currentFolder.children.forEach(
            function (item) {

                const element =
                    document.createElement("div");


                element.className =
                    "file-item";


                if (
                    item.type === "folder"
                ) {

                    element.textContent =
                        "📁 " + item.name;

                } else {

                    element.textContent =
                        "📄 " + item.name;

                }


                element.addEventListener(
                    "click",
                    function () {

                        fileList
                            .querySelectorAll(
                                ".file-item"
                            )
                            .forEach(
                                function (other) {

                                    other.classList.remove(
                                        "selected"
                                    );

                                }
                            );


                        element.classList.add(
                            "selected"
                        );


                        selectedItem = item;

                    }
                );


                element.addEventListener(
                    "dblclick",
                    function () {

                        if (
                            item.type === "folder"
                        ) {

                            folderHistory.push(
                                currentFolder
                            );


                            currentFolder =
                                item;


                            selectedItem =
                                null;


                            displayFolder();

                        } else {

                            if (
                                item.name.endsWith(
                                    ".txt"
                                )
                            ) {

                                createTextEditor(
                                    item
                                );

                            }

                        }

                    }
                );


                fileList.appendChild(
                    element
                );

            }
        );

    }


    function getPath(folder) {

        if (
            folder === lucidFileSystem
        ) {

            return "Home";

        }


        return (
            "Home / " +
            folder.name
        );

    }


    const backButton =
        windowElement.querySelector(
            ".back-button"
        );


    backButton.addEventListener(
        "click",
        function () {

            if (
                folderHistory.length > 0
            ) {

                currentFolder =
                    folderHistory.pop();


                selectedItem =
                    null;


                displayFolder();

            }

        }
    );


    const homeButton =
        windowElement.querySelector(
            ".home-button"
        );


    homeButton.addEventListener(
        "click",
        function () {

            currentFolder =
                lucidFileSystem;


            folderHistory = [];


            selectedItem =
                null;


            displayFolder();

        }
    );


    const newFolderButton =
        windowElement.querySelector(
            ".new-folder-button"
        );


    newFolderButton.addEventListener(
        "click",
        async function () {

            const name =
                prompt(
                    "Folder name:"
                );


            if (!name) {
                return;
            }


            currentFolder.children.push({

                type: "folder",

                name: name,

                children: []

            });

            await saveFileSystem();

            displayFolder();

        }
    );


    const newFileButton =
        windowElement.querySelector(
            ".new-file-button"
        );


    newFileButton.addEventListener(
        "click",
        async function () {

            const name =
                prompt(
                    "File name:"
                );


            if (!name) {
                return;
            }


            currentFolder.children.push({

                type: "file",

                name: name,

                content: ""

            });

            await saveFileSystem();

            displayFolder();

        }
    );


    displayFolder();


    return windowElement;
}


export {
    createFilesApp
};
