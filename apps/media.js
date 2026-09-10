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
                    <div class="media-page-header"><h1>Library</h1><p>Music stored in Home / Music.</p></div>
                    <div class="media-library" id="media-library"></div>
                </section>
                <section class="media-page hidden" id="media-player-page">
                    <div class="media-page-header"><h1>Player</h1><p>Play files from your Lucid Music folder.</p></div>
                    <div class="media-player">
                        <div class="media-art">♪</div>
                        <h2 class="media-track-title" id="media-player-title">Nothing playing</h2>
                        <div class="media-track-artist" id="media-player-artist">Choose a track</div>
                        <div class="media-progress"><span id="media-current-time">0:00</span><input class="media-progress-slider" id="media-progress" type="range" min="0" max="100" value="0"><span id="media-duration">0:00</span></div>
                        <div class="media-controls"><button id="media-shuffle">🔀</button><button id="media-prev">⏮</button><button class="media-play" id="media-play">▶</button><button id="media-next">⏭</button><button id="media-repeat">🔁</button></div>
                        <div class="media-volume">🔊 <input class="media-volume-slider" id="media-volume" type="range" min="0" max="1" step="0.01" value="1"></div>
                    </div>
                </section>
                <section class="media-page hidden" id="media-studio-page">
                <div class="media-studio-header">
                <div><h1>Music Studio</h1><p>Create beats, basslines, melodies and full arrangements.</p></div>
                <div class="media-studio-controls"><label>BPM<input class="media-bpm" id="media-bpm" type="number" min="40" max="240" value="120"></label><label>Swing<input id="studio-swing" type="range" min="0" max="50" value="0"></label><button id="studio-play">▶ Play</button><button id="studio-clear">Clear</button><button id="studio-save">Save</button><button id="studio-export">Export WAV</button></div>
                </div>
                <div class="studio-toolbar">
                <button class="studio-tool active" data-tool="sequence">Sequencer</button>
                <button class="studio-tool" data-tool="melody">Melody</button>
                <button class="studio-tool" data-tool="mixer">Mixer</button>
                </div>
                <div class="studio-section" id="studio-sequence">
                <div class="studio-track-labels" id="studio-track-labels"></div>
                <div class="sequencer" id="sequencer"></div>
                </div>
                <div class="studio-section hidden" id="studio-melody">
                <div class="melody-controls"><label>Scale<select id="melody-scale"><option value="major">Major</option><option value="minor">Minor</option><option value="pentatonic">Pentatonic</option><option value="chromatic">Chromatic</option></select></label><label>Root<select id="melody-root"><option value="C">C</option><option value="C#">C#</option><option value="D">D</option><option value="D#">D#</option><option value="E">E</option><option value="F">F</option><option value="F#">F#</option><option value="G">G</option><option value="G#">G#</option><option value="A">A</option><option value="A#">A#</option><option value="B">B</option></select></label></div>
                <div class="melody-grid" id="melody-grid"></div>
                </div>
                <div class="studio-section hidden" id="studio-mixer">
                <div class="mixer" id="studio-mixer-panel"></div>
                </div>
                <div class="studio-status" id="studio-status">Ready</div>
                </section>
            </main>
        </div>
    `;

    const windowElement = createWindow("Lucid Media", content);
    setupMedia(windowElement);
    const root = windowElement.querySelector(".lucid-media");

    migrateLegacyLibrary().then(() => refreshLibrary(root));
    return windowElement;
}

async function migrateLegacyLibrary() {
    if (localStorage.getItem("lucid-media-migrated") === "1") return;

    try {
        const db = await openLegacyDatabase();
        const oldTracks = await new Promise((resolve, reject) => {
            const transaction = db.transaction("tracks", "readonly");
            const request = transaction.objectStore("tracks").getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });

        for (const track of oldTracks) {
            if (!(track.file instanceof Blob)) continue;
            const existing = getFiles(["Music"]).some(item => item.name === track.name);
            if (!existing) await saveUserFile(["Music"], track.name, track.file, track.file.type || "audio/mpeg");
        }

        db.close();
    } catch (error) {
        console.warn("Lucid Media: no legacy library to migrate", error);
    } finally {
        localStorage.setItem("lucid-media-migrated", "1");
    }
}

function openLegacyDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("lucid-media-db", 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function setupMedia(windowElement) {
    const root = windowElement.querySelector(".lucid-media");
    const fileInput = root.querySelector("#media-file-input");

    root.querySelectorAll(".media-nav").forEach(button => button.addEventListener("click", () => switchPage(root, button.dataset.page)));
    root.querySelector("#media-import").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async event => {
        for (const file of [...event.target.files]) await saveUserFile(["Music"], file.name, file, file.type || "audio/mpeg");
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
    root.querySelector("#studio-play").addEventListener("click", () => toggleStudio(root));
    root.querySelector("#studio-clear").addEventListener("click", clearStudio);
    root.querySelector("#studio-save").addEventListener("click",()=>saveStudio(root));
    root.querySelector("#studio-export").addEventListener("click",()=>exportStudioWav(root));
    root.querySelectorAll(".studio-tool").forEach(button=>button.addEventListener("click",()=>{
    root.querySelectorAll(".studio-tool").forEach(item=>item.classList.remove("active"));
    root.querySelectorAll(".studio-section").forEach(section=>section.classList.add("hidden"));
    button.classList.add("active");
    root.querySelector(`#studio-${button.dataset.tool}`).classList.remove("hidden");
    }));

    document.addEventListener("keydown", event => {
        if (event.target.matches("input, textarea")) return;
        if (event.code === "Space") { event.preventDefault(); togglePlayback(); }
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
const sequencer=root.querySelector("#sequencer");
const tracks=[{name:"Kick",type:"drum",volume:.9},{name:"Snare",type:"drum",volume:.65},{name:"Hi-Hat",type:"hat",volume:.45},{name:"Clap",type:"clap",volume:.5},{name:"Bass",type:"bass",volume:.6},{name:"Lead",type:"lead",volume:.5},{name:"Pad",type:"pad",volume:.35}];
sequencer.innerHTML="";
tracks.forEach(track=>{
const row=document.createElement("div");
row.className="sequencer-row";
row.dataset.instrument=track.name;
row.dataset.volume=track.volume;
row.innerHTML=`<div class="sequencer-name">${track.name}</div><div class="sequencer-grid"></div>`;
const grid=row.querySelector(".sequencer-grid");
for(let step=0;step<32;step++){
const button=document.createElement("button");
button.className="sequencer-step";
button.dataset.step=step;
button.addEventListener("click",()=>{
button.classList.toggle("active");
playStudioSound(track.name,root);
});
grid.appendChild(button);
}
sequencer.appendChild(row);
});
createMelodyEditor(root);
createMixer(root);
}

function toggleStudio(root) {
initializeAudio();
if(audioContext.state==="suspended") audioContext.resume();
const button=root.querySelector("#studio-play");
if(studioTimer){
clearInterval(studioTimer);
studioTimer=null;
root.querySelectorAll(".sequencer-step").forEach(step=>step.classList.remove("playing"));
button.textContent="▶ Play";
setStudioStatus(root,"Stopped");
return;
}
studioStep=0;
const bpm=Math.max(40,Math.min(240,Number(root.querySelector("#media-bpm").value)||120));
const swing=Number(root.querySelector("#studio-swing").value)||0;
const base=60000/bpm/4;
studioTimer=setInterval(()=>{
playStudioStep(root);
studioStep=(studioStep+1)%32;
},base*(studioStep%2===1?1+swing/100:1));
button.textContent="■ Stop";
setStudioStatus(root,"Playing");
playStudioStep(root);
}
function playStudioStep(root) {
const steps=root.querySelectorAll(".sequencer-step");
steps.forEach(step=>step.classList.toggle("playing",Number(step.dataset.step)===studioStep));
root.querySelectorAll(".sequencer-row").forEach(row=>{
const step=row.querySelector(`.sequencer-step[data-step="${studioStep}"]`);
if(step?.classList.contains("active")) playStudioSound(row.dataset.instrument,root);
});
}

function playStudioSound(instrument,root) {
if(!instrument)return;
initializeAudio();
const now=audioContext.currentTime;
const gain=audioContext.createGain();
const row=root?.querySelector(`.sequencer-row[data-instrument="${instrument}"]`);
const volume=Number(row?.dataset.volume)||.5;
gain.gain.value=volume;
gain.connect(audioGain||audioContext.destination);
if(instrument==="Kick"){
const oscillator=audioContext.createOscillator();
oscillator.type="sine";
oscillator.frequency.setValueAtTime(150,now);
oscillator.frequency.exponentialRampToValueAtTime(42,now+.18);
gain.gain.setValueAtTime(volume,now);
gain.gain.exponentialRampToValueAtTime(.001,now+.2);
oscillator.connect(gain);
oscillator.start(now);
oscillator.stop(now+.21);
return;
}
if(instrument==="Snare"||instrument==="Clap"||instrument==="Hi-Hat"){
const buffer=audioContext.createBuffer(1,audioContext.sampleRate*.15,audioContext.sampleRate);
const data=buffer.getChannelData(0);
for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
const source=audioContext.createBufferSource();
const filter=audioContext.createBiquadFilter();
filter.type="highpass";
filter.frequency.value=instrument==="Hi-Hat"?5000:1200;
source.buffer=buffer;
source.connect(filter);
filter.connect(gain);
gain.gain.setValueAtTime(volume,now);
gain.gain.exponentialRampToValueAtTime(.001,now+.14);
source.start(now);
return;
}
const oscillator=audioContext.createOscillator();
oscillator.connect(gain);
if(instrument==="Bass"){
oscillator.type="sawtooth";
oscillator.frequency.value=55;
}else if(instrument==="Lead"){
oscillator.type="triangle";
oscillator.frequency.value=261.63;
}else{
oscillator.type="sine";
oscillator.frequency.value=130.81;
}
gain.gain.setValueAtTime(volume,now);
gain.gain.exponentialRampToValueAtTime(.001,now+.35);
oscillator.start(now);
oscillator.stop(now+.36);
}

function createMelodyEditor(root){
const grid=root.querySelector("#melody-grid");
const notes=["C5","B4","A4","G4","F4","E4","D4","C4"];
grid.innerHTML="";
notes.forEach(note=>{
const row=document.createElement("div");
row.className="melody-row";
row.innerHTML=`<span>${note}</span><div></div>`;
const cells=row.querySelector("div");
for(let i=0;i<32;i++){
const cell=document.createElement("button");
cell.className="melody-cell";
cell.dataset.step=i;
cell.dataset.note=note;
cell.addEventListener("click",()=>{
cells.querySelectorAll(".melody-cell").forEach(item=>item.classList.remove("active"));
cell.classList.add("active");
playMelodyNote(note,root);
});
cells.appendChild(cell);
}
grid.appendChild(row);
});
}
function playMelodyNote(note,root){
initializeAudio();
const frequencies={C4:261.63,D4:293.66,E4:329.63,F4:349.23,G4:392,A4:440,B4:493.88,C5:523.25};
const oscillator=audioContext.createOscillator();
const gain=audioContext.createGain();
oscillator.type="triangle";
oscillator.frequency.value=frequencies[note]||440;
gain.gain.setValueAtTime(.25,audioContext.currentTime);
gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.5);
oscillator.connect(gain);
gain.connect(audioGain||audioContext.destination);
oscillator.start();
oscillator.stop(audioContext.currentTime+.51);
}
function createMixer(root){
const panel=root.querySelector("#studio-mixer-panel");
panel.innerHTML="";
root.querySelectorAll(".sequencer-row").forEach(row=>{
const name=row.dataset.instrument;
const control=document.createElement("div");
control.className="mixer-channel";
control.innerHTML=`<strong>${name}</strong><input type="range" min="0" max="1" step=".01" value="${row.dataset.volume}"><span>${Math.round(Number(row.dataset.volume)*100)}%</span>`;
const slider=control.querySelector("input");
const value=control.querySelector("span");
slider.addEventListener("input",()=>{
row.dataset.volume=slider.value;
value.textContent=`${Math.round(Number(slider.value)*100)}%`;
});
panel.appendChild(control);
});
}
function setStudioStatus(root,text){
const status=root.querySelector("#studio-status");
if(status)status.textContent=text;
}

