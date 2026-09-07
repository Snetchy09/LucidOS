import { createWindow } from "../js/window-manager.js";
import { supabase, getCurrentUser, signUpDeveloper, signOutDeveloper } from "../js/lucid-store-api.js";
import { runLucidScript, buildManifest } from "./lucid-script-runtime.js";
import { createProject, getProjects, getProject, getActiveProject, setActiveProject, saveProjectSource, renameProject, deleteProject, duplicateProject, projectLanguageLabel } from "./lucid-projects.js";
function createLucidStudio() {
    const content = `
        <div class="lucid-studio">
            <header class="studio-header">
                <div>
                    <div class="studio-eyebrow">LUCID DEVELOPER</div>
                    <h1>Lucid studio</h1>
                    <p>Create applications and 2D games for Lucid OS.</p>
                </div>
            </header>
            <main class="studio-body" id="studio-body"></main>
        </div>
    `;
    const windowElement = createWindow("Lucid Studio", content);
    setupLucidStudio(windowElement);
    return windowElement;
}
async function setupLucidStudio(windowElement) {
    const root = windowElement.querySelector(".lucid-studio");
    const body = root.querySelector("#studio-body");
    body.innerHTML = '<div class="studio-loading">Checking developer account...</div>';
    try {
        const user = await getCurrentUser();
        if (!user) { renderAuth(root); return; }
        renderStudioProjects(root);
    } catch (error) {
        console.error("Lucid Studio account check failed:", error);
        body.innerHTML = `
            <section class="studio-error">
                <div class="studio-error-icon">!</div>
                <h2>Developer account unavailable</h2>
                <p>Lucid couldn't verify your account.</p>
                <button class="studio-primary-button" id="studio-retry">Try again</button>
            </section>
        `;
        body.querySelector("#studio-retry").addEventListener("click", () => setupLucidStudio(windowElement));
    }
}
function renderAuth(root) {
    const body = root.querySelector("#studio-body");
    body.innerHTML = `
        <section class="studio-auth">
            <div class="studio-auth-card">
                <div class="studio-auth-tabs">
                    <button class="studio-auth-tab active" data-mode="signup">Create account</button>
                    <button class="studio-auth-tab" data-mode="signin">Sign in</button>
                </div>
                <div class="studio-auth-form" id="studio-auth-form"></div>
            </div>
        </section>
    `;
    setupAuthTabs(root);
    renderAuthForm(root, "signup");
}
function setupAuthTabs(root) {
    root.querySelectorAll(".studio-auth-tab").forEach(button => {
        button.addEventListener("click", () => {
            root.querySelectorAll(".studio-auth-tab").forEach(item => item.classList.remove("active"));
            button.classList.add("active");
            renderAuthForm(root, button.dataset.mode);
        });
    });
}
function renderAuthForm(root, mode) {
    const form = root.querySelector("#studio-auth-form");
    const signup = mode === "signup";
    form.innerHTML = `
        <h2>${signup ? "Create your developer identity" : "Welcome back"}</h2>
        ${signup ? `
            <label>Username<input id="studio-username" type="text" maxlength="32" autocomplete="username"></label>
            <label>Display name<input id="studio-display-name" type="text" maxlength="48"></label>
        ` : ""}
        <label>Email<input id="studio-email" type="email" autocomplete="email"></label>
        <label>Password<input id="studio-password" type="password" autocomplete="${signup ? "new-password" : "current-password"}"></label>
        ${signup ? `
            <div class="studio-security-warning">
                <strong>Security notice</strong>
                <span>Lucid is an online service, so no account system can guarantee zero security risk. Use a unique password that you do not use on other websites.</span>
            </div>
        ` : ""}
        <button id="studio-auth-submit" class="studio-primary-button">${signup ? "Create account" : "Sign in"}</button>
        <div id="studio-auth-message" class="studio-auth-message"></div>
    `;
    form.querySelector("#studio-auth-submit").addEventListener("click", () => signup ? createDeveloperAccount(root) : signInDeveloper(root));
}
function renderStudioProjects(root) {
    const projects = getProjects();
    const body = root.querySelector("#studio-body");
    body.innerHTML = `
        <div class="studio-projects">
            <div class="studio-projects-header">
                <div>
                    <div class="studio-section-eyebrow">LUCID STUDIO</div>
                    <h1>My Projects</h1>
                    <p>Create, edit and build your Lucid applications and games.</p>
                </div>
                <button class="studio-primary-btn" id="studio-new-project">+ New Project</button>
            </div>
            <div class="studio-project-grid">
                ${projects.length ? projects.map(project => `
                    <article class="studio-project-card" data-project-id="${escapeHTML(project.id)}">
                        <div class="studio-project-icon">◇</div>
                        <div class="studio-project-info">
                            <h3>${escapeHTML(project.name)}</h3>
                            <p>${escapeHTML(projectLanguageLabel(project.language))}</p>
                            <span>Updated ${formatStudioDate(project.updatedAt)}</span>
                        </div>
                        <div class="studio-project-actions">
                            <button class="studio-project-open" data-project-id="${escapeHTML(project.id)}">Open</button>
                            <button class="studio-project-more" data-project-id="${escapeHTML(project.id)}" title="Project options">⋯</button>
                        </div>
                    </article>
                `).join("") : `
                    <div class="studio-project-empty">
                        <div class="studio-empty-icon">◇</div>
                        <h2>No projects yet</h2>
                        <p>Create your first Lucid application or game to start building.</p>
                        <button class="studio-primary-btn" id="studio-empty-new-project">Create your first project</button>
                    </div>
                `}
            </div>
        </div>
    `;
    root.querySelector("#studio-new-project")?.addEventListener("click", () => showNewProjectDialog(root));
    root.querySelector("#studio-empty-new-project")?.addEventListener("click", () => showNewProjectDialog(root));
    root.querySelectorAll(".studio-project-open").forEach(button => button.addEventListener("click", () => { const project = getProject(button.dataset.projectId); if (!project) return; setActiveProject(project.id); openLucidScriptEditor(root, project); }));
    root.querySelectorAll(".studio-project-more").forEach(button => button.addEventListener("click", () => { const project = getProject(button.dataset.projectId); if (!project) return; showProjectMenu(root, project); }));
}
function showProjectMenu(root, project) {
    const overlay = document.createElement("div");
    overlay.className = "studio-dialog-overlay";
    overlay.innerHTML = `
        <div class="studio-dialog">
            <div class="studio-dialog-header">
                <div><h2>${escapeHTML(project.name)}</h2><p>Project options</p></div>
                <button class="studio-dialog-close">×</button>
            </div>
            <button class="studio-menu-action" id="rename-project">Rename</button>
            <button class="studio-menu-action" id="duplicate-project">Duplicate</button>
            <button class="studio-menu-action danger" id="delete-project">Delete project</button>
        </div>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector(".studio-dialog-close").addEventListener("click", close);
    overlay.querySelector("#rename-project").addEventListener("click", () => { close(); renameStudioProject(root, project); });
    overlay.querySelector("#duplicate-project").addEventListener("click", () => { duplicateProject(project.id); close(); renderStudioProjects(root); });
    overlay.querySelector("#delete-project").addEventListener("click", () => { if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return; deleteProject(project.id); close(); renderStudioProjects(root); });
}
function renameStudioProject(root, project) { const newName = prompt("Project name:", project.name); if (newName === null) return; const cleanName = newName.trim(); if (!cleanName) return; renameProject(project.id, cleanName); renderStudioProjects(root); }
function formatStudioDate(dateString) { if (!dateString) return "unknown"; try { return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(dateString)); } catch { return "unknown"; } }
function showNewProjectDialog(root) {
    const overlay = document.createElement("div");
    overlay.className = "studio-dialog-overlay";
    overlay.innerHTML = `
        <div class="studio-dialog" role="dialog" aria-modal="true">
            <div class="studio-dialog-header"><div><h2>New Project</h2><p>Start a new Lucid application or game.</p></div><button class="studio-dialog-close">×</button></div>
            <label>App name<input id="new-project-name" type="text" placeholder="My App" maxlength="80" autocomplete="off"></label>
            <label>Language<select id="new-project-language"><option value="lucid-script">Lucid Script</option><option value="javascript">JavaScript</option><option value="html">HTML + CSS + JS</option></select></label>
            <div class="studio-dialog-note"><strong>Lucid Script</strong> now supports native UI and a 2D game canvas with keyboard, mouse, entities, collision, sprites, gravity, audio and a frame loop.</div>
            <div class="studio-dialog-actions"><button class="studio-secondary-btn" id="cancel-new-project">Cancel</button><button class="studio-primary-btn" id="create-new-project">Create Project</button></div>
        </div>
    `;
    document.body.appendChild(overlay);
    const nameInput = overlay.querySelector("#new-project-name");
    const languageInput = overlay.querySelector("#new-project-language");
    const close = () => overlay.remove();
    overlay.querySelector(".studio-dialog-close").addEventListener("click", close);
    overlay.querySelector("#cancel-new-project").addEventListener("click", close);
    overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
    overlay.querySelector("#create-new-project").addEventListener("click", () => { const name = nameInput.value.trim(); if (!name) { nameInput.focus(); nameInput.classList.add("studio-input-error"); return; } const project = createProject({ name, language: languageInput.value }); close(); openProjectByLanguage(root, project); });
    setTimeout(() => nameInput.focus(), 0);
}
function openProjectByLanguage(root, project) {
    setActiveProject(project.id);
    if (project.language === "lucid-script") { openLucidScriptEditor(root, project); return; }
    if (project.language === "javascript" || project.language === "html") {
        root.innerHTML = `<div class="studio-coming-soon"><div class="studio-coming-icon">◇</div><h2>${escapeHTML(projectLanguageLabel(project.language))}</h2><p>This editor is coming soon.</p><button class="studio-secondary-btn" id="return-projects">Back to Projects</button></div>`;
        root.querySelector("#return-projects")?.addEventListener("click", () => renderStudioProjects(root));
    }
}
async function createDeveloperAccount(root) {
    const username = root.querySelector("#studio-username").value.trim();
    const displayName = root.querySelector("#studio-display-name").value.trim();
    const email = root.querySelector("#studio-email").value.trim();
    const password = root.querySelector("#studio-password").value;
    const message = root.querySelector("#studio-auth-message");
    if (!username || !displayName || !email || !password) { message.textContent = "Please complete every field."; return; }
    if (password.length < 8) { message.textContent = "Your password must be at least 8 characters."; return; }
    try {
        message.textContent = "Creating account...";
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username, display_name: displayName } } });
        if (error) throw error;
        if (!data.user) throw new Error("Account creation failed.");
        if (!data.session) { message.textContent = "Account created. Check your email to confirm your account."; return; }
        renderStudioProjects(root);
    } catch (error) { console.error("Lucid Developer signup:", error); message.textContent = error.message || "Unable to create the account."; }
}
async function signInDeveloper(root) {
    const email = root.querySelector("#studio-email").value.trim();
    const password = root.querySelector("#studio-password").value;
    const message = root.querySelector("#studio-auth-message");
    if (!email || !password) { message.textContent = "Enter your email and password."; return; }
    try { message.textContent = "Signing in..."; const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; renderStudioProjects(root); }
    catch (error) { console.error("Lucid Developer login:", error); message.textContent = error.message || "Unable to sign in."; }
}
function renderDashboard(root, user) {
    const body = root.querySelector("#studio-body");
    const displayName = user.user_metadata?.display_name || user.user_metadata?.username || "Developer";
    body.innerHTML = `
        <section class="studio-dashboard">
            <div class="studio-welcome"><span>Developer workspace</span><h2>Welcome, ${escapeHTML(displayName)}</h2><p>Build something for Lucid OS.</p></div>
            <div class="studio-dashboard-grid">
                <button class="studio-dashboard-card" id="studio-new-app"><span class="studio-card-icon">＋</span><strong>New app</strong><span>Start a new Lucid project.</span></button>
                <button class="studio-dashboard-card" id="studio-projects"><span class="studio-card-icon">📁</span><strong>My Projects</strong><span>View and manage your projects.</span></button>
                <button class="studio-dashboard-card" id="studio-docs"><span class="studio-card-icon">?</span><strong>Lucid Script Docs</strong><span>Learn apps, games and the language.</span></button>
                <button class="studio-dashboard-card" id="studio-submissions"><span class="studio-card-icon">↑</span><strong>My submissions</strong><span>Track submitted applications.</span></button>
                <button class="studio-dashboard-card" id="studio-signout"><span class="studio-card-icon">↪</span><strong>Sign out</strong><span>End your Lucid developer session.</span></button>
            </div>
        </section>
    `;
    root.querySelector("#studio-docs").addEventListener("click", () => renderLucidScriptDocs(root));
    root.querySelector("#studio-new-app")?.addEventListener("click", () => showNewProjectDialog(root));
    root.querySelector("#studio-projects")?.addEventListener("click", () => renderStudioProjects(root));
    root.querySelector("#studio-signout").addEventListener("click", async () => { await supabase.auth.signOut(); renderAuth(root); });
    root.querySelector("#studio-submissions").addEventListener("click", () => renderSubmissions(root));
}
async function renderSubmissions(root) {
    const body = root.querySelector("#studio-body");
    body.innerHTML = `<section class="studio-submissions"><button class="studio-back-button" id="studio-submissions-back">← Back</button><div class="studio-submissions-header"><div class="studio-eyebrow">DEVELOPER</div><h2>My submissions</h2><p>Track your Lucid applications.</p></div><div id="studio-submission-list" class="studio-submission-list">Loading submissions...</div></section>`;
    root.querySelector("#studio-submissions-back").addEventListener("click", async () => { const user = await getCurrentUser(); if (user) renderDashboard(root, user); });
    const list = root.querySelector("#studio-submission-list");
    const user = await getCurrentUser();
    if (!user) { list.textContent = "You are not signed in."; return; }
    const { data, error } = await supabase.from("lucid_app_submissions").select(`id, name, description, category, version, status, rejection_reason, submitted_at, reviewed_at`).eq("developer_id", user.id).order("submitted_at", { ascending: false });
    if (error) { console.error("Lucid submissions:", error); list.textContent = "Unable to load your submissions."; return; }
    if (!data.length) { list.innerHTML = '<div class="studio-no-submissions">You haven\'t submitted any apps yet.</div>'; return; }
    list.innerHTML = "";
    data.forEach(submission => { const item = document.createElement("article"); item.className = "studio-submission"; item.innerHTML = `<div><h3>${escapeHTML(submission.name)}</h3><span>v${escapeHTML(submission.version)} · ${escapeHTML(submission.category)}</span></div><strong class="submission-status submission-status-${escapeHTML(submission.status)}">${escapeHTML(submission.status)}</strong>`; list.appendChild(item); });
}
function renderLucidScriptDocs(root) {
    const body = root.querySelector("#studio-body");
    body.innerHTML = `
        <section class="studio-docs">
            <button class="studio-back-button" id="studio-docs-back">← Back</button>
            <div class="studio-docs-content">
                <div class="studio-eyebrow">LUCID SCRIPT</div>
                <h2>Lucid Script</h2>
                <p>Build real Lucid OS apps and 2D games without leaving Studio.</p>
                <h3>First app</h3>
                <pre><code>app "Hello"
window {
    title "Hello"
    heading "Hello from Lucid"
    text "Welcome to Lucid OS"
}</code></pre>
                <h3>State and logic</h3>
                <pre><code>let score = 0
let enabled = true
button "Add point" {
    onClick {
        set score = score + 1
    }
}
text "Score: {score}"</code></pre>
                <h3>Values</h3>
                <p>Lucid Script supports numbers, strings, booleans, null, arrays and objects.</p>
                <pre><code>let colors = ["Red", "Green", "Blue"]
let player = { name: "Nova", level: 4 }
text player.name</code></pre>
                <h3>Conditions</h3>
                <pre><code>if score >= 10 {
    notification.show("You won")
} else {
    notification.show("Keep playing")
}</code></pre>
                <h3>Loops</h3>
                <pre><code>repeat 3 {
    notification.show("Hello")
}
each color in colors {
    text color
}</code></pre>
                <h3>Functions</h3>
                <pre><code>function add(a, b) {
    return a + b
}
let total = add(10, 5)
text total</code></pre>
                <h3>Inputs</h3>
                <pre><code>let name = "Player"
input "Your name" {
    onInput {
        set name = event.value
    }
}
text "Hello, {name}"</code></pre>
                <h3>Checkboxes and selects</h3>
                <pre><code>checkbox "Music" {
    onChange {
        if event.checked {
            audio.beep(600, 0.05)
        }
    }
}
select "Pick a color" {
    option "Red"
    option "Green"
    option "Blue"
    onChange {
        notification.show(event.value)
    }
}</code></pre>
                <h3>Storage</h3>
                <pre><code>storage.set("highScore", 120)
let highScore = storage.get("highScore", 0)
storage.remove("highScore")</code></pre>
                <h3>Files and utilities</h3>
                <pre><code>files.write("note.txt", "Hello")
let note = files.read("note.txt")
let number = random.integer(1, 100)
let upper = string.upper("lucid")
let rounded = math.round(4.7)
audio.beep(700, 0.08)</code></pre>
                <h3>2D games</h3>
                <p>Use <code>game</code> for a real canvas loop. It supports entities, keyboard, mouse, movement, collision, sprites, gravity, text and pause controls.</p>
                <pre><code>app "Box Game"
window {
    title "Box Game"
    let score = 0
    game {
        size 640, 360
        background "#11131a"
        box "player" {
            x 80
            y 150
            width 40
            height 40
            color "#ffffff"
        }
        box "coin" {
            x 400
            y 150
            width 24
            height 24
            color "#ffd84d"
        }
        gameText "Score: {score}" {
            x 20
            y 35
            size 24
            color "#ffffff"
        }
        onUpdate {
            if game.key("ArrowRight") {
                game.move("player", 240 * event.delta, 0)
            }
            if game.key("ArrowLeft") {
                game.move("player", -240 * event.delta, 0)
            }
            if game.key("ArrowUp") {
                game.move("player", 0, -240 * event.delta)
            }
            if game.key("ArrowDown") {
                game.move("player", 0, 240 * event.delta)
            }
            if game.collides("player", "coin") {
                set score = score + 1
                game.set("coin", "x", random.integer(40, 580))
                game.set("coin", "y", random.integer(60, 320))
                audio.beep(750, 0.05)
            }
        }
        onKeyDown {
            if event.key == "Space" {
                audio.beep(900, 0.04)
            }
        }
    }
}</code></pre>
                <h3>Game entities</h3>
                <p><code>box</code> draws rectangles. <code>circle</code> draws circles. <code>sprite</code> draws an image. <code>gameText</code> draws canvas text. <code>line</code> draws a line.</p>
                <pre><code>circle "ball" {
    x 300
    y 180
    radius 20
    color "#55ddff"
}
sprite "hero" {
    x 100
    y 100
    width 64
    height 64
    src "https://example.com/hero.png"
}</code></pre>
                <h3>Game events</h3>
                <pre><code>onUpdate {
    game.move("player", 100 * event.delta, 0)
}
onKeyDown {
    if event.key == "Space" {
        notification.show("Jump")
    }
}
onMouseDown {
    notification.show("Mouse: " + event.x + ", " + event.y)
}</code></pre>
                <h3>Collision and entities</h3>
                <pre><code>if game.collides("player", "enemy") {
    set health = health - 1
}
game.move("player", 5, 0)
game.set("player", "color", "#ff5577")
let x = game.get("player", "x", 0)
let pos = game.position("player")
game.remove("coin")</code></pre>
                <h3>Gravity</h3>
                <pre><code>box "ball" {
    x 100
    y 30
    width 30
    height 30
    gravity 700
}</code></pre>
                <h3>Timers and audio</h3>
                <pre><code>function beep() {
    audio.beep(500, 0.05)
}
timer.after(1000, "beep")</code></pre>
                <h3>Game controls</h3>
                <pre><code>game.pause()
game.resume()
game.toggle()
let width = game.width()
let mouseX = game.mouseX()</code></pre>
                <h3>Project build</h3>
                <p>Press <strong>Run</strong> to execute the app, then <strong>Build</strong> to validate it and export a <code>.lucidpkg</code> package with a Lucid app manifest.</p>
                <div class="studio-docs-note"><strong>What Lucid Script is for</strong><br><br>Use it for utilities, dashboards, tools, interactive interfaces, creative experiments and 2D games. The language is intentionally smaller than JavaScript, but it is no longer limited to static examples or button demos.</div>
            </div>
        </section>
    `;
    root.querySelector("#studio-docs-back").addEventListener("click", () => renderStudioProjects(root));
}
function openLucidScriptEditor(root, project = null) {
    if (!project) project = getActiveProject();
    if (!project) project = createProject({ name: "Untitled App", language: "lucid-script" });
    setActiveProject(project.id);
    const body = root.querySelector("#studio-body");
    body.innerHTML = `
        <section class="studio-editor">
            <div class="studio-editor-toolbar">
                <div class="studio-editor-project"><button id="studio-back-projects" title="Back to projects" aria-label="Back to projects">←</button><div><strong id="studio-editor-project-name">${escapeHTML(project.name)}</strong><small>Lucid Script</small></div></div>
                <div class="studio-editor-actions"><button id="studio-editor-docs" class="studio-secondary-btn">Docs</button><button id="studio-editor-manifest" class="studio-secondary-btn">Manifest</button><button id="studio-save" class="studio-secondary-btn">Save</button><button id="studio-run" class="studio-primary-btn">Run</button><button id="studio-build" class="studio-secondary-btn">Build</button></div>
            </div>
            <div class="studio-editor-layout">
                <div class="studio-code-panel"><div class="studio-code-label"><span>main.lucid</span><span>Lucid Script</span></div><div class="lucid-editor"><div id="lucid-line-numbers" class="lucid-line-numbers" aria-hidden="true">1</div><textarea id="lucid-code" spellcheck="false" wrap="off" autocomplete="off" autocorrect="off" autocapitalize="off"></textarea></div></div>
                <div class="studio-preview-panel"><div class="studio-preview-label">Preview</div><div id="lucid-preview" class="lucid-preview"><div class="studio-preview-empty">Press ▶ Run to preview your app or game.</div></div></div>
            </div>
            <div class="studio-editor-footer"><div id="studio-editor-status" class="studio-editor-status">Ready</div><div id="studio-editor-permissions" class="studio-editor-permissions">Permissions: none</div></div>
        </section>
    `;
    const codeEditor = root.querySelector("#lucid-code");
    const saveButton = root.querySelector("#studio-save");
    const statusElement = root.querySelector("#studio-editor-status");
    const lineNumbers = root.querySelector("#lucid-line-numbers");
    codeEditor.value = project.source || "";
    updateLineNumbers();
    function updateLineNumbers() {
        const value = codeEditor.value;
        let lineCount = 1;
        for (let i = 0; i < value.length; i++) if (value.charCodeAt(i) === 10) lineCount++;
        if (lineCount === lastLineCount) return;
        lastLineCount = lineCount;
        const parts = new Array(lineCount);
        for (let i = 0; i < lineCount; i++) parts[i] = i + 1;
        lineNumbers.textContent = parts.join("\n");
    }
    function saveCurrentStudioProject() { saveProjectSource(project.id, codeEditor.value); project = getProject(project.id); if (statusElement) statusElement.textContent = "Saved"; saveButton?.classList.add("studio-saved"); setTimeout(() => saveButton?.classList.remove("studio-saved"), 700); }
    root.querySelector("#studio-back-projects")?.addEventListener("click", () => { saveCurrentStudioProject(); renderStudioProjects(root); });
    root.querySelector("#studio-editor-docs")?.addEventListener("click", () => { saveCurrentStudioProject(); renderLucidScriptDocs(root); });
    root.querySelector("#studio-editor-manifest")?.addEventListener("click", () => { saveCurrentStudioProject(); showStudioManifest(root); });
    root.querySelector("#studio-run")?.addEventListener("click", async () => { saveCurrentStudioProject(); await runStudioCode(root); });
    root.querySelector("#studio-build")?.addEventListener("click", async () => { saveCurrentStudioProject(); await buildLucidProject(root, project); });
    saveButton?.addEventListener("click", saveCurrentStudioProject);
    let autoSaveTimer = null;
    let lastLineCount = -1;
    let lineNumbersRaf = 0;
    codeEditor.addEventListener("input", () => { if (!lineNumbersRaf) lineNumbersRaf = requestAnimationFrame(() => { lineNumbersRaf = 0; updateLineNumbers(); }); if (statusElement) statusElement.textContent = "Unsaved changes"; clearTimeout(autoSaveTimer); autoSaveTimer = setTimeout(() => saveCurrentStudioProject(), 700); });
    codeEditor.addEventListener("scroll", () => { if (lineNumbers.scrollTop !== codeEditor.scrollTop) lineNumbers.scrollTop = codeEditor.scrollTop; }, { passive: true });
    codeEditor.addEventListener("keydown", event => {
        if (event.key === "Tab") { event.preventDefault(); const start = codeEditor.selectionStart; const end = codeEditor.selectionEnd; const value = codeEditor.value; codeEditor.value = value.slice(0, start) + "    " + value.slice(end); codeEditor.selectionStart = start + 4; codeEditor.selectionEnd = start + 4; lastLineCount = -1; codeEditor.dispatchEvent(new Event("input")); return; }
        if (event.key === "Enter") { event.preventDefault(); const start = codeEditor.selectionStart; const value = codeEditor.value; const currentLine = value.slice(0, start).split("\n").pop(); const indentation = currentLine.match(/^[ \t]*/)?.[0] || ""; let nextIndent = indentation; if (currentLine.trimEnd().endsWith("{")) nextIndent += "    "; if (value.slice(start).startsWith("}") && nextIndent.endsWith("    ")) nextIndent = nextIndent.slice(0, -4); codeEditor.value = value.slice(0, start) + "\n" + nextIndent + value.slice(start); const newPosition = start + 1 + nextIndent.length; codeEditor.selectionStart = newPosition; codeEditor.selectionEnd = newPosition; lastLineCount = -1; codeEditor.dispatchEvent(new Event("input")); return; }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); saveCurrentStudioProject(); return; }
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); saveCurrentStudioProject(); runStudioCode(root); }
    });
}
function runStudioCode(root) {
    const editor = root.querySelector("#lucid-code");
    const preview = root.querySelector("#lucid-preview");
    const status = root.querySelector("#studio-editor-status");
    const code = editor.value;
    preview.innerHTML = "";
    try { const result = runLucidScript(code, preview, { permissions: [] }); status.textContent = `Running: ${result.appName}`; }
    catch (error) { console.error("Lucid Script:", error); preview.innerHTML = `<div class="lucid-runtime-error"><strong>Build error</strong><span>${escapeHTML(error.message)}</span></div>`; status.textContent = "Build failed"; }
}
function showStudioManifest(root) {
    const code = root.querySelector("#lucid-code").value;
    let name = "Untitled App";
    const match = code.match(/^\s*app\s+["'](.+?)["']/m);
    if (match) name = match[1];
    const manifest = buildManifest({ id: slugify(name), name, version: "1.0.0", description: "A Lucid Script application.", permissions: [] });
    root.querySelector("#lucid-preview").innerHTML = `<div class="studio-manifest-view"><div class="studio-manifest-title">App Manifest</div><pre>${escapeHTML(JSON.stringify(manifest, null, 2))}</pre></div>`;
    root.querySelector("#studio-editor-status").textContent = "Manifest generated.";
}
function slugify(text) { return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "lucid-app"; }
function showStudioMessage(root, message) { const status = root.querySelector("#studio-editor-status"); if (status) { status.textContent = message; return; } const messageElement = document.createElement("div"); messageElement.className = "studio-auth-message"; messageElement.textContent = message; root.querySelector("#studio-body").appendChild(messageElement); }
async function buildLucidProject(root, project = null) {
    if (!project) project = getActiveProject();
    const code = root.querySelector("#lucid-code").value;
    const status = root.querySelector("#studio-editor-status");
    try {
        const testMount = document.createElement("div");
        testMount.style.display = "none";
        document.body.appendChild(testMount);
        const result = runLucidScript(code, testMount);
        testMount.remove();
        const manifest = buildManifest({ id: slugify(result.appName), name: result.appName, version: "1.0.0", description: "A Lucid Script application.", permissions: [] });
        const packageData = { manifest, source: { "main.lucid": code } };
        const blob = new Blob([JSON.stringify(packageData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${manifest.id}.lucidpkg`;
        link.textContent = "Export .lucidpkg";
        link.className = "studio-export-button";
        const preview = root.querySelector("#lucid-preview");
        preview.innerHTML = `<div class="studio-build-success"><div class="studio-build-icon">✓</div><h3>Build successful</h3><p>${escapeHTML(manifest.name)} · v${escapeHTML(manifest.version)}</p><div class="studio-build-manifest">Valid Lucid application</div></div>`;
        preview.querySelector(".studio-build-success").appendChild(link);
        status.textContent = "Build successful.";
    } catch (error) { root.querySelector("#studio-editor-status").textContent = "Build failed."; console.error(error); }
}
function escapeHTML(text) { return String(text ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
export { createLucidStudio };