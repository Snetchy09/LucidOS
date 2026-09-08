#!/usr/bin/env python3
import urllib.request
from pathlib import Path

root = Path(__file__).resolve().parents[1]
MAIN_GOOD = "https://raw.githubusercontent.com/Snetchy09/LucidOS/fcd658b8e89d35fefeafb0f4db990e57e9764840/js/main.js"

def restore_main_if_needed():
    path = root / "js" / "main.js"
    src = path.read_text() if path.exists() else ""
    if "buildDesktopApps" in src and "function updateClock" in src and len(src) > 8000:
        return
    print("main.js looks incomplete, restoring...")
    data = urllib.request.urlopen(MAIN_GOOD, timeout=30).read().decode()
    path.write_text(data)
    print(f"restored main.js ({len(data)} bytes)")

def patch_studio():
    path = root / "apps" / "lucid-studio.js"
    src = path.read_text()
    old_fn = 'function updateLineNumbers() { const lineCount = codeEditor.value.split("\\n").length; let output = ""; for (let i = 1; i <= lineCount; i++) output += i + "\\n"; lineNumbers.textContent = output; }'
    new_fn = (
        "function updateLineNumbers() {\n"
        "        const value = codeEditor.value;\n"
        "        let lineCount = 1;\n"
        "        for (let i = 0; i < value.length; i++) if (value.charCodeAt(i) === 10) lineCount++;\n"
        "        if (lineCount === lastLineCount) return;\n"
        "        lastLineCount = lineCount;\n"
        "        const parts = new Array(lineCount);\n"
        "        for (let i = 0; i < lineCount; i++) parts[i] = i + 1;\n"
        '        lineNumbers.textContent = parts.join("\\n");\n'
        "    }"
    )
    if old_fn not in src:
        if "lastLineCount" in src and "lineNumbersRaf" in src:
            print("studio already optimized")
            return
        raise SystemExit("studio: expected line-number function not found")
    src = src.replace(old_fn, new_fn)
    src = src.replace(
        "let autoSaveTimer = null;",
        "let autoSaveTimer = null;\n    let lastLineCount = -1;\n    let lineNumbersRaf = 0;",
        1,
    )
    src = src.replace(
        'codeEditor.addEventListener("input", () => { updateLineNumbers(); if (statusElement) statusElement.textContent = "Unsaved changes"; clearTimeout(autoSaveTimer); autoSaveTimer = setTimeout(() => saveCurrentStudioProject(), 700); });',
        'codeEditor.addEventListener("input", () => { if (!lineNumbersRaf) lineNumbersRaf = requestAnimationFrame(() => { lineNumbersRaf = 0; updateLineNumbers(); }); if (statusElement) statusElement.textContent = "Unsaved changes"; clearTimeout(autoSaveTimer); autoSaveTimer = setTimeout(() => saveCurrentStudioProject(), 700); });',
    )
    src = src.replace(
        "codeEditor.selectionStart = start + 4; codeEditor.selectionEnd = start + 4; updateLineNumbers(); codeEditor.dispatchEvent(new Event(\"input\"));",
        "codeEditor.selectionStart = start + 4; codeEditor.selectionEnd = start + 4; lastLineCount = -1; codeEditor.dispatchEvent(new Event(\"input\"));",
    )
    src = src.replace(
        "codeEditor.selectionStart = newPosition; codeEditor.selectionEnd = newPosition; updateLineNumbers(); codeEditor.dispatchEvent(new Event(\"input\"));",
        "codeEditor.selectionStart = newPosition; codeEditor.selectionEnd = newPosition; lastLineCount = -1; codeEditor.dispatchEvent(new Event(\"input\"));",
    )
    src = src.replace(
        'codeEditor.addEventListener("scroll", () => { lineNumbers.scrollTop = codeEditor.scrollTop; });',
        'codeEditor.addEventListener("scroll", () => { if (lineNumbers.scrollTop !== codeEditor.scrollTop) lineNumbers.scrollTop = codeEditor.scrollTop; }, { passive: true });',
    )
    path.write_text(src)
    print(f"studio optimized ({len(src)} bytes)")

def patch_main():
    path = root / "js" / "main.js"
    src = path.read_text()
    if "if (clock.textContent !== text)" in src and "buildDesktopApps" in src:
        print("main already optimized")
        return
    old = """function updateClock() {
    const clock = document.getElementById("clock");
    if (!clock) return;
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    clock.textContent = `${hours}:${minutes}`;
}"""
    new = """function updateClock() {
    const clock = document.getElementById("clock");
    if (!clock) return;
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const text = `${hours}:${minutes}`;
    if (clock.textContent !== text) clock.textContent = text;
}"""
    if old not in src:
        raise SystemExit("main: clock function not found")
    path.write_text(src.replace(old, new))
    print("main optimized")

def patch_css():
    path = root / "css" / "lucid-studio.css"
    src = path.read_text()
    if "contain: layout" in src and "studio-editor-layout" in src:
        print("css already optimized")
        return
    addition = """
.studio-editor-layout {
    contain: layout;
}
.studio-code-panel,
.studio-preview-panel {
    contain: layout style;
}
.lucid-editor {
    contain: content;
}
.lucid-line-numbers {
    contain: strict;
}
"""
    path.write_text(src.rstrip() + "\n" + addition)
    print("css optimized")

if __name__ == "__main__":
    restore_main_if_needed()
    patch_studio()
    patch_main()
    patch_css()
    print("done")
