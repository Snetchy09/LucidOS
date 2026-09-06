import { createWindow } from "../js/window-manager.js";
import { saveUserFile } from "../js/filesystem.js";

function createLucidPaint() {
    const content = `
        <div class="lucid-paint">
            <header class="paint-header">
                <div>
                    <div class="paint-eyebrow">LUCID CREATIVE</div>
                    <h1>Lucid Paint</h1>
                </div>
                <div class="paint-main-modes" role="tablist" aria-label="Paint mode">
                    <button class="paint-main-mode active" data-main-mode="normal">Normal</button>
                    <button class="paint-main-mode" data-main-mode="pixel">Pixel</button>
                </div>
            </header>
            <div class="paint-submode-bar">
                <button class="paint-submode active" data-submode="draw">Draw</button>
                <button class="paint-submode" data-submode="animation">Animation</button>
                <div class="paint-controls">
                    <label>Color <input id="paint-color" type="color" value="#ffffff"></label>
                    <label>Size <input id="paint-size" type="range" min="1" max="40" value="6"></label>
                    <button id="paint-eraser">Eraser</button>
                    <button id="paint-undo">Undo</button>
                    <button id="paint-clear">Clear</button>
                    <button id="paint-save">Save</button>
                </div>
            </div>
            <main class="paint-workspace">
                <div class="paint-stage">
                    <canvas id="paint-canvas" width="800" height="600"></canvas>
                </div>
                <aside class="paint-side-panel">
                    <div class="paint-panel-title" id="paint-panel-title">Normal · Draw</div>
                    <p id="paint-panel-help">Free drawing on a smooth canvas.</p>
                    <div class="paint-tool-group">
                        <button class="paint-tool active" data-tool="brush">Brush</button>
                        <button class="paint-tool" data-tool="eraser">Eraser</button>
                    </div>
                    <div class="paint-animation-controls" hidden>
                        <div class="paint-frame-controls">
                            <button id="paint-prev-frame" aria-label="Previous frame">←</button>
                            <span id="paint-frame-label">Frame 1 / 1</span>
                            <button id="paint-next-frame" aria-label="Next frame">→</button>
                        </div>
                        <div class="paint-animation-actions">
                            <button id="paint-add-frame">＋ Add frame</button>
                            <button id="paint-copy-frame">Copy frame</button>
                            <button id="paint-paste-frame">Paste frame</button>
                            <button id="paint-play">▶ Play</button>
                        </div>
                        <label class="paint-fps-control">
                            <span>FPS</span>
                            <input id="paint-fps" type="number" min="1" max="24" value="8">
                        </label>
                    </div>
                </aside>
            </main>
            <div class="paint-status" id="paint-status">Ready</div>
        </div>
    `;
    const windowElement = createWindow("Lucid Paint", content);
    setupPaint(windowElement);
    return windowElement;
}