function clearStudio() {
    document.querySelectorAll(".sequencer-step").forEach(step => step.classList.remove("active"));
}

async function saveStudio(root) {
const name=prompt("Save song as:","My Song.lucidbeat");
if(!name)return;
const rows=[...root.querySelectorAll(".sequencer-row")].map(row=>({instrument:row.dataset.instrument,volume:Number(row.dataset.volume),steps:[...row.querySelectorAll(".sequencer-step")].map(step=>step.classList.contains("active"))}));
const melody=[...root.querySelectorAll(".melody-cell.active")].map(cell=>({step:Number(cell.dataset.step),note:cell.dataset.note}));
const data=JSON.stringify({version:2,name:name,bpm:Number(root.querySelector("#media-bpm").value)||120,swing:Number(root.querySelector("#studio-swing").value)||0,tracks:rows,melody},null,2);
await saveUserFile(["Music"],name.endsWith(".lucidbeat")?name:`${name}.lucidbeat`,data,"application/json");
setStudioStatus(root,"Saved");
}

async function exportStudioWav(root){
const bpm=Math.max(40,Math.min(240,Number(root.querySelector("#media-bpm").value)||120));
const duration=8;
const sampleRate=44100;
const offline=new OfflineAudioContext(2,sampleRate*duration,sampleRate);
const master=offline.createGain();
master.gain.value=.8;
master.connect(offline.destination);
const rows=[...root.querySelectorAll(".sequencer-row")];
rows.forEach(row=>{
const instrument=row.dataset.instrument;
const volume=Number(row.dataset.volume)||.5;
[...row.querySelectorAll(".sequencer-step.active")].forEach(step=>{
const time=Number(step.dataset.step)*(60/bpm/4);
scheduleOfflineSound(offline,master,instrument,volume,time);
});
});
const buffer=await offline.startRendering();
const wav=audioBufferToWav(buffer);
const blob=new Blob([wav],{type:"audio/wav"});
const url=URL.createObjectURL(blob);
const link=document.createElement("a");
link.href=url;
link.download="LucidSong.wav";
link.click();
URL.revokeObjectURL(url);
setStudioStatus(root,"WAV exported");
}
function scheduleOfflineSound(context,destination,instrument,volume,time){
const gain=context.createGain();
gain.gain.value=volume;
gain.connect(destination);
if(instrument==="Kick"){
const oscillator=context.createOscillator();
oscillator.type="sine";
oscillator.frequency.setValueAtTime(150,time);
oscillator.frequency.exponentialRampToValueAtTime(42,time+.18);
gain.gain.setValueAtTime(volume,time);
gain.gain.exponentialRampToValueAtTime(.001,time+.2);
oscillator.connect(gain);
oscillator.start(time);
oscillator.stop(time+.21);
return;
}
const oscillator=context.createOscillator();
oscillator.type=instrument==="Bass"?"sawtooth":instrument==="Lead"?"triangle":"sine";
oscillator.frequency.value=instrument==="Bass"?55:instrument==="Lead"?261.63:130.81;
gain.gain.setValueAtTime(volume,time);
gain.gain.exponentialRampToValueAtTime(.001,time+.3);
oscillator.connect(gain);
oscillator.start(time);
oscillator.stop(time+.31);
}
function audioBufferToWav(buffer){
const channels=buffer.numberOfChannels;
const length=buffer.length*channels*2+44;
const arrayBuffer=new ArrayBuffer(length);
const view=new DataView(arrayBuffer);
let offset=0;
const writeString=value=>{for(let i=0;i<value.length;i++)view.setUint8(offset++,value.charCodeAt(i));};
writeString("RIFF");
view.setUint32(offset,36+buffer.length*channels*2,true);offset+=4;
writeString("WAVE");
writeString("fmt ");
view.setUint32(offset,16,true);offset+=4;
view.setUint16(offset,1,true);offset+=2;
view.setUint16(offset,channels,true);offset+=2;
view.setUint32(offset,buffer.sampleRate,true);offset+=4;
view.setUint32(offset,buffer.sampleRate*channels*2,true);offset+=4;
view.setUint16(offset,channels*2,true);offset+=2;
view.setUint16(offset,16,true);offset+=2;
writeString("data");
view.setUint32(offset,buffer.length*channels*2,true);offset+=4;
for(let i=0;i<buffer.length;i++)for(let channel=0;channel<channels;channel++){
let sample=Math.max(-1,Math.min(1,buffer.getChannelData(channel)[i]));
view.setInt16(offset,sample<0?sample*0x8000:sample*0x7fff,true);
offset+=2;
}
return arrayBuffer;
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "0:00";
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function escapeHTML(text) {
    return String(text ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

export { createMediaApp };
