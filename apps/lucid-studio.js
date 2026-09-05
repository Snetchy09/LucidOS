import { createWindow } from "../js/window-manager.js";
import { supabase, getCurrentUser, signUpDeveloper, signInDeveloper, signOutDeveloper } from "../js/lucid-store-api.js";
import { runLucidScript, buildManifest } from "./lucid-script-runtime.js";
import { createProject, getProjects, getProject, getActiveProject, setActiveProject, saveProjectSource, renameProject, deleteProject, duplicateProject, projectLanguageLabel } from "./lucid-projects.js";

function createLucidStudio() {
    const content = `
        <div class="lucid-studio">
            <header class="studio-header">
                <div>
                    <div class="studio-eyebrow">LUCID DEVELOPER</div>
                    <h1>Lucid studio</h1>
                    <p>Create applications for Lucid OS.</p>
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

    form.querySelector("#studio-auth-submit").addEventListener("click", () => {
        if (signup) createDeveloperAccount(root);
        else signInDeveloper(root);
    });
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
                    <p>Create, edit and build your Lucid applications.</p>
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
                        <p>Create your first Lucid application to start building.</p>
                        <button class="studio-primary-btn" id="studio-empty-new-project">Create your first project</button>
                    </div>
                `}
            </div>
        </div>
    `;

    const newButton = root.querySelector("#studio-new-project");
    const emptyNewButton = root.querySelector("#studio-empty-new-project");
    newButton?.addEventListener("click", () => showNewProjectDialog(root));
    emptyNewButton?.addEventListener("click", () => showNewProjectDialog(root));

    root.querySelectorAll(".studio-project-open").forEach(button => {
        button.addEventListener("click", () => {
            const project = getProject(button.dataset.projectId);
            if (!project) return;
            setActiveProject(project.id);
            openLucidScriptEditor(root, project);
        });
    });

    root.querySelectorAll(".studio-project-more").forEach(button => {
        button.addEventListener("click", () => {
            const project = getProject(button.dataset.projectId);
            if (!project) return;
            showProjectMenu(root, project);
        });
    });
}

function showProjectMenu(root, project) {
    const overlay = document.createElement("div");
    overlay.className = "studio-dialog-overlay";
    overlay.innerHTML = `
        <div class="studio-dialog">
            <div class="studio-dialog-header">
                <div>
                    <h2>${escapeHTML(project.name)}</h2>
                    <p>Project options</p>
                </div>
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
    overlay.querySelector("#duplicate-project").addEventListener("click", () => {
        const copy = duplicateProject(project.id);
        close();
        renderStudioProjects(root);
    });
    overlay.querySelector("#delete-project").addEventListener("click", () => {
        const confirmed = confirm(`Delete "${project.name}"? This cannot be undone.`);
        if (!confirmed) return;
        deleteProject(project.id);
        close();
        renderStudioProjects(root);
    });
}

function renameStudioProject(root, project) {
    const newName = prompt("Project name:", project.name);
    if (newName === null) return;
    const cleanName = newName.trim();
    if (!cleanName) return;
    renameProject(project.id, cleanName);
    renderStudioProjects(root);
}

function formatStudioDate(dateString) {
    if (!dateString) return "unknown";
    try {
        return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(dateString));
    } catch { return "unknown"; }
}