function setupPaint(windowElement) {
    const root = windowElement.querySelector(".lucid-paint");
    const canvas = root.querySelector("#paint-canvas");
    const context = canvas.getContext("2d");
    const colorInput = root.querySelector("#paint-color");
    const sizeInput = root.querySelector("#paint-size");
    const status = root.querySelector("#paint-status");
    const animationControls = root.querySelector(".paint-animation-controls");
    const frameLabel = root.querySelector("#paint-frame-label");
    const fpsInput = root.querySelector("#paint-fps");
    const sizes = { normal: [800, 600], pixel: [64, 64] };
    const drawings = { normal: null, pixel: null, normalAnimation: [], pixelAnimation: [] };
    let mainMode = "normal";
    let subMode = "draw";
    let frameIndex = 0;
    let isDrawing = false;
    let activeTool = "brush";
    let undoStack = [];
    let animationTimer = null;
    let animationFrames = [];
    let copiedFrame = null;

    function setStatus(message) {
        status.textContent = message;
    }

    function getFrameStore() {
        return drawings[`${mainMode}Animation`];
    }

    function getDrawingKey() {
        return mainMode;
    }

    function clearCanvas() {
        context.clearRect(0, 0, canvas.width, canvas.height);
    }

    function saveSnapshot() {
        undoStack.push(canvas.toDataURL("image/png"));
        if (undoStack.length > 30) undoStack.shift();
    }

    function restoreImage(data) {
        clearCanvas();
        if (!data) return Promise.resolve();
        return new Promise(resolve => {
            const image = new Image();
            image.onload = () => {
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                resolve();
            };
            image.onerror = resolve;
            image.src = data;
        });
    }

    function drawFrame(data) {
        clearCanvas();
        if (!data) return;
        const image = animationFrames.find(item => item.data === data)?.image;
        if (image) {
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            return;
        }
        restoreImage(data);
    }

    function saveCurrentDrawing() {
        const data = canvas.toDataURL("image/webp", 0.82);
        if (subMode === "animation") {
            const frames = getFrameStore();
            frames[frameIndex] = data;
        } else {
            drawings[getDrawingKey()] = data;
        }
        return data;
    }

    async function loadCurrentDrawing() {
        const [width, height] = sizes[mainMode];
        canvas.width = width;
        canvas.height = height;
        canvas.classList.toggle("pixel-canvas", mainMode === "pixel");
        context.imageSmoothingEnabled = mainMode !== "pixel";
        stopAnimation(false);
        if (subMode === "animation") {
            const frames = getFrameStore();
            if (!frames.length) frames.push(null);
            frameIndex = Math.min(frameIndex, frames.length - 1);
            await restoreImage(frames[frameIndex]);
            updateFrameLabel();
        } else {
            await restoreImage(drawings[getDrawingKey()]);
        }
        undoStack = [];
    }

    function updateFrameLabel() {
        const frames = getFrameStore();
        frameLabel.textContent = `Frame ${frameIndex + 1} / ${Math.max(frames.length, 1)}`;
    }

    function updateModeUI() {
        root.querySelectorAll(".paint-main-mode").forEach(button => {
            button.classList.toggle("active", button.dataset.mainMode === mainMode);
        });
        root.querySelectorAll(".paint-submode").forEach(button => {
            button.classList.toggle("active", button.dataset.submode === subMode);
        });
        animationControls.hidden = subMode !== "animation";
        root.querySelector("#paint-panel-title").textContent = `${mainMode === "normal" ? "Normal" : "Pixel"} · ${subMode === "draw" ? "Draw" : "Animation"}`;
        root.querySelector("#paint-panel-help").textContent = subMode === "animation" ? "Create frame-by-frame animation in this canvas." : mainMode === "pixel" ? "Draw crisp pixel art on a 64 × 64 canvas." : "Free drawing on a smooth canvas.";
        sizeInput.max = mainMode === "pixel" ? "12" : "40";
        if (Number(sizeInput.value) > Number(sizeInput.max)) sizeInput.value = sizeInput.max;
        if (subMode === "animation") updateFrameLabel();
    }

    function setMode(nextMainMode, nextSubMode = subMode) {
        saveCurrentDrawing();
        mainMode = nextMainMode;
        subMode = nextSubMode;
        frameIndex = 0;
        animationFrames = [];
        updateModeUI();
        loadCurrentDrawing();
        setStatus(`${mainMode === "normal" ? "Normal" : "Pixel"} ${subMode === "draw" ? "draw" : "animation"}`);
    }

    function setSubmode(nextSubmode) {
        if (subMode === nextSubmode) return;
        saveCurrentDrawing();
        subMode = nextSubmode;
        frameIndex = 0;
        animationFrames = [];
        updateModeUI();
        loadCurrentDrawing();
        setStatus(`${mainMode === "normal" ? "Normal" : "Pixel"} ${subMode}`);
    }

    function pointerPosition(event) {
        const rect = canvas.getBoundingClientRect();
        return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
    }

    function draw(event) {
        if (!isDrawing) return;
        const point = pointerPosition(event);
        context.lineWidth = Number(sizeInput.value);
        context.lineCap = mainMode === "pixel" ? "square" : "round";
        context.lineJoin = "round";
        context.strokeStyle = activeTool === "eraser" ? "rgba(0,0,0,1)" : colorInput.value;
        context.globalCompositeOperation = activeTool === "eraser" ? "destination-out" : "source-over";
        context.lineTo(point.x, point.y);
        context.stroke();
        context.beginPath();
        context.moveTo(point.x, point.y);
    }

    canvas.addEventListener("pointerdown", event => {
        saveSnapshot();
        isDrawing = true;
        canvas.setPointerCapture(event.pointerId);
        const point = pointerPosition(event);
        context.beginPath();
        context.moveTo(point.x, point.y);
        draw(event);
    });
    canvas.addEventListener("pointermove", draw);
    canvas.addEventListener("pointerup", () => {
        if (!isDrawing) return;
        isDrawing = false;
        context.beginPath();
        context.globalCompositeOperation = "source-over";
        saveCurrentDrawing();
    });
    canvas.addEventListener("pointercancel", () => {
        isDrawing = false;
        context.beginPath();
        context.globalCompositeOperation = "source-over";
    });

    root.querySelectorAll(".paint-main-mode").forEach(button => button.addEventListener("click", () => setMode(button.dataset.mainMode)));
    root.querySelectorAll(".paint-submode").forEach(button => button.addEventListener("click", () => setSubmode(button.dataset.submode)));
    root.querySelectorAll(".paint-tool").forEach(button => button.addEventListener("click", () => {
        activeTool = button.dataset.tool;
        root.querySelectorAll(".paint-tool").forEach(item => item.classList.toggle("active", item === button));
        setStatus(activeTool === "eraser" ? "Eraser selected" : "Brush selected");
    }));
    root.querySelector("#paint-eraser").addEventListener("click", () => {
        activeTool = activeTool === "eraser" ? "brush" : "eraser";
        root.querySelectorAll(".paint-tool").forEach(button => button.classList.toggle("active", button.dataset.tool === activeTool));
        setStatus(activeTool === "eraser" ? "Eraser enabled" : "Brush enabled");
    });
    root.querySelector("#paint-undo").addEventListener("click", () => {
        const previous = undoStack.pop();
        if (!previous) return;
        restoreImage(previous).then(() => {
            saveCurrentDrawing();
            setStatus("Undid last stroke");
        });
    });
    root.querySelector("#paint-clear").addEventListener("click", () => {
        saveSnapshot();
        clearCanvas();
        saveCurrentDrawing();
        setStatus("Canvas cleared");
    });
    root.querySelector("#paint-save").addEventListener("click", saveArtwork);
    root.querySelector("#paint-prev-frame").addEventListener("click", () => changeFrame(-1));
    root.querySelector("#paint-next-frame").addEventListener("click", () => changeFrame(1));
    root.querySelector("#paint-add-frame").addEventListener("click", addFrame);
    root.querySelector("#paint-copy-frame").addEventListener("click", copyFrame);
    root.querySelector("#paint-paste-frame").addEventListener("click", pasteFrame);
    root.querySelector("#paint-play").addEventListener("click", toggleAnimation);

    function changeFrame(amount) {
        if (subMode !== "animation") return;
        saveCurrentDrawing();
        const frames = getFrameStore();
        frameIndex = Math.max(0, Math.min(frames.length - 1, frameIndex + amount));
        animationFrames = [];
        loadCurrentDrawing();
    }

    function addFrame() {
        if (subMode !== "animation") return;
        saveCurrentDrawing();
        const frames = getFrameStore();
        const current = frames[frameIndex] || null;
        frames.splice(frameIndex + 1, 0, current);
        frameIndex++;
        animationFrames = [];
        loadCurrentDrawing();
        setStatus("New frame added from current frame");
    }

    function copyFrame() {
        if (subMode !== "animation") return;
        copiedFrame = saveCurrentDrawing();
        setStatus("Frame copied");
    }

    function pasteFrame() {
        if (subMode !== "animation" || !copiedFrame) return;
        const frames = getFrameStore();
        frames[frameIndex] = copiedFrame;
        animationFrames = [];
        loadCurrentDrawing();
        setStatus("Frame pasted");
    }

    function stopAnimation(updateButton = true) {
        if (animationTimer) clearInterval(animationTimer);
        animationTimer = null;
        animationFrames = [];
        if (updateButton) root.querySelector("#paint-play").textContent = "▶ Play";
    }

    async function preloadAnimationFrames(frames) {
        const loaded = await Promise.all(frames.map(data => new Promise(resolve => {
            if (!data) return resolve({ data, image: null });
            const image = new Image();
            image.onload = () => resolve({ data, image });
            image.onerror = () => resolve({ data, image: null });
            image.src = data;
        })));
        return loaded;
    }

    async function toggleAnimation() {
        const button = root.querySelector("#paint-play");
        if (animationTimer) {
            stopAnimation();
            return;
        }
        if (subMode !== "animation") return;
        saveCurrentDrawing();
        const frames = getFrameStore();
        if (!frames.length) return;
        button.textContent = "Loading…";
        animationFrames = await preloadAnimationFrames(frames);
        if (!animationFrames.length) return;
        frameIndex = Math.min(frameIndex, animationFrames.length - 1);
        const fps = Math.max(1, Math.min(24, Number(fpsInput.value) || 8));
        const interval = 1000 / fps;
        const startedAt = performance.now();
        let tick = 0;
        const renderFrame = () => {
            const frame = animationFrames[frameIndex];
            clearCanvas();
            if (frame?.image) context.drawImage(frame.image, 0, 0, canvas.width, canvas.height);
            updateFrameLabel();
        };
        renderFrame();
        animationTimer = setInterval(() => {
            tick++;
            frameIndex = tick % animationFrames.length;
            renderFrame();
        }, interval);
        button.textContent = "■ Stop";
    }

    async function saveArtwork() {
        saveCurrentDrawing();
        const name = prompt("Save as:", subMode === "animation" ? "My Animation" : "My Drawing");
        if (!name) return;
        if (subMode === "animation") {
            const frames = getFrameStore().filter(Boolean);
            const animation = {
                type: "lucid-animation",
                mode: mainMode,
                fps: Number(fpsInput.value) || 8,
                width: sizes[mainMode][0],
                height: sizes[mainMode][1],
                frames
            };
            await saveUserFile(["Pictures", "Animations"], `${name.replace(/\.lpaint$/i, "")}.lpaint`, JSON.stringify(animation), "application/json");
            setStatus("Animation saved to Pictures / Animations");
            return;
        }
        canvas.toBlob(async blob => {
            if (!blob) return;
            await saveUserFile(["Pictures"], `${name.replace(/\.(png|webp)$/i, "")}.webp`, blob, "image/webp");
            setStatus("Compressed image saved to Pictures");
        }, "image/webp", 0.82);
    }

    loadCurrentDrawing();
    updateModeUI();
}

export { createLucidPaint };
