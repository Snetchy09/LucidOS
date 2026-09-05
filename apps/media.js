import { createWindow } from "../js/window-manager.js";

function notifyAnomalyEngine(event, data = {}) {
    window.dispatchEvent(new CustomEvent("lucid-anomaly-event", {
        detail: { source: "media", event, data }
    }));
}

let audio = new Audio();
let audioContext = null;
let audioSource = null;
let audioGain = null;
let tracks = [];
let currentTrack = -1;
let currentPage = "library";
let shuffleEnabled = false;
let repeatMode = "off";
let studioTimer = null;
let studioStep = 0;

function initializeAudioEngine() {
    if (audioContext) return;

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioSource = audioContext.createMediaElementSource(audio);
    audioGain = audioContext.createGain();

    const savedVolume = Number(localStorage.getItem("lucid-media-volume"));
    const volume = Number.isFinite(savedVolume) ? savedVolume : 1;
    audioGain.gain.value = volume * 2.0;

    audioSource.connect(audioGain);
    audioGain.connect(audioContext.destination);
}

const MEDIA_DB_NAME = "lucid-media-db";
const MEDIA_DB_VERSION = 1;
const MEDIA_STORE_NAME = "tracks";

function openMediaDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(MEDIA_DB_NAME, MEDIA_DB_VERSION);

        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(MEDIA_STORE_NAME)) {
                db.createObjectStore(MEDIA_STORE_NAME, { keyPath: "id", autoIncrement: true });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function loadLibrary() {
    try {
        const db = await openMediaDatabase();
        const loadedTracks = await new Promise((resolve, reject) => {
            const transaction = db.transaction(MEDIA_STORE_NAME, "readonly");
            const store = transaction.objectStore(MEDIA_STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        tracks = loadedTracks.map(track => ({
            id: track.id,
            name: track.name,
            size: track.size,
            file: track.file,
            url: URL.createObjectURL(track.file)
        }));

        db.close();
    } catch (error) {
        console.error("Lucid Media: failed to load library", error);
        tracks = [];
    }
}

async function saveTrack(file) {
    try {
        const db = await openMediaDatabase();
        const id = await new Promise((resolve, reject) => {
            const transaction = db.transaction(MEDIA_STORE_NAME, "readwrite");
            const store = transaction.objectStore(MEDIA_STORE_NAME);
            const request = store.add({ name: file.name, size: file.size, file });
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        db.close();
        return id;
    } catch (error) {
        console.error("Lucid Media: failed to save track", error);
        return null;
    }
}

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
                        <p>Your local music.</p>
                    </div>
                    <div class="media-library" id="media-library"></div>
                </section>
                <section class="media-page hidden" id="media-player-page">
                    <div class="media-page-header">
                        <h1>Player</h1>
                        <p>Listen locally.</p>
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
                        <div class="media-volume">
                            🔊
                            <input class="media-volume-slider" id="media-volume" type="range" min="0" max="1" step="0.01" value="1">
                        </div>
                    </div>
                </section>
                <section class="media-page hidden" id="media-studio-page">
                    <div class="media-studio-header">
                        <div>
                            <h1>Studio</h1>
                            <p>Make a simple beat locally.</p>
                        </div>
                        <div class="media-studio-controls">
                            <label>BPM<input class="media-bpm" id="media-bpm" type="number" min="40" max="240" value="120"></label>
                            <button id="studio-play">▶ Play</button>
                            <button id="studio-clear">Clear</button>
                            <button id="studio-save">Save</button>
                        </div>
                    </div>
                    <div class="sequencer" id="sequencer"></div>
                    <div class="studio-help">Click the squares to create a beat. Everything runs locally in your browser.</div>
                </section>
            </main>
        </div>
    `;

    const windowElement = createWindow("Lucid Media", content);
    setupMedia(windowElement);

    loadLibrary().then(() => {
        const root = windowElement.querySelector(".lucid-media");
        if (root) renderLibrary(root);
    });

    return windowElement;
}

function setupMedia(windowElement) {
    const root = windowElement.querySelector(".lucid-media");
    const volumeSlider = root.querySelector("#media-volume");

    const savedVolume = Number(localStorage.getItem("lucid-media-volume"));
    if (Number.isFinite(savedVolume)) volumeSlider.value = savedVolume;

    root.querySelectorAll(".media-nav").forEach(button => {
        button.addEventListener("click", () => switchPage(root, button.dataset.page));
    });

    const importButton = root.querySelector("#media-import");
    const fileInput = root.querySelector("#media-file-input");

    importButton.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", async event => {
        const files = [...event.target.files];
        if (!files.length) return;

        for (const file of files) {
            const id = await saveTrack(file);
            if (id === null) continue;

            tracks.push({
                id, name: file.name, size: file.size, file,
                url: URL.createObjectURL(file)
            });
        }

        document.addEventListener("keydown", event => {
            if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") return;
            if (event.code === "Space") { event.preventDefault(); togglePlayback(); }
            if (event.code === "ArrowRight") nextTrack();
            if (event.code === "ArrowLeft") previousTrack();
        });

        renderLibrary(root);
        notifyAnomalyEngine("media-import", { count: files.length });
        fileInput.value = "";
    });

    root.querySelector("#media-play").addEventListener("click", togglePlayback);
    root.querySelector("#media-prev").addEventListener("click", previousTrack);
    root.querySelector("#media-next").addEventListener("click", nextTrack);
    root.querySelector("#media-shuffle").addEventListener("click", toggleShuffle);
    root.querySelector("#media-repeat").addEventListener("click", toggleRepeat);

    root.querySelector("#media-progress").addEventListener("input", event => {
        if (!audio.duration) return;
        audio.currentTime = audio.duration * (event.target.value / 100);
    });

    root.querySelector("#media-volume").addEventListener("input", event => {
        const volume = Number(event.target.value);
        localStorage.setItem("lucid-media-volume", volume);
        if (audioGain) audioGain.gain.value = volume * 2.0;
    });

    audio.addEventListener("timeupdate", () => updatePlayer(root));
    audio.addEventListener("loadedmetadata", () => updatePlayer(root));
    audio.addEventListener("ended", handleTrackEnded);

    createSequencer(root);
    root.querySelector("#studio-play").addEventListener("click", toggleStudio);
    root.querySelector("#studio-clear").addEventListener("click", clearStudio);
    root.querySelector("#studio-save").addEventListener("click", saveStudio);

    renderLibrary(root);
}

function switchPage(root, page) {
    currentPage = page;
    root.querySelectorAll(".media-nav").forEach(button => {
        button.classList.toggle("active", button.dataset.page === page);
    });
    root.querySelectorAll(".media-page").forEach(section => section.classList.add("hidden"));
    root.querySelector(`#media-${page}-page`).classList.remove("hidden");
    notifyAnomalyEngine("media-page-change", { page });
}

function renderLibrary(root) {
    const library = root.querySelector("#media-library");

    if (!tracks.length) {
        library.innerHTML = `
            <div class="media-empty">
                <div class="media-empty-icon">♪</div>
                <h2>Your library is empty</h2>
                <p>Import audio files from your computer.</p>
                <button class="media-empty-import" id="media-empty-import">Import music</button>
            </div>
        `;
        library.querySelector("#media-empty-import").addEventListener("click", () => {
            root.querySelector("#media-file-input").click();
        });
        return;
    }

    library.innerHTML = "";
    tracks.forEach((track, index) => {
        const item = document.createElement("button");
        item.className = "media-track";
        if (index === currentTrack) item.classList.add("playing");
        item.innerHTML = `
            <div class="media-track-icon">♪</div>
            <div class="media-track-info">
                <strong>${escapeHTML(track.name)}</strong>
                <span>Local audio</span>
            </div>
            <span>▶</span>
        `;
        item.addEventListener("click", () => playTrack(root, index));
        library.appendChild(item);
    });
}

function playTrack(root, index) {
    if (!tracks[index]) return;
    initializeAudioEngine();
    if (audioContext && audioContext.state === "suspended") audioContext.resume();

    currentTrack = index;
    audio.src = tracks[index].url;
    audio.volume = 1;
    audio.play().catch(error => console.error("Lucid Media playback failed:", error));

    updatePlayer(root);
    renderLibrary(root);
    switchPage(root, "player");
}

function togglePlayback() {
    if (!audio.src) return;
    if (audio.paused) audio.play();
    else audio.pause();
}

function nextTrack() {
    if (!tracks.length) return;

    let nextIndex;
    if (shuffleEnabled && tracks.length > 1) {
        do { nextIndex = Math.floor(Math.random() * tracks.length); }
        while (nextIndex === currentTrack);
    } else {
        nextIndex = (currentTrack + 1) % tracks.length;
    }

    currentTrack = nextIndex;
    const root = document.querySelector(".window:last-child .lucid-media");
    if (root) playTrack(root, currentTrack);
}

function previousTrack() {
    if (!tracks.length) return;
    currentTrack = (currentTrack - 1 + tracks.length) % tracks.length;
    const root = document.querySelector(".window:last-child .lucid-media");
    if (root) playTrack(root, currentTrack);
}

function toggleShuffle() {
    shuffleEnabled = !shuffleEnabled;
    const root = document.querySelector(".window:last-child .lucid-media");
    if (!root) return;
    const button = root.querySelector("#media-shuffle");
    button.classList.toggle("active", shuffleEnabled);
}

function handleTrackEnded() {
    if (!tracks.length) return;
    if (repeatMode === "one") { audio.currentTime = 0; audio.play(); return; }
    if (repeatMode === "off" && !shuffleEnabled && currentTrack === tracks.length - 1) { audio.currentTime = 0; return; }
    nextTrack();
}

function toggleRepeat() {
    if (repeatMode === "off") repeatMode = "all";
    else if (repeatMode === "all") repeatMode = "one";
    else repeatMode = "off";

    const root = document.querySelector(".window:last-child .lucid-media");
    if (!root) return;
    const button = root.querySelector("#media-repeat");
    button.classList.remove("active");

    if (repeatMode === "all") { button.textContent = "🔁"; button.classList.add("active"); }
    else if (repeatMode === "one") { button.textContent = "🔂"; button.classList.add("active"); }
    else { button.textContent = "🔁"; }
}

function updatePlayer(root) {
    const title = root.querySelector("#media-player-title");
    const artist = root.querySelector("#media-player-artist");
    const progress = root.querySelector("#media-progress");
    const currentTime = root.querySelector("#media-current-time");
    const duration = root.querySelector("#media-duration");
    const playButton = root.querySelector("#media-play");

    if (tracks[currentTrack]) {
        title.textContent = tracks[currentTrack].name;
        artist.textContent = "Local audio";
    }

    if (audio.duration) {
        progress.value = (audio.currentTime / audio.duration) * 100;
        currentTime.textContent = formatTime(audio.currentTime);
        duration.textContent = formatTime(audio.duration);
    }

    playButton.textContent = audio.paused ? "▶" : "❚❚";
}

function createSequencer(root) {
    const sequencer = root.querySelector("#sequencer");
    const instruments = ["Kick", "Snare", "Hi-Hat", "Bass"];

    instruments.forEach(instrument => {
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
    initializeAudioEngine();
    if (audioContext.state === "suspended") audioContext.resume();

    const button = document.querySelector("#studio-play");
    if (studioTimer) {
        clearInterval(studioTimer);
        studioTimer = null;
        button.textContent = "▶ Play";
        return;
    }

    const bpm = Number(document.querySelector("#media-bpm").value) || 120;
    const interval = 60000 / bpm / 4;

    studioTimer = setInterval(playStudioStep, interval);
    button.textContent = "■ Stop";
    playStudioStep();
}

function playStudioStep() {
    const steps = document.querySelectorAll(".sequencer-step");
    steps.forEach(step => step.classList.remove("playing"));

    steps.forEach(step => {
        if (Number(step.dataset.step) === studioStep) {
            step.classList.add("playing");
            if (step.classList.contains("active")) {
                const row = step.closest(".sequencer-row");
                const instrument = row?.dataset.instrument;
                if (instrument) playStudioSound(instrument);
            }
        }
    });

    studioStep = (studioStep + 1) % 16;
}

function playStudioSound(instrument) {
    if (!audioContext) initializeAudioEngine();
    if (audioContext.state === "suspended") audioContext.resume();

    switch (instrument) {
        case "Kick": playKick(); break;
        case "Snare": playSnare(); break;
        case "Hi-Hat": playHiHat(); break;
        case "Bass": playBass(); break;
    }
}

function playKick() {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(140, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(45, audioContext.currentTime + 0.14);
    gain.gain.setValueAtTime(0.9, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.18);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.18);
}

function playSnare() {
    const bufferSize = audioContext.sampleRate * 0.12;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    const filter = audioContext.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1400;
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.5, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.12);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);
    noise.start();
    noise.stop(audioContext.currentTime + 0.12);
}

function playHiHat() {
    const bufferSize = audioContext.sampleRate * 0.06;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    const filter = audioContext.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 5000;
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.22, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.055);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);
    noise.start();
    noise.stop(audioContext.currentTime + 0.06);
}

function playBass() {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sawtooth";
    oscillator.frequency.value = 65;
    gain.gain.setValueAtTime(0.28, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.25);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.25);
}

function clearStudio() {
    document.querySelectorAll(".sequencer-step").forEach(step => step.classList.remove("active"));
}

function saveStudio() {
    const pattern = [...document.querySelectorAll(".sequencer-row")].map(row => {
        return [...row.querySelectorAll(".sequencer-step")].map(step => step.classList.contains("active"));
    });
    localStorage.setItem("lucid-studio-pattern", JSON.stringify(pattern));
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remaining = Math.floor(seconds % 60);
    return minutes + ":" + String(remaining).padStart(2, "0");
}

function escapeHTML(text) {
    return String(text ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export { createMediaApp };
