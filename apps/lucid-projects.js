import { saveUserFile } from "../js/filesystem.js";

const PROJECTS_KEY = "lucid-studio-projects-v1";
const ACTIVE_PROJECT_KEY = "lucid-studio-active-project";

function readProjects() {
    try {
        const raw = localStorage.getItem(PROJECTS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Failed to read Lucid projects:", error);
        return [];
    }
}

function writeProjects(projects) {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    saveUserFile(["Documents", "Lucid Projects"], "projects.json", JSON.stringify(projects, null, 2), "application/json")
        .catch(error => console.warn("Lucid project file save failed:", error));
}

function generateProjectId() {
    return "project-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function createProject({ name = "Untitled App", language = "lucid-script" } = {}) {
    const cleanName = name.trim() || "Untitled App";
    const now = new Date().toISOString();
    const project = {
        id: generateProjectId(),
        name: cleanName,
        language,
        source: `app "${cleanName}"

window {
    title "${cleanName}"

    text "Welcome to Lucid Script!"
}
`,
        version: 1,
        createdAt: now,
        updatedAt: now,
        assets: []
    };

    const projects = readProjects();
    projects.unshift(project);
    writeProjects(projects);
    localStorage.setItem(ACTIVE_PROJECT_KEY, project.id);
    return project;
}

function getProjects() {
    return readProjects();
}

function getProject(id) {
    return readProjects().find(project => project.id === id) || null;
}

function getActiveProject() {
    const activeId = localStorage.getItem(ACTIVE_PROJECT_KEY);
    return activeId ? getProject(activeId) : null;
}

function setActiveProject(id) {
    const project = getProject(id);
    if (!project) return false;
    localStorage.setItem(ACTIVE_PROJECT_KEY, project.id);
    return true;
}

function updateProject(id, updates = {}) {
    const projects = readProjects();
    const index = projects.findIndex(project => project.id === id);
    if (index === -1) throw new Error("Project not found.");

    projects[index] = {
        ...projects[index],
        ...updates,
        id: projects[index].id,
        updatedAt: new Date().toISOString()
    };
    writeProjects(projects);
    return projects[index];
}

function saveProjectSource(id, source) {
    return updateProject(id, { source: String(source ?? "") });
}

function renameProject(id, name) {
    const cleanName = String(name ?? "").trim();
    if (!cleanName) throw new Error("Project name cannot be empty.");
    return updateProject(id, { name: cleanName });
}

function deleteProject(id) {
    const projects = readProjects();
    const filtered = projects.filter(project => project.id !== id);
    if (filtered.length === projects.length) return false;

    writeProjects(filtered);
    if (localStorage.getItem(ACTIVE_PROJECT_KEY) === id) localStorage.removeItem(ACTIVE_PROJECT_KEY);
    return true;
}

function duplicateProject(id) {
    const original = getProject(id);
    if (!original) throw new Error("Project not found.");

    const now = new Date().toISOString();
    const copy = {
        ...original,
        id: generateProjectId(),
        name: `${original.name} Copy`,
        createdAt: now,
        updatedAt: now,
        assets: Array.isArray(original.assets) ? [...original.assets] : []
    };

    const projects = readProjects();
    projects.unshift(copy);
    writeProjects(projects);
    localStorage.setItem(ACTIVE_PROJECT_KEY, copy.id);
    return copy;
}

function projectLanguageLabel(language) {
    switch (language) {
        case "lucid-script": return "Lucid Script";
        case "javascript": return "JavaScript";
        case "html": return "HTML + CSS + JS";
        default: return language || "Unknown";
    }
}

export { createProject, getProjects, getProject, getActiveProject, setActiveProject, updateProject, saveProjectSource, renameProject, deleteProject, duplicateProject, projectLanguageLabel };