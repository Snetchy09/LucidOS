import { createWindow } from "../js/window-manager.js";
import { notifyAnomalyEngine } from "../js/anomaly-engine.js";
import { saveUserFile, deleteUserFile } from "../js/filesystem.js";

const STORAGE_KEY = "lucid_notes";
const NOTES_FOLDER = ["Documents", "Notes"];

function createNotes() {
    notifyAnomalyEngine("notes-opened");

    const content = `
        <div class="lucid-notes">
            <aside class="notes-sidebar">
                <div class="notes-header"><strong>Notes</strong><button class="notes-new" title="New note">+</button></div>
                <div class="notes-list"></div>
            </aside>
            <main class="notes-editor">
                <input class="notes-title" placeholder="Note title">
                <textarea class="notes-content" placeholder="Start writing..."></textarea>
                <div class="notes-status">Saved</div>
            </main>
        </div>
    `;

    const windowElement = createWindow("📝 Notes", content);
    const notesList = windowElement.querySelector(".notes-list");
    const titleInput = windowElement.querySelector(".notes-title");
    const contentInput = windowElement.querySelector(".notes-content");
    const status = windowElement.querySelector(".notes-status");
    const newButton = windowElement.querySelector(".notes-new");

    let notes = loadNotes();
    let currentNoteId = null;

    function loadNotes() {
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
            return Array.isArray(stored) ? stored : [];
        } catch {
            return [];
        }
    }

    async function saveNotes() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
        for (const note of notes) {
            const fileName = `${note.id}.lnote`;
            await saveUserFile(NOTES_FOLDER, fileName, JSON.stringify(note, null, 2), "application/json");
        }
    }

    function createNote() {
        const note = {
            id: Date.now().toString(),
            title: "Untitled Note",
            content: "",
            updated: Date.now()
        };

        notes.unshift(note);
        currentNoteId = note.id;
        saveNotes().catch(error => console.error("Lucid Notes save failed:", error));
        renderList();
        openNote(note);
    }

    async function deleteNote(id) {
        const note = notes.find(item => item.id === id);
        notes = notes.filter(item => item.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
        if (note) await deleteUserFile(NOTES_FOLDER, `${note.id}.lnote`).catch(() => {});

        if (currentNoteId === id) {
            currentNoteId = null;
            titleInput.value = "";
            contentInput.value = "";
        }
        renderList();
    }

    function renderList() {
        notesList.innerHTML = "";
        if (!notes.length) {
            notesList.innerHTML = '<div class="notes-empty">No notes yet</div>';
            return;
        }

        notes.forEach(note => {
            const item = document.createElement("button");
            item.className = "notes-list-item";
            if (note.id === currentNoteId) item.classList.add("active");
            item.innerHTML = `<span class="notes-item-title">${escapeHtml(note.title)}</span><span class="notes-item-preview">${escapeHtml(note.content).slice(0, 35)}</span><span class="notes-item-delete">×</span>`;
            item.addEventListener("click", event => {
                if (event.target.classList.contains("notes-item-delete")) {
                    deleteNote(note.id);
                    return;
                }
                openNote(note);
            });
            notesList.appendChild(item);
        });
    }

    function openNote(note) {
        currentNoteId = note.id;
        titleInput.value = note.title;
        contentInput.value = note.content;
        status.textContent = "Saved";
        renderList();
    }

    function updateCurrentNote() {
        if (!currentNoteId) return;
        const note = notes.find(item => item.id === currentNoteId);
        if (!note) return;

        note.title = titleInput.value || "Untitled Note";
        note.content = contentInput.value;
        note.updated = Date.now();
        status.textContent = "Saving...";
        saveNotes().then(() => {
            status.textContent = "Saved";
            renderList();
        }).catch(() => {
            status.textContent = "Save failed";
        });

        notifyAnomalyEngine("note-edited", { noteId: note.id });
    }

    titleInput.addEventListener("input", updateCurrentNote);
    contentInput.addEventListener("input", updateCurrentNote);
    newButton.addEventListener("click", createNote);

    function escapeHtml(text) {
        const element = document.createElement("div");
        element.textContent = text;
        return element.innerHTML;
    }

    renderList();
    if (notes.length) openNote(notes[0]);
    else createNote();

    return windowElement;
}

export { createNotes };