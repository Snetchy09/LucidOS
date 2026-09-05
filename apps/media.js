import { createWindow } from "../js/window-manager.js";
import { getFiles, saveUserFile } from "../js/filesystem.js";

let audio = new Audio();
let audioContext = null;
let audioGain = null;
let tracks = [];
let currentTrack = -1;
let shuffleEnabled = false;
let repeatMode = "off";
let studioTimer = null;
let studioStep = 0;

function createMediaApp() {
    const content = `
        <div class="lucid-media">
            <aside class="media-sidebar">
                <div class="media-logo">◉ Lucid Media</div>
                <button class="media-nav active" data-page="library">🎵 Library</button>
                <button class="media-nav" data-page="player">▶ Player</button>
                <button class="media-nav" data-page="studio">🎛 Studio</button>
                <div class="media-sidebar-bottom">
                    <button class="media-import" id="media-import">＋ Import music</button>
                    <input type="file" id="media-file-input" accept="audio/*" multiple hidden>
                </div>
            </aside>
            <main class="media-main">
                <section class="media-page" id="media-library-page">
                    <div class="media-page-header">
                        <h1>Library</h1>
                        <p>Music stored in Home / Music.</p>
                    </div>
                    <div class="media-library" id="media-library"></div>
                </section>
                <section class="media-page hidden" id="media-player-page">
                    <div class="media-page-header">
                        <h1>Player</h1>
                        <p>Play files from your Lucid Music folder.</p>
                    </div>
                    <div class="media-player">
                        <div class="media-art">♪</div>
                        <h2 class="media-track-title" id="media-player-title">Nothing playing</h2>
                        <div class="media-track-artist" id="media-player-artist">Choose a track</div>
                        <div class="media-progress">
                            <span id="media-current-time">0:00</span>
                            <input class="media-progress-slider" id="media-progress" type="range" min="0" max="100" value="0">
                            <span id="media-duration">0:00</span>
                        </div>
                        <div class="media-controls">
                            <button id="media-shuffle" title="Shuffle">🔀</button>
                            <button id="media-prev" title="Previous">⏮</button>
                            <button class="media-play" id="media-play" title="Play / Pause">▶</button>
                            <button id="media-next" title="Next">⏭</button>
                            <button id="media-repeat" title="Repeat">🔁</button>
                        </div>
                        <div class="media-volume">🔊 <input class="media-volume-slider" id="media-volume" type="range" min="0" max="1" step="0.01" value="1"></div>
                    </div>
                </section>
                <section class="media-page hidden" id="media-studio-page">
                    <div class="media-studio-header">
                        <div><h1>Studio</h1><p>Make a simple beat and save it to Music.</p></div>
                        <div class="media-studio-controls">
                            <label>BPM<input class="media-bpm" id="media-bpm" type="number" min="40" max="240" value="120"></label>
                            <button id="studio-play">▶ Play</button>
                            <button id="studio-clear">Clear</button>
                            <button id="studio-save">Save</button>
                        </div>
                    </div>
                    <div class="sequencer" id="sequencer"></div>
                    <div class="studio-help">Your beat pattern is stored with the rest of your files.</div>
                </section>
            </main>
        </div>
    `;

    const windowElement = createWindow("Lucid Media", content);
    setupMedia(windowElement);
    refreshLibrary(windowElement.querySelector(".lucid-media"));
    return windowElement;
}

function setupMedia(windowElement) {
    const root = windowElement.querySelector(".lucid-media");
    const fileInput = root.querySelector("#media-file-input");

    root.querySelectorAll(".media-nav").forEach(button => {
        button.addEventListener("click", () => switchPage(root, button.dataset.page));
    });

    root.querySelector("#media-import").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async event => {
        for (const file of [...event.target.files]) {
            await saveUserFile(["Music"], file.name, file, file.type || "audio/mpeg");
        }
        fileInput.value = "";
        refreshLibrary(root);
    });

    root.querySelector("#media-play").addEventListener("click", togglePlayback);
    root.querySelector("#media-prev").addEventListener("click", previousTrack);
    root.querySelector("#media-next").addEventListener("click", nextTrack);
    root.querySelector("#media-shuffle").addEventListener("click", () => {
        shuffleEnabled = !shuffleEnabled;
        root.querySelector("#media-shuffle").classList.toggle("active", shuffleEnabled);
    });
    root.querySelector("#media-repeat").addEventListener("click", toggleRepeat);

    root.querySelector("#media-progress").addEventListener("input", event => {
        if (audio.duration) audio.currentTime = audio.duration * Number(event.target.value) / 100;
    });

    const volume = root.querySelector("#media-volume");
    const savedVolume = Number(localStorage.getItem("lucid-media-volume"));
    if (Number.isFinite(savedVolume)) volume.value = savedVolume;
    volume.addEventListener("input", event => setVolume(Number(event.target.value)));

    audio.addEventListener("timeupdate", () => updatePlayer(root));
    audio.addEventListener("loadedmetadata", () => updatePlayer(root));
    audio.addEventListener("ended", handleTrackEnded);

    createSequencer(root);
    root.querySelector("#studio-play").addEventListener("click", toggleStudio);
    root.querySelector("#studio-clear").addEventListener("click", clearStudio);
    root.querySelector("#studio-save").addEventListener("click", () => saveStudio(root));

    document.addEventListener("keydown", event => {
        if (event.target.matches("input, textarea")) return;
        if (event.code === "Space") {
            event.preventDefault();
            togglePlayback();
        }
    });
}

