import { createWindow } from "../js/window-manager.js";
import { lucidFileSystem } from "../js/filesystem.js";
import { saveFileSystem } from "../js/filesystem.js";

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

    let currentFolder = lucidFileSystem;

    function print(text = "") {
        const line = document.createElement("div");
        line.textContent = text;
        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
    }

    function getPath() {
        if (currentFolder === lucidFileSystem) return "~";
        return "~/" + currentFolder.name;
    }

    function updatePrompt() {
        const prompt = windowElement.querySelector(".terminal-prompt");
        prompt.textContent = "lucid@home:" + getPath() + "$";
    }

    async function executeCommand(command) {
        const parts = command.trim().split(/\s+/);
        const commandName = parts[0].toLowerCase();
        const argument = parts.slice(1).join(" ");

        if (commandName === "") return;

        if (commandName === "help") {
            print("Available commands:");
            print("  help");
            print("  ls");
            print("  cd <folder>");
            print("  cd ..");
            print("  pwd");
            print("  mkdir <folder>");
            print("  touch <file>");
            print("  cat <file>");
            print("  clear");
            print("  whoami");
            print("  date");
            return;
        }

        if (commandName === "ls") {
            if (currentFolder.children.length === 0) {
                print("(empty)");
                return;
            }
            currentFolder.children.forEach(item => {
                if (item.type === "folder") {
                    print("📁 " + item.name);
                } else {
                    print("📄 " + item.name);
                }
            });
            return;
        }

        if (commandName === "pwd") {
            print(getPath());
            return;
        }

        if (commandName === "cd") {
            if (!argument) {
                currentFolder = lucidFileSystem;
                updatePrompt();
                return;
            }
            if (argument === "..") {
                print("Parent navigation is not available yet.");
                return;
            }
            const targetFolder = currentFolder.children.find(item =>
                item.type === "folder" && item.name.toLowerCase() === argument.toLowerCase()
            );
            if (!targetFolder) {
                print("cd: folder not found: " + argument);
                return;
            }
            currentFolder = targetFolder;
            updatePrompt();
            return;
        }

        if (commandName === "mkdir") {
            if (!argument) {
                print("mkdir: missing folder name");
                return;
            }
            currentFolder.children.push({ type: "folder", name: argument, children: [] });
            await saveFileSystem();
            print("Created folder: " + argument);
            return;
        }

        if (commandName === "touch") {
            if (!argument) {
                print("touch: missing file name");
                return;
            }
            currentFolder.children.push({ type: "file", name: argument, content: "" });
            await saveFileSystem();
            print("Created file: " + argument);
            return;
        }

        if (commandName === "cat") {
            if (!argument) {
                print("cat: missing file name");
                return;
            }
            const file = currentFolder.children.find(item =>
                item.type === "file" && item.name.toLowerCase() === argument.toLowerCase()
            );
            if (!file) {
                print("cat: file not found: " + argument);
                return;
            }
            print(file.content);
            return;
        }

        if (commandName === "clear") {
            output.innerHTML = "";
            return;
        }

        if (commandName === "whoami") {
            print("lucid");
            return;
        }

        if (commandName === "date") {
            print(new Date().toString());
            return;
        }

        print(commandName + ": command not found");
    }

    input.addEventListener("keydown", event => {
        if (event.key !== "Enter") return;

        const command = input.value;
        print("lucid@home:" + getPath() + "$ " + command);
        input.value = "";
        executeCommand(command);
    });

    print("LucidOS Terminal");
    print("Type 'help' for available commands.");
    print();

    setTimeout(() => input.focus(), 50);

    const terminal = windowElement.querySelector(".terminal");
    terminal.addEventListener("click", () => input.focus());
}

export { createTerminal };