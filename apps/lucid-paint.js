import { createWindow } from "../js/window-manager.js";
import { saveUserFile, ensureFolder, saveFileSystem } from "../js/filesystem.js";

function createLucidPaint() {
    const content = `
        <div class="lucid-paint">
            <div class="paint-toolbar">
                <div class="paint-brand">◇ Lucid Paint</div>
                <div class="paint-modes">
                    <button class="paint-mode active" data-mode="normal">Paint</button>
                    <button class="paint-mode" data-mode="pixel">Pixel</button>
                    <button class="paint-mode" data-mode="animation">Animation</button>
                </div>
                <div class="paint-tools">
                    <label>Color <input id="paint-color" type="color" value="#ffffff"></label>
                    <label>Size <input id="paint-size" type="range" min="1" max="40" value="6"></label>
                    <button id="paint-eraser">Eraser</button>
                    <button id="paint-undo">Undo</button>
                    <button id="paint-clear">Clear</button>
                    <button id="paint-save">Save</button>
                </div>
            </div>
            <div class="paint-stage">
                <canvas id="paint-canvas" width="640" height="400"></canvas>
            </div>
            <div class="paint-animation-bar" hidden>
                <button id="paint-prev-frame">←</button>
                <span id="paint-frame-label">Frame 1 / 1</span>
                <button id="paint-next-frame">→</button>
                <button id="paint-add-frame">＋ Frame</button>
                <button id="paint-play">▶ Play</button>
                <label>FPS <input id="paint-fps" type="number" min="1" max="24" value="8"></label>
            </div>
            <div class="paint-status" id="paint-status">Ready</div>
        </div>
    `;

    const windowElement = createWindow("◇ Lucid Paint", content);
    setupPaint(windowElement);
    return windowElement;
}