function switchPage(root, page) {
    root.querySelectorAll(".media-nav").forEach(button => button.classList.toggle("active", button.dataset.page === page));
    root.querySelectorAll(".media-page").forEach(section => section.classList.toggle("hidden", section.id !== `media-${page}-page`));
}

function refreshLibrary(root) {
    if (!root) return;
    tracks.forEach(track => track.url && URL.revokeObjectURL(track.url));

    tracks = getFiles(["Music"])
        .filter(file => file.type === "file" && (file.mimeType?.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name)))
        .map(file => {
            const blob = file.content instanceof Blob ? file.content : new Blob([file.content], { type: file.mimeType || "audio/mpeg" });
            return { name: file.name, size: file.size || blob.size, blob, url: URL.createObjectURL(blob) };
        });

    if (currentTrack >= tracks.length) currentTrack = tracks.length - 1;
    renderLibrary(root);
}

function renderLibrary(root) {
    const library = root.querySelector("#media-library");
    library.innerHTML = "";

    if (!tracks.length) {
        library.innerHTML = '<div class="media-empty"><div class="media-empty-icon">♪</div><h2>Your library is empty</h2><p>Import music and it will appear in Files → Music.</p><button class="media-empty-import">Import music</button></div>';
        library.querySelector("button").addEventListener("click", () => root.querySelector("#media-file-input").click());
        return;
    }

    tracks.forEach((track, index) => {
        const item = document.createElement("button");
        item.className = "media-track";
        item.classList.toggle("playing", index === currentTrack && !audio.paused);
        item.innerHTML = `<div class="media-track-icon">♪</div><div class="media-track-info"><strong>${escapeHTML(track.name)}</strong><span>Home / Music</span></div><span>▶</span>`;
        item.addEventListener("click", () => playTrack(root, index));
        library.appendChild(item);
    });
}

function initializeAudio() {
    if (audioContext) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audio);
    audioGain = audioContext.createGain();
    source.connect(audioGain);
    audioGain.connect(audioContext.destination);
    setVolume(Number(localStorage.getItem("lucid-media-volume")) || 1);
}

function setVolume(volume) {
    volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem("lucid-media-volume", volume);
    if (audioGain) audioGain.gain.value = volume;
}

function playTrack(root, index) {
    const track = tracks[index];
    if (!track) return;
    initializeAudio();
    if (audioContext.state === "suspended") audioContext.resume();
    currentTrack = index;
    audio.src = track.url;
    audio.play().catch(error => console.error("Lucid Media playback failed:", error));
    switchPage(root, "player");
    renderLibrary(root);
    updatePlayer(root);
}

function togglePlayback() {
    if (!audio.src) return;
    if (audio.paused) audio.play();
    else audio.pause();
}

function nextTrack() {
    if (!tracks.length) return;
    let index = shuffleEnabled && tracks.length > 1 ? Math.floor(Math.random() * tracks.length) : currentTrack + 1;
    if (index >= tracks.length) index = 0;
    const root = document.querySelector(".window:last-child .lucid-media");
    if (root) playTrack(root, index);
}

function previousTrack() {
    if (!tracks.length) return;
    const index = currentTrack <= 0 ? tracks.length - 1 : currentTrack - 1;
    const root = document.querySelector(".window:last-child .lucid-media");
    if (root) playTrack(root, index);
}