function showNewProjectDialog(root) {
    const overlay = document.createElement("div");
    overlay.className = "studio-dialog-overlay";
    overlay.innerHTML = `
        <div class="studio-dialog" role="dialog" aria-modal="true">
            <div class="studio-dialog-header">
                <div>
                    <h2>New Project</h2>
                    <p>Start a new Lucid application.</p>
                </div>
                <button class="studio-dialog-close">×</button>
            </div>
            <label>App name<input id="new-project-name" type="text" placeholder="My App" maxlength="80" autocomplete="off"></label>
            <label>Language<select id="new-project-language">
                <option value="lucid-script">Lucid Script</option>
                <option value="javascript">JavaScript</option>
                <option value="html">HTML + CSS + JS</option>
            </select></label>
            <div class="studio-dialog-note"><strong>Lucid Script</strong> is the recommended choice for new Lucid apps.</div>
            <div class="studio-dialog-actions">
                <button class="studio-secondary-btn" id="cancel-new-project">Cancel</button>
                <button class="studio-primary-btn" id="create-new-project">Create Project</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const nameInput = overlay.querySelector("#new-project-name");
    const languageInput = overlay.querySelector("#new-project-language");
    const close = () => overlay.remove();

    overlay.querySelector(".studio-dialog-close").addEventListener("click", close);
    overlay.querySelector("#cancel-new-project").addEventListener("click", close);
    overlay.addEventListener("click", event => { if (event.target === overlay) close(); });

    overlay.querySelector("#create-new-project").addEventListener("click", () => {
        const name = nameInput.value.trim();
        if (!name) { nameInput.focus(); nameInput.classList.add("studio-input-error"); return; }
        const project = createProject({ name, language: languageInput.value });
        close();
        openProjectByLanguage(root, project);
    });

    setTimeout(() => nameInput.focus(), 0);
}

function openProjectByLanguage(root, project) {
    setActiveProject(project.id);
    if (project.language === "lucid-script") {
        openLucidScriptEditor(root, project);
        return;
    }
    if (project.language === "javascript" || project.language === "html") {
        root.innerHTML = `
            <div class="studio-coming-soon">
                <div class="studio-coming-icon">◇</div>
                <h2>${escapeHTML(projectLanguageLabel(project.language))}</h2>
                <p>This editor is coming soon.</p>
                <button class="studio-secondary-btn" id="return-projects">Back to Projects</button>
            </div>
        `;
        root.querySelector("#return-projects")?.addEventListener("click", () => renderStudioProjects(root));
    }
}

async function createDeveloperAccount(root) {
    const username = root.querySelector("#studio-username").value.trim();
    const displayName = root.querySelector("#studio-display-name").value.trim();
    const email = root.querySelector("#studio-email").value.trim();
    const password = root.querySelector("#studio-password").value;
    const message = root.querySelector("#studio-auth-message");

    if (!username || !displayName || !email || !password) {
        message.textContent = "Please complete every field.";
        return;
    }
    if (password.length < 8) {
        message.textContent = "Your password must be at least 8 characters.";
        return;
    }

    try {
        message.textContent = "Creating account...";
        const { data, error } = await supabase.auth.signUp({
            email, password,
            options: { data: { username, display_name: displayName } }
        });
        if (error) throw error;
        if (!data.user) throw new Error("Account creation failed.");
        if (!data.session) {
            message.textContent = "Account created. Check your email to confirm your account.";
            return;
        }
        renderStudioProjects(root);
    } catch (error) {
        console.error("Lucid Developer signup:", error);
        message.textContent = error.message || "Unable to create the account.";
    }
}

async function signInDeveloper(root) {
    const email = root.querySelector("#studio-email").value.trim();
    const password = root.querySelector("#studio-password").value;
    const message = root.querySelector("#studio-auth-message");

    if (!email || !password) {
        message.textContent = "Enter your email and password.";
        return;
    }

    try {
        message.textContent = "Signing in...";
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        renderStudioProjects(root);
    } catch (error) {
        console.error("Lucid Developer login:", error);
        message.textContent = error.message || "Unable to sign in.";
    }
}

function renderDashboard(root, user) {
    const body = root.querySelector("#studio-body");
    const displayName = user.user_metadata?.display_name || user.user_metadata?.username || "Developer";

    body.innerHTML = `
        <section class="studio-dashboard">
            <div class="studio-welcome">
                <span>Developer workspace</span>
                <h2>Welcome, ${escapeHTML(displayName)}</h2>
                <p>Build something for Lucid OS.</p>
            </div>
            <div class="studio-dashboard-grid">
                <button class="studio-dashboard-card" id="studio-new-app">
                    <span class="studio-card-icon">＋</span>
                    <strong>New app</strong>
                    <span>Start a new Lucid project.</span>
                </button>
                <button class="studio-dashboard-card" id="studio-projects">
                    <span class="studio-card-icon">📁</span>
                    <strong>My Projects</strong>
                    <span>View and manage your projects.</span>
                </button>
                <button class="studio-dashboard-card" id="studio-docs">
                    <span class="studio-card-icon">?</span>
                    <strong>Lucid Script Docs</strong>
                    <span>Learn the language.</span>
                </button>
                <button class="studio-dashboard-card" id="studio-submissions">
                    <span class="studio-card-icon">↑</span>
                    <strong>My submissions</strong>
                    <span>Track submitted applications.</span>
                </button>
                <button class="studio-dashboard-card" id="studio-signout">
                    <span class="studio-card-icon">↪</span>
                    <strong>Sign out</strong>
                    <span>End your Lucid developer session.</span>
                </button>
            </div>
        </section>
    `;

    root.querySelector("#studio-docs").addEventListener("click", () => renderLucidScriptDocs(root));
    root.querySelector("#studio-new-app")?.addEventListener("click", () => showNewProjectDialog(root));
    root.querySelector("#studio-projects")?.addEventListener("click", () => renderStudioProjects(root));
    root.querySelector("#studio-signout").addEventListener("click", async () => {
        await supabase.auth.signOut();
        renderAuth(root);
    });
    root.querySelector("#studio-submissions").addEventListener("click", () => renderSubmissions(root));
}

async function renderSubmissions(root) {
    const body = root.querySelector("#studio-body");
    body.innerHTML = `
        <section class="studio-submissions">
            <button class="studio-back-button" id="studio-submissions-back">← Back</button>
            <div class="studio-submissions-header">
                <div class="studio-eyebrow">DEVELOPER</div>
                <h2>My submissions</h2>
                <p>Track your Lucid applications.</p>
            </div>
            <div id="studio-submission-list" class="studio-submission-list">Loading submissions...</div>
        </section>
    `;

    const backButton = root.querySelector("#studio-submissions-back");
    backButton.addEventListener("click", async () => {
        const user = await getCurrentUser();
        if (user) renderDashboard(root, user);
    });

    const list = root.querySelector("#studio-submission-list");
    const user = await getCurrentUser();
    if (!user) { list.textContent = "You are not signed in."; return; }

    const { data, error } = await supabase.from("lucid_app_submissions")
        .select(`id, name, description, category, version, status, rejection_reason, submitted_at, reviewed_at`)
        .eq("developer_id", user.id)
        .order("submitted_at", { ascending: false });

    if (error) {
        console.error("Lucid submissions:", error);
        list.textContent = "Unable to load your submissions.";
        return;
    }

    if (!data.length) {
        list.innerHTML = '<div class="studio-no-submissions">You haven\'t submitted any apps yet.</div>';
        return;
    }

    list.innerHTML = "";
    data.forEach(submission => {
        const item = document.createElement("article");
        item.className = "studio-submission";
        item.innerHTML = `
            <div>
                <h3>${escapeHTML(submission.name)}</h3>
                <span>v${escapeHTML(submission.version)} · ${escapeHTML(submission.category)}</span>
            </div>
            <strong class="submission-status submission-status-${escapeHTML(submission.status)}">${escapeHTML(submission.status)}</strong>
        `;
        list.appendChild(item);
    });
}

function renderLucidScriptDocs(root) {
    const body = root.querySelector("#studio-body");
    body.innerHTML = `
        <section class="studio-docs">
            <button class="studio-back-button" id="studio-docs-back">← Back</button>
            <div class="studio-docs-content">
                <div class="studio-eyebrow">LUCID SCRIPT</div>
                <h2>Learn Lucid Script</h2>
                <p>Lucid Script is the simple programming language built for Lucid OS.</p>
                <h3>Your first app</h3>
                <p>Every Lucid Script application begins with <code>app</code> and a <code>window</code>.</p>
                <pre><code>app "Hello"
window {
    title "Hello"
    text "Hello from Lucid!"
}</code></pre>
                <h3>Text</h3>
                <pre><code>text "Hello"
text "Welcome to Lucid!"</code></pre>
                <h3>Variables</h3>
                <p>Use <code>let</code> to create a variable.</p>
                <pre><code>let name = "Snetch"
let score = 10
text name
text score</code></pre>
                <h3>Change a variable</h3>
                <p>Use <code>set</code> to change an existing variable.</p>
                <pre><code>let score = 0
set score = score + 1
text score</code></pre>
                <h3>Math</h3>
                <pre><code>let a = 10
let b = 5
text a + b
text a - b
text a * b
text a / b</code></pre>
                <h3>Comparisons</h3>
                <pre><code>score == 10
score != 10
score > 10
score < 10
score >= 10
score <= 10</code></pre>
                <h3>Conditions</h3>
                <pre><code>if score >= 10 {
    text "Great!"
} else {
    text "Keep learning!"
}</code></pre>
                <h3>Repeat</h3>
                <p>Repeat a block a specific number of times.</p>
                <pre><code>repeat 3 {
    text "Hello!"
}</code></pre>
                <h3>Lists</h3>
                <pre><code>let colors = ["Red", "Green", "Blue"]
each color in colors {
    text color
}</code></pre>
                <h3>Objects</h3>
                <pre><code>let player = { name: "Snetch", level: 7 }
text player.name
text player.level</code></pre>
                <h3>Functions</h3>
                <pre><code>function greet(name) {
    notification.show("Hello " + name)
}
greet("Lucid")</code></pre>
                <h3>Buttons</h3>
                <pre><code>button "Click me" {
    onClick {
        notification.show("Hello from Lucid!")
    }
}</code></pre>
                <h3>Interactive state</h3>
                <pre><code>let count = 0
text "Points: " + count
button "Add point" {
    onClick {
        set count = count + 1
    }
}</code></pre>
                <h3>Notifications</h3>
                <pre><code>notification.show("Welcome to Lucid!")</code></pre>
                <h3>Lucid files</h3>
                <p>Lucid applications can read and write files through the Lucid file API.</p>
                <pre><code>files.write("hello.txt", "Hello from Lucid!")
let note = files.read("hello.txt")
notification.show(note)</code></pre>
                <h3>Theme</h3>
                <pre><code>let mode = theme.current()
text mode</code></pre>
                <h3>Comments</h3>
                <pre><code>// This is a comment
text "Comments are ignored."</code></pre>
                <h3>Complete example</h3>
                <pre><code>app "Counter"
window {
    title "Lucid Counter"
    let count = 0
    text "Points: " + count
    button "Add point" {
        onClick { set count = count + 1 }
    }
    button "Add five" {
        onClick { set count = count + 5 }
    }
    button "Reset" {
        onClick { set count = 0 }
    }
}</code></pre>
                <div class="studio-docs-note"><strong>One file is enough</strong><br><br>A Lucid Script project starts with one source file: <code>main.lucid</code>.<br><br>Assets can be added separately, while the application logic stays inside your Lucid Script file.</div>
                <div class="studio-docs-note"><strong>Simple by design</strong><br><br>You don't need semicolons, classes, constructors, imports, or complicated project setup to create a Lucid application.</div>
            </div>
        </section>
    `;
    root.querySelector("#studio-docs-back").addEventListener("click", () => renderStudioProjects(root));
}

function renderNewApp(root) {
    const body = root.querySelector("#studio-body");
    body.innerHTML = `
        <section class="studio-new-app">
            <button class="studio-back-button" id="studio-new-back">← Back</button>
            <div class="studio-new-app-header">
                <div class="studio-eyebrow">NEW PROJECT</div>
                <h2>Create a Lucid application</h2>
                <p>Choose a language for your project.</p>
            </div>
            <div class="studio-language-grid">
                <button class="studio-language active" data-language="lucid-script">
                    <span class="studio-language-icon">◇</span>
                    <strong>Lucid Script</strong>
                    <span>Beginner friendly</span>
                </button>
                <button class="studio-language" data-language="javascript">
                    <span class="studio-language-icon">JS</span>
                    <strong>JavaScript</strong>
                    <span>Advanced</span>
                </button>
                <button class="studio-language" data-language="html">
                    <span class="studio-language-icon"></></span>
                    <strong>HTML + CSS + JS</strong>
                    <span>Web-style apps</span>
                </button>
            </div>
            <button id="studio-create-project" class="studio-primary-button">Create Lucid Script project</button>
        </section>
    `;

    root.querySelector("#studio-new-back").addEventListener("click", async () => {
        const user = await getCurrentUser();
        if (user) renderDashboard(root, user);
    });

    const languageButtons = root.querySelectorAll(".studio-language");
    let selectedLanguage = "lucid-script";

    languageButtons.forEach(button => {
        button.addEventListener("click", () => {
            languageButtons.forEach(item => item.classList.remove("active"));
            button.classList.add("active");
            selectedLanguage = button.dataset.language;
            root.querySelector("#studio-create-project").textContent =
                selectedLanguage === "lucid-script" ? "Create Lucid Script project"
                : `${button.querySelector("strong").textContent} project`;
        });
    });

    root.querySelector("#studio-create-project").addEventListener("click", () => {
        if (selectedLanguage !== "lucid-script") {
            showStudioMessage(root, "That language is coming later. Lucid Script is ready now.");
            return;
        }
        openLucidScriptEditor(root);
    });
}

function openLucidScriptEditor(root, project = null) {
    if (!project) project = getActiveProject();
    if (!project) project = createProject({ name: "Untitled App", language: "lucid-script" });
    setActiveProject(project.id);

    const body = root.querySelector("#studio-body");
    body.innerHTML = `
        <section class="studio-editor">
            <div class="studio-editor-toolbar">
                <div class="studio-editor-project">
                    <button id="studio-back-projects" title="Back to projects" aria-label="Back to projects">←</button>
                    <div>
                        <strong id="studio-editor-project-name">${escapeHTML(project.name)}</strong>
                        <small>Lucid Script</small>
                    </div>
                </div>
                <div class="studio-editor-actions">
                    <button id="studio-editor-docs" class="studio-secondary-btn">Docs</button>
                    <button id="studio-editor-manifest" class="studio-secondary-btn">Manifest</button>
                    <button id="studio-save" class="studio-secondary-btn">Save</button>
                    <button id="studio-run" class="studio-primary-btn">Run</button>
                    <button id="studio-build" class="studio-secondary-btn">Build</button>
                </div>
            </div>
            <div class="studio-editor-layout">
                <div class="studio-code-panel">
                    <div class="studio-code-label">
                        <span>main.lucid</span>
                        <span>Lucid Script</span>
                    </div>
                    <div class="lucid-editor">
                        <div id="lucid-line-numbers" class="lucid-line-numbers" aria-hidden="true">1</div>
                        <textarea id="lucid-code" spellcheck="false" wrap="off" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></textarea>
                    </div>
                </div>
                <div class="studio-preview-panel">
                    <div class="studio-preview-label">Preview</div>
                    <div id="lucid-preview" class="lucid-preview">
                        <div class="studio-preview-empty">Press ▶ Run to preview your app.</div>
                    </div>
                </div>
            </div>
            <div class="studio-editor-footer">
                <div id="studio-editor-status" class="studio-editor-status">Ready</div>
                <div id="studio-editor-permissions" class="studio-editor-permissions">Permissions: none</div>
            </div>
        </section>
    `;

    const codeEditor = root.querySelector("#lucid-code");
    const saveButton = root.querySelector("#studio-save");
    const statusElement = root.querySelector("#studio-editor-status");
    const lineNumbers = root.querySelector("#lucid-line-numbers");

    codeEditor.value = project.source || "";
    updateLineNumbers();

    function updateLineNumbers() {
        const lineCount = codeEditor.value.split("\n").length;
        let output = "";
        for (let i = 1; i <= lineCount; i++) output += i + "\n";
        lineNumbers.textContent = output;
    }

    function saveCurrentStudioProject() {
        const source = codeEditor.value;
        saveProjectSource(project.id, source);
        project = getProject(project.id);
        if (statusElement) statusElement.textContent = "Saved";
        saveButton?.classList.add("studio-saved");
        setTimeout(() => saveButton?.classList.remove("studio-saved"), 700);
    }

    root.querySelector("#studio-back-projects")?.addEventListener("click", () => {
        saveCurrentStudioProject();
        renderStudioProjects(root);
    });

    root.querySelector("#studio-editor-docs")?.addEventListener("click", () => {
        saveCurrentStudioProject();
        renderLucidScriptDocs(root);
    });

    root.querySelector("#studio-editor-manifest")?.addEventListener("click", () => {
        saveCurrentStudioProject();
        showStudioManifest(root);
    });

    root.querySelector("#studio-run")?.addEventListener("click", async () => {
        saveCurrentStudioProject();
        await runStudioCode(root);
    });

    root.querySelector("#studio-build")?.addEventListener("click", async () => {
        saveCurrentStudioProject();
        await buildLucidProject(root, project);
    });

    saveButton?.addEventListener("click", saveCurrentStudioProject);

    let autoSaveTimer = null;
    codeEditor.addEventListener("input", () => {
        updateLineNumbers();
        if (statusElement) statusElement.textContent = "Unsaved changes";
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => saveCurrentStudioProject(), 700);
    });

    codeEditor.addEventListener("scroll", () => {
        lineNumbers.scrollTop = codeEditor.scrollTop;
    });

    codeEditor.addEventListener("keydown", event => {
        if (event.key === "Tab") {
            event.preventDefault();
            const start = codeEditor.selectionStart;
            const end = codeEditor.selectionEnd;
            const value = codeEditor.value;
            codeEditor.value = value.slice(0, start) + "    " + value.slice(end);
            codeEditor.selectionStart = start + 4;
            codeEditor.selectionEnd = start + 4;
            updateLineNumbers();
            codeEditor.dispatchEvent(new Event("input"));
            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();
            const start = codeEditor.selectionStart;
            const value = codeEditor.value;
            const beforeCursor = value.slice(0, start);
            const currentLine = beforeCursor.split("\n").pop();
            const indentation = currentLine.match(/^[ \t]*/)?.[0] || "";
            const trimmed = currentLine.trimEnd();
            let nextIndent = indentation;
            if (trimmed.endsWith("{")) nextIndent += "    ";
            if (value.slice(start).startsWith("}") && nextIndent.endsWith("    ")) nextIndent = nextIndent.slice(0, -4);
            codeEditor.value = value.slice(0, start) + "\n" + nextIndent + value.slice(start);
            const newPosition = start + 1 + nextIndent.length;
            codeEditor.selectionStart = newPosition;
            codeEditor.selectionEnd = newPosition;
            updateLineNumbers();
            codeEditor.dispatchEvent(new Event("input"));
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
            event.preventDefault();
            saveCurrentStudioProject();
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            saveCurrentStudioProject();
            runStudioCode(root);
            return;
        }
    });
}

function runStudioCode(root) {
    const editor = root.querySelector("#lucid-code");
    const preview = root.querySelector("#lucid-preview");
    const status = root.querySelector("#studio-editor-status");
    const code = editor.value;
    preview.innerHTML = "";

    try {
        const result = runLucidScript(code, preview, { permissions: [] });
        status.textContent = `Running: ${result.appName}`;
    } catch (error) {
        console.error("Lucid Script:", error);
        preview.innerHTML = `<div class="lucid-runtime-error"><strong>Build error</strong><span>${escapeHTML(error.message)}</span></div>`;
        status.textContent = "Build failed";
    }
}

function showStudioManifest(root) {
    const code = root.querySelector("#lucid-code").value;
    let name = "Untitled App";
    const match = code.match(/^\s*app\s+["'](.+?)["']/m);
    if (match) name = match[1];

    const manifest = buildManifest({
        id: slugify(name), name, version: "1.0.0",
        description: "A Lucid Script application.", permissions: []
    });

    const preview = root.querySelector("#lucid-preview");
    preview.innerHTML = `
        <div class="studio-manifest-view">
            <div class="studio-manifest-title">App Manifest</div>
            <pre>${escapeHTML(JSON.stringify(manifest, null, 2))}</pre>
        </div>
    `;
    root.querySelector("#studio-editor-status").textContent = "Manifest generated.";
}

function slugify(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "lucid-app";
}

function showStudioMessage(root, message) {
    const status = root.querySelector("#studio-editor-status");
    if (status) { status.textContent = message; return; }
    const body = root.querySelector("#studio-body");
    const messageElement = document.createElement("div");
    messageElement.className = "studio-auth-message";
    messageElement.textContent = message;
    body.appendChild(messageElement);
}

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

        const manifest = buildManifest({
            id: slugify(result.appName), name: result.appName, version: "1.0.0",
            description: "A Lucid Script application.", permissions: []
        });

        const packageData = { manifest, source: { "main.lucid": code } };
        const blob = new Blob([JSON.stringify(packageData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${manifest.id}.lucidpkg`;
        link.textContent = "Export .lucidpkg";
        link.className = "studio-export-button";

        const preview = root.querySelector("#lucid-preview");
        preview.innerHTML = `
            <div class="studio-build-success">
                <div class="studio-build-icon">✓</div>
                <h3>Build successful</h3>
                <p>${escapeHTML(manifest.name)} · v${escapeHTML(manifest.version)}</p>
                <div class="studio-build-manifest">Valid Lucid application</div>
            </div>
        `;
        preview.querySelector(".studio-build-success").appendChild(link);
        status.textContent = "Build successful.";
    } catch (error) {
        root.querySelector("#studio-editor-status").textContent = "Build failed.";
        console.error(error);
    }
}

function escapeHTML(value) {
    return String(value ?? "").replaceAll("&", "&").replaceAll("<", "<").replaceAll(">", ">").replaceAll('"', """).replaceAll("'", "&#039;");
}

export { createLucidStudio };