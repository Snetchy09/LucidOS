#!/usr/bin/env python3
from pathlib import Path
root = Path(__file__).resolve().parents[1]

def patch_main():
    path = root / "js" / "main.js"
    src = path.read_text()
    if 'if (document.querySelector(".window")) return;' not in src:
        print("main already fixed")
        return
    src = src.replace(
        '        if (document.querySelector(".window")) return;\n        if (event.target.closest(".desktop-app")) return;',
        '        if (event.target.closest(".desktop-app")) return;',
    )
    src = src.replace(
        '        event.stopPropagation();\n        if (document.querySelector(".window")) return;\n        if (launcherOpen) closeLucidLauncher();',
        '        event.stopPropagation();\n        if (launcherOpen) closeLucidLauncher();',
    )
    src = src.replace(
        '    const desktop = document.getElementById("desktop");\n    launcherOpen = true;\n    desktop.classList.add("lucid-launcher-open");',
        '    const desktop = document.getElementById("desktop");\n    if (!desktop) return;\n    launcherOpen = true;\n    desktop.classList.add("lucid-launcher-open");',
    )
    path.write_text(src)
    print("main fixed")

def patch_css():
    path = root / "css" / "system.css"
    src = path.read_text()
    old = "#desktop.lucid-launcher-open .desktop-app {\n    pointer-events: auto;\n}"
    new = "#desktop.lucid-launcher-open .desktop-app {\n    pointer-events: auto;\n    opacity: 1;\n    transform: translate3d(-50%, -50%, 0) scale(1);\n}"
    if "opacity: 1" in src and "lucid-launcher-open .desktop-app" in src and "z-index: 600" in src:
        print("css already fixed")
        return
    if old not in src:
        raise SystemExit("css: open rule not found")
    src = src.replace(old, new)
    old_btn = "#start-button {\n    position: fixed;\n    left: 50%;\n    top: 50%;\n    z-index: 50;"
    new_btn = "#start-button {\n    position: fixed;\n    left: 50%;\n    top: 50%;\n    z-index: 600;"
    if old_btn not in src:
        raise SystemExit("css: start-button rule not found")
    src = src.replace(old_btn, new_btn)
    path.write_text(src)
    print("css fixed")

if __name__ == "__main__":
    patch_main()
    patch_css()
    print("done")