function toggleRepeat() {
    repeatMode = repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off";
    const root = document.querySelector(".window:last-child .lucid-media");
    const button = root?.querySelector("#media-repeat");
    if (!button) return;
    button.textContent = repeatMode === "one" ? "🔂" : "🔁";
    button.classList.toggle("active", repeatMode !== "off");
}

function handleTrackEnded() {
    if (repeatMode === "one") {
        audio.currentTime = 0;
        audio.play();
        return;
    }
    if (repeatMode === "off" && !shuffleEnabled && currentTrack === tracks.length - 1) return;
    nextTrack();
}

function updatePlayer(root) {
    const track = tracks[currentTrack];
    root.querySelector("#media-player-title").textContent = track?.name || "Nothing playing";
    root.querySelector("#media-player-artist").textContent = track ? "Home / Music" : "Choose a track";
    root.querySelector("#media-play").textContent = audio.paused ? "▶" : "❚❚";
    if (audio.duration) {
        root.querySelector("#media-progress").value = audio.currentTime / audio.duration * 100;
        root.querySelector("#media-current-time").textContent = formatTime(audio.currentTime);
        root.querySelector("#media-duration").textContent = formatTime(audio.duration);
    }
}

function createSequencer(root) {
    const sequencer = root.querySelector("#sequencer");
    ["Kick", "Snare", "Hi-Hat", "Bass"].forEach(instrument => {
        const row = document.createElement("div");
        row.className = "sequencer-row";
        row.dataset.instrument = instrument;
        row.innerHTML = `<div class="sequencer-name">${instrument}</div><div class="sequencer-grid"></div>`;
        const grid = row.querySelector(".sequencer-grid");
        for (let step = 0; step < 16; step++) {
            const button = document.createElement("button");
            button.className = "sequencer-step";
            button.dataset.step = step;
            button.addEventListener("click", () => button.classList.toggle("active"));
            grid.appendChild(button);
        }
        sequencer.appendChild(row);
    });
}

function toggleStudio() {
    initializeAudio();
    if (audioContext.state === "suspended") audioContext.resume();
    const root = document.querySelector(".window:last-child .lucid-media");
    const button = root?.querySelector("#studio-play");
    if (!button) return;
    if (studioTimer) {
        clearInterval(studioTimer);
        studioTimer = null;
        button.textContent = "▶ Play";
        return;
    }
    studioStep = 0;
    const bpm = Math.max(40, Math.min(240, Number(root.querySelector("#media-bpm").value) || 120));
    studioTimer = setInterval(() => playStudioStep(root), 60000 / bpm / 4);
    button.textContent = "■ Stop";
    playStudioStep(root);
}

function playStudioStep(root) {
    const steps = root.querySelectorAll(".sequencer-step");
    steps.forEach(step => step.classList.toggle("playing", Number(step.dataset.step) === studioStep));
    steps.forEach(step => {
        if (Number(step.dataset.step) !== studioStep || !step.classList.contains("active")) return;
        playStudioSound(step.closest(".sequencer-row")?.dataset.instrument);
    });
    studioStep = (studioStep + 1) % 16;
}

function playStudioSound(instrument) {
    if (!instrument) return;
    initializeAudio();
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.connect(gain);
    gain.connect(audioGain || audioContext.destination);

    if (instrument === "Kick") {
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(140, now);
        oscillator.frequency.exponentialRampToValueAtTime(45, now + 0.14);
    } else if (instrument === "Bass") {
        oscillator.type = "sawtooth";
        oscillator.frequency.value = 65;
    } else {
        oscillator.type = "square";
        oscillator.frequency.value = instrument === "Snare" ? 180 : 900;
    }

    gain.gain.setValueAtTime(instrument === "Kick" ? 0.8 : 0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    oscillator.start(now);
    oscillator.stop(now + 0.13);
}

function clearStudio() {
    document.querySelectorAll(".sequencer-step").forEach(step => step.classList.remove("active"));
}

async function saveStudio(root) {
    const name = prompt("Save beat as:", "My Beat.lucidbeat");
    if (!name) return;

    const pattern = [...root.querySelectorAll(".sequencer-row")].map(row => ({
        instrument: row.dataset.instrument,
        steps: [...row.querySelectorAll(".sequencer-step")].map(step => step.classList.contains("active"))
    }));

    const data = JSON.stringify({ bpm: Number(root.querySelector("#media-bpm").value) || 120, pattern }, null, 2);
    await saveUserFile(["Music"], name.endsWith(".lucidbeat") ? name : `${name}.lucidbeat`, data, "application/json");
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "0:00";
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function escapeHTML(text) {
    return String(text ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

export { createMediaApp };