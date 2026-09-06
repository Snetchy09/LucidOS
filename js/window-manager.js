let highestZIndex = 100;
function createWindow(title, content) {
    const windowElement = document.createElement("div");
    windowElement.className = "window";
    windowElement.style.zIndex = ++highestZIndex;
    windowElement.innerHTML = `<div class="title-bar"><div class="window-title">${title}</div><div class="window-controls"><button class="window-control minimize-button">−</button><button class="window-control maximize-button">□</button><button class="window-control close-button">×</button></div></div><div class="window-content">${content}</div>`;
    document.getElementById("desktop").appendChild(windowElement);
    const taskbarApps = document.getElementById("taskbar-apps");
    const taskbarButton = document.createElement("button");
    taskbarButton.className = "taskbar-app";
    taskbarButton.textContent = title;
    taskbarApps.appendChild(taskbarButton);
    windowElement.addEventListener("mousedown", () => { windowElement.style.zIndex = ++highestZIndex; });
    taskbarButton.addEventListener("click", () => { windowElement.classList.remove("minimized"); windowElement.style.zIndex = ++highestZIndex; });
    windowElement.querySelector(".close-button").addEventListener("click", () => { windowElement.remove(); taskbarButton.remove(); });
    windowElement.querySelector(".minimize-button").addEventListener("click", () => { windowElement.classList.add("minimized"); });
    windowElement.querySelector(".maximize-button").addEventListener("click", () => { windowElement.classList.toggle("maximized"); });
    makeDraggable(windowElement, windowElement.querySelector(".title-bar"));
    return windowElement;
}
function makeDraggable(windowElement, titleBar) {
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;
    titleBar.addEventListener("mousedown", event => {
        if (event.target.closest(".window-controls")) return;
        dragging = true;
        offsetX = event.clientX - windowElement.offsetLeft;
        offsetY = event.clientY - windowElement.offsetTop;
    });
    document.addEventListener("mousemove", event => {
        if (!dragging) return;
        windowElement.style.left = event.clientX - offsetX + "px";
        windowElement.style.top = event.clientY - offsetY + "px";
    });
    document.addEventListener("mouseup", () => { dragging = false; });
}
function setupSettingsTaskbar() {
    const taskbarApps = document.getElementById("taskbar-apps");
    if (!taskbarApps || taskbarApps.querySelector(".taskbar-settings")) return;
    const button = document.createElement("button");
    button.className = "taskbar-app taskbar-settings";
    button.textContent = "⚙️";
    button.title = "Settings";
    button.setAttribute("aria-label", "Settings");
    button.addEventListener("click", () => {
        const launcher = window.__lucidGetAppLauncher?.("settings");
        if (launcher) launcher();
    });
    taskbarApps.prepend(button);
}
function setupOrbLauncher() {
    const startButton = document.getElementById("start-button");
    const desktop = document.getElementById("desktop");
    if (!startButton || !desktop) return;
    const replacement = startButton.cloneNode(true);
    startButton.replaceWith(replacement);
    const toggle = () => {
        if (desktop.classList.contains("lucid-launcher-open")) replacement.dispatchEvent(new MouseEvent("click", { bubbles: false }));
        else replacement.dispatchEvent(new MouseEvent("click", { bubbles: false }));
    };
    const open = () => { replacement.dataset.launcherAction = "open"; replacement.dispatchEvent(new CustomEvent("lucid-orb-toggle")); };
    replacement.addEventListener("lucid-orb-toggle", () => { window.dispatchEvent(new CustomEvent("lucid-launcher-toggle")); });
    replacement.addEventListener("click", event => {
        event.stopPropagation();
        window.dispatchEvent(new CustomEvent("lucid-launcher-toggle"));
    });
}
window.addEventListener("load", () => { setupSettingsTaskbar(); setupOrbLauncher(); });
export { createWindow };