function setupPaint(windowElement) {
    const root = windowElement.querySelector(".lucid-paint");
    const canvas = root.querySelector("#paint-canvas");
    const context = canvas.getContext("2d");
    const color = root.querySelector("#paint-color");
    const size = root.querySelector("#paint-size");
    const status = root.querySelector("#paint-status");

    const modeSizes = {
        normal: [640, 400],
        pixel: [64, 40],
        animation: [320, 200]
    };

    const drawings = {
        normal: null,
        pixel: null,
        animation: []
    };

    let mode = "normal";
    let frameIndex = 0;
    let drawing = false;
    let erasing = false;
    let undoStack = [];
    let animationTimer = null;

    function setStatus(text) {
        status.textContent = text;
    }

    function clearCanvas() {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#ffffff00";
        context.fillRect(0, 0, canvas.width, canvas.height);
    }

    function saveSnapshot() {
        undoStack.push(canvas.toDataURL());
        if (undoStack.length > 20) undoStack.shift();
    }

    function restoreImage(data) {
        clearCanvas();
        if (!data) return;
        const image = new Image();
        image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height);
        image.src = data;
    }

    function saveModeDrawing() {
        const data = canvas.toDataURL();
        if (mode === "animation") drawings.animation[frameIndex] = data;
        else drawings[mode] = data;
    }

    function loadModeDrawing() {
        const [width, height] = modeSizes[mode];
        canvas.width = width;
        canvas.height = height;
        context.imageSmoothingEnabled = mode !== "pixel";
        canvas.classList.toggle("pixel-canvas", mode === "pixel");

        let data;
        if (mode === "animation") {
            if (!drawings.animation.length) drawings.animation.push(null);
            frameIndex = Math.min(frameIndex, drawings.animation.length - 1);
            data = drawings.animation[frameIndex];
            updateFrameLabel();
        } else {
            data = drawings[mode];
        }

        restoreImage(data);
        undoStack = [];
    }

    function switchMode(nextMode) {
        if (mode === nextMode) return;
        saveModeDrawing();
        mode = nextMode;
        root.querySelectorAll(".paint-mode").forEach(button => button.classList.toggle("active", button.dataset.mode === mode));
        root.querySelector(".paint-animation-bar").hidden = mode !== "animation";
        loadModeDrawing();
        setStatus(mode === "animation" ? "Animation mode" : `${mode[0].toUpperCase()}${mode.slice(1)} mode`);
    }

    function pointerPosition(event) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) * canvas.width / rect.width,
            y: (event.clientY - rect.top) * canvas.height / rect.height
        };
    }

    function draw(event) {
        if (!drawing) return;
        const point = pointerPosition(event);
        context.lineWidth = Number(size.value);
        context.lineCap = "round";
        context.lineJoin = "round";
        context.strokeStyle = erasing ? "rgba(0,0,0,0)" : color.value;
        context.globalCompositeOperation = erasing ? "destination-out" : "source-over";
        context.lineTo(point.x, point.y);
        context.stroke();
        context.beginPath();
        context.moveTo(point.x, point.y);
    }

    canvas.addEventListener("pointerdown", event => {
        saveSnapshot();
        drawing = true;
        canvas.setPointerCapture(event.pointerId);
        const point = pointerPosition(event);
        context.beginPath();
        context.moveTo(point.x, point.y);
        draw(event);
    });

    canvas.addEventListener("pointermove", draw);
    canvas.addEventListener("pointerup", () => {
        drawing = false;
        context.beginPath();
        context.globalCompositeOperation = "source-over";
        saveModeDrawing();
    });
    canvas.addEventListener("pointercancel", () => { drawing = false; context.beginPath(); });

    root.querySelectorAll(".paint-mode").forEach(button => {
        button.addEventListener("click", () => switchMode(button.dataset.mode));
    });

    root.querySelector("#paint-eraser").addEventListener("click", event => {
        erasing = !erasing;
        event.currentTarget.classList.toggle("active", erasing);
        setStatus(erasing ? "Eraser enabled" : "Brush enabled");
    });

    root.querySelector("#paint-undo").addEventListener("click", () => {
        const previous = undoStack.pop();
        if (!previous) return;
        restoreImage(previous);
        saveModeDrawing();
        setStatus("Undid last stroke");
    });

    root.querySelector("#paint-clear").addEventListener("click", () => {
        saveSnapshot();
        clearCanvas();
        saveModeDrawing();
        setStatus("Canvas cleared");
    });

    root.querySelector("#paint-save").addEventListener("click", () => saveArtwork());
    root.querySelector("#paint-prev-frame").addEventListener("click", () => changeFrame(-1));
    root.querySelector("#paint-next-frame").addEventListener("click", () => changeFrame(1));
    root.querySelector("#paint-add-frame").addEventListener("click", addFrame);
    root.querySelector("#paint-play").addEventListener("click", () => toggleAnimation(root));

    loadModeDrawing();

    async function saveArtwork() {
        saveModeDrawing();
        const name = prompt("Save as:", mode === "animation" ? "My Animation" : "My Drawing");
        if (!name) return;

        if (mode === "animation") {
            const frames = drawings.animation.filter(Boolean);
            const data = JSON.stringify({ type: "lucid-animation", fps: Number(root.querySelector("#paint-fps").value) || 8, width: 320, height: 200, frames }, null, 2);
            await saveUserFile(["Pictures", "Animations"], `${name.replace(/\.lpaint$/i, "")}.lpaint`, data, "application/json");
            setStatus("Animation saved to Pictures / Animations");
            return;
        }

        canvas.toBlob(async blob => {
            if (!blob) return;
            await saveUserFile(["Pictures"], `${name.replace(/\.png$/i, "")}.png`, blob, "image/png");
            setStatus("Image saved to Pictures");
        }, "image/png");
    }

    function updateFrameLabel() {
        root.querySelector("#paint-frame-label").textContent = `Frame ${frameIndex + 1} / ${drawings.animation.length}`;
    }

    function changeFrame(amount) {
        saveModeDrawing();
        frameIndex = Math.max(0, Math.min(drawings.animation.length - 1, frameIndex + amount));
        loadModeDrawing();
    }

    function addFrame() {
        saveModeDrawing();
        drawings.animation.splice(frameIndex + 1, 0, null);
        frameIndex++;
        loadModeDrawing();
        setStatus("New frame added");
    }

    function toggleAnimation(paintRoot) {
        const button = paintRoot.querySelector("#paint-play");
        if (animationTimer) {
            clearInterval(animationTimer);
            animationTimer = null;
            button.textContent = "▶ Play";
            return;
        }

        if (!drawings.animation.length) return;
        const fps = Math.max(1, Math.min(24, Number(paintRoot.querySelector("#paint-fps").value) || 8));
        animationTimer = setInterval(() => {
            saveModeDrawing();
            frameIndex = (frameIndex + 1) % drawings.animation.length;
            loadModeDrawing();
        }, 1000 / fps);
        button.textContent = "■ Stop";
        loadModeDrawing();
    }
}

export { createLucidPaint };