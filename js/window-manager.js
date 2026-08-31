let highestZIndex = 10;


function createWindow(title, content) {

    const windowElement =
        document.createElement("div");

    windowElement.className =
        "window";

    windowElement.style.zIndex =
        ++highestZIndex;


    windowElement.innerHTML = `

        <div class="title-bar">

            <div class="window-title">
                ${title}
            </div>

            <div class="window-controls">

                <button
                    class="window-control minimize-button"
                >
                    −
                </button>

                <button
                    class="window-control maximize-button"
                >
                    □
                </button>

                <button
                    class="window-control close-button"
                >
                    ×
                </button>

            </div>

        </div>

        <div class="window-content">
            ${content}
        </div>

    `;


    document
        .getElementById("desktop")
        .appendChild(windowElement);


    /* TASKBAR BUTTON */

    const taskbarApps =
        document.getElementById(
            "taskbar-apps"
        );


    const taskbarButton =
        document.createElement("button");


    taskbarButton.className =
        "taskbar-app";


    taskbarButton.textContent =
        title;


    taskbarApps.appendChild(
        taskbarButton
    );


    /* BRING TO FRONT */

    windowElement.addEventListener(
        "mousedown",
        function () {

            windowElement.style.zIndex =
                ++highestZIndex;

        }
    );


    /* TASKBAR */

    taskbarButton.addEventListener(
        "click",
        function () {

            windowElement.classList.remove(
                "minimized"
            );

            windowElement.style.zIndex =
                ++highestZIndex;

        }
    );


    /* CLOSE */

    const closeButton =
        windowElement.querySelector(
            ".close-button"
        );


    closeButton.addEventListener(
        "click",
        function () {

            windowElement.remove();

            taskbarButton.remove();

        }
    );


    /* MINIMIZE */

    const minimizeButton =
        windowElement.querySelector(
            ".minimize-button"
        );


    minimizeButton.addEventListener(
        "click",
        function () {

            windowElement.classList.add(
                "minimized"
            );

        }
    );


    /* MAXIMIZE */

    const maximizeButton =
        windowElement.querySelector(
            ".maximize-button"
        );


    maximizeButton.addEventListener(
        "click",
        function () {

            windowElement.classList.toggle(
                "maximized"
            );

        }
    );


    /* DRAGGING */

    makeDraggable(
        windowElement,

        windowElement.querySelector(
            ".title-bar"
        )
    );


    return windowElement;
}


function makeDraggable(
    windowElement,
    titleBar
) {

    let dragging = false;

    let offsetX = 0;
    let offsetY = 0;


    titleBar.addEventListener(
        "mousedown",
        function (event) {

            if (
                event.target.closest(
                    ".window-controls"
                )
            ) {
                return;
            }


            dragging = true;


            offsetX =
                event.clientX -
                windowElement.offsetLeft;


            offsetY =
                event.clientY -
                windowElement.offsetTop;

        }
    );


    document.addEventListener(
        "mousemove",
        function (event) {

            if (!dragging) {
                return;
            }


            windowElement.style.left =
                (
                    event.clientX -
                    offsetX
                ) + "px";


            windowElement.style.top =
                (
                    event.clientY -
                    offsetY
                ) + "px";

        }
    );


    document.addEventListener(
        "mouseup",
        function () {

            dragging = false;

        }
    );
}


export {
    createWindow
};
