import { createWindow } from "../js/window-manager.js";
import { notifyAnomalyEngine } from "../js/anomaly-engine.js";

const STORAGE_KEY = "lucid_notes";

function createNotes() {
    notifyAnomalyEngine("notes-opened");

    const content = `
        <div class="lucid-notes">
            <aside class="notes-sidebar">
                <div class="notes-header">
                    <strong>Notes</strong>
                    <button class="notes-new" title="New note">+</button>
                </div>
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
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        } catch {
            return [];
        }
    }

    function saveNotes() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    }

    function createNote() {
        const note = {
            id: Date.now().toString(),
            title: "Untitled Note",
            content: "",
            updated: Date.now()
        };

        notes.unshift(note);
        saveNotes();
        currentNoteId = note.id;
        renderList();
        openNote(note);
    }

    function deleteNote(id) {
        notes = notes.filter(note => note.id !== id);
        saveNotes();

        if (currentNoteId === id) {
            currentNoteId = null;
            titleInput.value = "";
            contentInput.value = "";
        }

        renderList();
    }

    function renderList() {
        notesList.innerHTML = "";

        if (notes.length === 0) {
            const empty = document.createElement("div");
            empty.className = "notes-empty";
            empty.textContent = "No notes yet";
            notesList.appendChild(empty);
            return;
        }

        notes.forEach(note => {
            const item = document.createElement("button");
            item.className = "notes-list-item";

            if (note.id === currentNoteId) {
                item.classList.add("active");
            }

            item.innerHTML = `
                <span class="notes-item-title">${escapeHtml(note.title)}</span>
                <span class="notes-item-preview">${escapeHtml(note.content).slice(0, 35)}</span>
                <span class="notes-item-delete">×</span>
            `;

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

        saveNotes();

        status.textContent = "Saving...";
        setTimeout(() => {
            status.textContent = "Saved";
        }, 300);

        renderList();

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

    if (notes.length > 0) {
        openNote(notes[0]);
    } else {
        createNote();
    }

    return windowElement;
}

export { createNotes };