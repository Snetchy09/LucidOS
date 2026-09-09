import { createWindow } from "../js/window-manager.js";
import { lucidFileSystem, saveFileSystem, getStorageUsage } from "../js/filesystem.js";
import { getAppLauncher } from "../js/app-registry.js";

function createTerminal() {
    const content = `
        <div class="terminal">
            <div class="terminal-output"></div>
            <div class="terminal-input-line">
                <span class="terminal-prompt">lucid@home:~$</span>
                <input class="terminal-input" type="text" autocomplete="off" spellcheck="false">
            </div>
        </div>
    `;
    const windowElement = createWindow("🖥️ Terminal", content);
    const output = windowElement.querySelector(".terminal-output");
    const input = windowElement.querySelector(".terminal-input");
    const terminal = windowElement.querySelector(".terminal");
    const commandHistory = [];
    let historyIndex = 0;
    let currentPath = [];
    const sessionStarted = performance.now();

    function currentFolder() {
        let folder = lucidFileSystem;
        for (const part of currentPath) {
            folder = folder?.children?.find(item => item.type === "folder" && item.name.toLowerCase() === part.toLowerCase());
            if (!folder) return lucidFileSystem;
        }
        return folder;
    }

    function print(text = "") {
        const line = document.createElement("div");
        line.textContent = text;
        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
    }

    function pathText(path = currentPath) {
        return path.length ? "~/" + path.join("/") : "~";
    }

    function updatePrompt() {
        windowElement.querySelector(".terminal-prompt").textContent = `lucid@home:${pathText()}$`;
    }

    function tokenize(command) {
        const tokens = [];
        const pattern = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(\S+)/g;
        let match;
        while ((match = pattern.exec(command))) tokens.push(match[1] ?? match[2] ?? match[3]);
        return tokens;
    }

    function resolveParts(rawPath) {
        const text = String(rawPath || "").trim();
        if (!text || text === ".") return [...currentPath];
        const absolute = text === "/" || text === "~" || text.startsWith("~/") || text.startsWith("/");
        const parts = text.replace(/^~\/?/, "").replace(/^\//, "").split("/");
        const resolved = absolute ? [] : [...currentPath];
        for (const part of parts) {
            if (!part || part === ".") continue;
            if (part === "..") resolved.pop();
            else resolved.push(part);
        }
        return resolved;
    }

    function folderAt(path) {
        let folder = lucidFileSystem;
        for (const part of path) {
            folder = folder?.children?.find(item => item.type === "folder" && item.name.toLowerCase() === part.toLowerCase());
            if (!folder) return null;
        }
        return folder;
    }

    function findItem(rawPath) {
        const text = String(rawPath || "").trim();
        if (!text) return { item: currentFolder(), path: currentPath, type: "folder" };
        const parts = resolveParts(text);
        if (!parts.length) return { item: lucidFileSystem, path: [], type: "folder" };
        const parentPath = parts.slice(0, -1);
        const name = parts.at(-1);
        const parent = folderAt(parentPath);
        if (!parent) return null;
        const item = parent.children.find(child => child.name.toLowerCase() === name.toLowerCase());
        return item ? { item, path: parts, parent, name } : null;
    }

    function splitTarget(rawPath) {
        const parts = resolveParts(rawPath);
        if (!parts.length) return { folder: null, name: "", path: [] };
        const name = parts.pop();
        return { folder: folderAt(parts), name, path: parts };
    }

    function printTree(folder, prefix = "", showRoot = true) {
        if (showRoot) print(folder === lucidFileSystem ? "~" : folder.name);
        const children = [...(folder.children || [])].sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === "folder" ? -1 : 1);
        children.forEach((item, index) => {
            const last = index === children.length - 1;
            print(`${prefix}${last ? "└── " : "├── "}${item.type === "folder" ? "📁 " : "📄 "}${item.name}`);
            if (item.type === "folder") printTree(item, prefix + (last ? "    " : "│   "), false);
        });
    }

    function findRecursive(folder, name, path = []) {
        const results = [];
        for (const item of folder.children || []) {
            const itemPath = [...path, item.name];
            if (item.name.toLowerCase().includes(name.toLowerCase())) results.push(`${item.type === "folder" ? "📁" : "📄"} ~/${itemPath.join("/")}`);
            if (item.type === "folder") results.push(...findRecursive(item, name, itemPath));
        }
        return results;
    }

    function helpText(command) {
        const help = {
            help: "help [command]        show available commands",
            ls: "ls [path]              list files and folders",
            cd: "cd <path>              change directory; supports .., ~ and nested paths",
            pwd: "pwd                    print the current path",
            tree: "tree [path]            show a directory tree",
            cat: "cat <file>              print a file",
            head: "head <file> [lines]     show the first lines",
            tail: "tail <file> [lines]     show the last lines",
            touch: "touch <file>            create an empty file",
            mkdir: "mkdir <folder>          create a folder",
            rm: "rm <file>               delete a file",
            rmdir: "rmdir <folder>          delete an empty folder",
            write: "write <file> <text>     replace file contents",
            append: "append <file> <text>    append to a file",
            echo: "echo <text>              print text",
            find: "find <name>             search files recursively",
            grep: "grep <text> <file>     search matching lines",
            history: "history                  show this session's commands",
            clear: "clear                    clear terminal output",
            open: "open <app>              launch a LucidOS application",
            apps: "apps                     list launchable applications",
            storage: "storage                  show Lucid Files usage",
            whoami: "whoami                   show the current shell user",
            hostname: "hostname                 show the simulated host",
            uname: "uname                    show LucidOS system information",
            date: "date                     show date and time",
            time: "time                     show local time",
            uptime: "uptime                   show this terminal session uptime",
            neofetch: "neofetch                 show a LucidOS system summary",
            about: "about                    show terminal information"
        };
        return help[command];
    }

    async function runCommand(command) {
        const tokens = tokenize(command.trim());
        const commandName = (tokens.shift() || "").toLowerCase();
        const argument = tokens.join(" ");
        if (!commandName) return;

        if (commandName === "help" || commandName === "man") {
            const target = tokens[0];
            if (target) print(helpText(target) || `No manual entry for ${target}.`);
            else { print("LucidOS Terminal"); print("Type 'help <command>' for details."); Object.keys({help: 1, ls: 1, cd: 1, pwd: 1, tree: 1, cat: 1, head: 1, tail: 1, touch: 1, mkdir: 1, rm: 1, rmdir: 1, write: 1, append: 1, echo: 1, find: 1, grep: 1, history: 1, clear: 1, open: 1, apps: 1, storage: 1, whoami: 1, hostname: 1, uname: 1, date: 1, time: 1, uptime: 1, neofetch: 1, about: 1}).forEach(name => print("  " + helpText(name))); }
            return;
        }

        if (commandName === "ls" || commandName === "dir") {
            const target = tokens[0] ? findItem(tokens[0]) : { item: currentFolder() };
            if (!target?.item || target.item.type !== "folder") { print(`ls: folder not found: ${tokens[0] || ""}`); return; }
            const children = [...(target.item.children || [])].sort((a, b) => a.name.localeCompare(b.name));
            if (!children.length) { print("(empty)"); return; }
            children.forEach(item => print(`${item.type === "folder" ? "📁" : "📄"} ${item.name}`));
            return;
        }

        if (commandName === "cd") {
            const target = tokens[0] || "~";
            const path = resolveParts(target);
            if (!folderAt(path)) { print(`cd: folder not found: ${target}`); return; }
            currentPath = path;
            updatePrompt();
            return;
        }

        if (commandName === "pwd") { print(pathText()); return; }
        if (commandName === "tree") {
            const target = tokens[0] ? findItem(tokens[0]) : { item: currentFolder() };
            if (!target?.item || target.item.type !== "folder") { print("tree: folder not found"); return; }
            printTree(target.item);
            return;
        }

        if (["cat", "head", "tail"].includes(commandName)) {
            const result = findItem(tokens[0]);
            if (!result?.item || result.item.type !== "file") { print(`${commandName}: file not found: ${tokens[0] || ""}`); return; }
            const lines = String(result.item.content ?? "").split(/\r?\n/);
            const count = Math.max(1, Number(tokens[1]) || 10);
            if (commandName === "head") print(lines.slice(0, count).join("\n"));
            else if (commandName === "tail") print(lines.slice(-count).join("\n"));
            else print(String(result.item.content ?? ""));
            return;
        }

        if (commandName === "mkdir") {
            const target = tokens[0];
            if (!target) { print("mkdir: missing folder name"); return; }
            const { folder, name } = splitTarget(target);
            if (!folder || !name) { print("mkdir: invalid path"); return; }
            if (folder.children.some(item => item.name.toLowerCase() === name.toLowerCase())) { print(`mkdir: already exists: ${name}`); return; }
            folder.children.push({ type: "folder", name, children: [] });
            await saveFileSystem();
            print(`Created folder: ${name}`);
            return;
        }

        if (commandName === "touch") {
            const target = tokens[0];
            if (!target) { print("touch: missing file name"); return; }
            const { folder, name } = splitTarget(target);
            if (!folder || !name) { print("touch: invalid path"); return; }
            if (folder.children.some(item => item.name.toLowerCase() === name.toLowerCase())) { print(`touch: already exists: ${name}`); return; }
            folder.children.push({ type: "file", name, mimeType: "text/plain", size: 0, content: "", modifiedAt: new Date().toISOString() });
            await saveFileSystem();
            print(`Created file: ${name}`);
            return;
        }

        if (commandName === "rm" || commandName === "rmdir") {
            const target = tokens[0];
            if (!target) { print(`${commandName}: missing target`); return; }
            const result = findItem(target);
            if (!result?.item) { print(`${commandName}: not found: ${target}`); return; }
            if (commandName === "rm" && result.item.type !== "file") { print("rm: target is a folder; use rmdir"); return; }
            if (commandName === "rmdir" && result.item.type !== "folder") { print("rmdir: target is a file"); return; }
            if (commandName === "rmdir" && result.item.children?.length) { print("rmdir: folder is not empty"); return; }
            result.parent.children.splice(result.parent.children.indexOf(result.item), 1);
            await saveFileSystem();
            print(`Deleted: ${result.path.join("/")}`);
            return;
        }

        if (commandName === "write" || commandName === "append") {
            const target = tokens.shift();
            const text = tokens.join(" ");
            const result = target ? findItem(target) : null;
            if (!result?.item || result.item.type !== "file") { print(`${commandName}: file not found: ${target || ""}`); return; }
            result.item.content = commandName === "append" ? String(result.item.content ?? "") + text : text;
            result.item.size = result.item.content.length;
            result.item.modifiedAt = new Date().toISOString();
            await saveFileSystem();
            print(`Updated: ${result.path.join("/")}`);
            return;
        }

        if (commandName === "echo") { print(argument); return; }
        if (commandName === "find") {
            if (!tokens[0]) { print("find: missing search name"); return; }
            const results = findRecursive(lucidFileSystem, tokens[0]);
            results.length ? results.forEach(print) : print("No matches.");
            return;
        }

        if (commandName === "grep") {
            const query = tokens.shift();
            const result = findItem(tokens.shift());
            if (!query || !result?.item || result.item.type !== "file") { print("grep: usage: grep <text> <file>"); return; }
            let found = false;
            String(result.item.content ?? "").split(/\r?\n/).forEach((line, index) => { if (line.toLowerCase().includes(query.toLowerCase())) { found = true; print(`${index + 1}: ${line}`); } });
            if (!found) print("No matches.");
            return;
        }

        if (commandName === "clear") { output.innerHTML = ""; return; }
        if (commandName === "history") { commandHistory.forEach((item, index) => print(`${String(index + 1).padStart(3, " ")}  ${item}`)); return; }
        if (commandName === "whoami") { print("lucid"); return; }
        if (commandName === "hostname") { print("lucid-home"); return; }
        if (commandName === "uname") { print("LucidOS 0.2 · browser desktop · x64"); return; }
        if (commandName === "date") { print(new Date().toString()); return; }
        if (commandName === "time") { print(new Date().toLocaleTimeString()); return; }
        if (commandName === "uptime") { print(`${Math.floor((performance.now() - sessionStarted) / 1000)} seconds`); return; }
        if (commandName === "storage") { print(`Lucid Files: ${(getStorageUsage() / 1024).toFixed(1)} KB used`); return; }
        if (commandName === "about") { print("LucidOS Terminal · a local shell for the simulated Lucid filesystem."); print("No real operating-system commands are executed."); return; }

        if (commandName === "apps") {
            ["lucid-studio", "files", "settings", "terminal", "store", "calculator", "media", "paint", "notes", "calendar", "text-editor", "browser"].forEach(app => print(app));
            return;
        }

        if (commandName === "open") {
            const appName = tokens.join("-").toLowerCase();
            const aliases = { studio: "lucid-studio", "lucid-studio": "lucid-studio", file: "files", files: "files", settings: "settings", terminal: "terminal", store: "store", calculator: "calculator", calc: "calculator", media: "media", paint: "paint", notes: "notes", calendar: "calendar", browser: "browser", "text-editor": "text-editor", editor: "text-editor" };
            const id = aliases[appName] || appName;
            const launcher = getAppLauncher(id);
            if (!launcher) { print(`open: app not found: ${appName}`); return; }
            launcher();
            print(`Opened ${id}.`);
            return;
        }

        if (commandName === "neofetch") {
            print("      ◇  LUCIDOS");
            print("      ─────────");
            print("      System     LucidOS 0.2");
            print("      Shell      lucid-terminal");
            print("      Files      IndexedDB");
            print(`      Storage    ${(getStorageUsage() / 1024).toFixed(1)} KB`);
            print("      Host       browser");
            return;
        }

        print(`${commandName}: command not found`);
    }

    input.addEventListener("keydown", async event => {
        if (event.key === "ArrowUp") {
            event.preventDefault();
            historyIndex = Math.max(0, historyIndex - 1);
            input.value = commandHistory[historyIndex] || "";
            return;
        }
        if (event.key === "ArrowDown") {
            event.preventDefault();
            historyIndex = Math.min(commandHistory.length, historyIndex + 1);
            input.value = commandHistory[historyIndex] || "";
            return;
        }
        if (event.key !== "Enter") return;
        const command = input.value.trim();
        print(`lucid@home:${pathText()}$ ${command}`);
        input.value = "";
        if (command) {
            commandHistory.push(command);
            if (commandHistory.length > 100) commandHistory.shift();
        }
        historyIndex = commandHistory.length;
        try { await runCommand(command); } catch (error) { print(`error: ${error.message || "command failed"}`); }
    });

    print("LucidOS Terminal");
    print("Type 'help' for commands. Try: tree, find, neofetch, apps, open studio");
    print();
    setTimeout(() => input.focus(), 50);
    terminal.addEventListener("click", () => input.focus());
}

export { createTerminal };