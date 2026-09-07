# Lucid Script
Lucid Script is the native language for building Lucid OS applications and 2D games. It keeps the syntax small while providing state, functions, UI, graphics, keyboard and mouse input, storage, files, audio, timers and a real game loop.
## App
```lucid
app "Notes"
window {
    title "Notes"
    heading "My Notes"
    let note = ""
    input "Write something" {
        onInput {
            set note = event.value
        }
    }
    text "{note}"
}
```
## Values
```lucid
let name = "Lucid"
let score = 10
let enabled = true
let nothing = null
let colors = ["Red", "Green", "Blue"]
let player = { name: "Nova", level: 4 }
set score = score + 5
```
Supported expressions include numbers, strings, booleans, arrays, objects, arithmetic, comparisons, `&&`, `||`, `!`, member access and array indexing.
## Conditions and loops
```lucid
if score >= 10 {
    text "Great!"
} else {
    text "Keep going"
}
repeat 5 {
    notification.show("Hello")
}
each color in colors {
    text color
}
```
## Functions
```lucid
function add(a, b) {
    return a + b
}
let result = add(4, 8)
text "Result: {result}"
```
## UI
```lucid
window {
    title "Controls"
    heading "Settings"
    text "Hello"
    input "Username" {
        onInput {
            set username = event.value
        }
    }
    checkbox "Notifications" {
        onChange {
            set notifications = event.checked
        }
    }
    select "Theme" {
        option "Dark"
        option "Light"
        option "Dream"
        onChange {
            set theme = event.value
        }
    }
    button "Save" {
        onClick {
            notification.show("Saved")
        }
    }
    image "https://example.com/image.png" {
        alt "Example"
    }
}
```
Events expose `event.value`, `event.checked`, `event.key`, `event.code`, `event.x`, `event.y`, `event.button`, and `event.delta` where applicable.
## Storage, files and utilities
```lucid
storage.set("highScore", 120)
let score = storage.get("highScore", 0)
storage.remove("highScore")
files.write("settings.txt", "dark")
let mode = files.read("settings.txt")
let value = random.integer(1, 100)
let picked = random.pick(["Red", "Green", "Blue"])
let now = time.now()
let upper = string.upper("lucid")
let rounded = math.round(4.7)
audio.beep(600, 0.08)
clipboard.copy("Lucid")
window.open("https://example.com")
```
## 2D Games
`game` creates a real canvas with an animation loop, entities, keyboard input, mouse input, movement, collision and drawing.
```lucid
app "Box Game"
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
                game.set("coin", "y", random.integer(60, 300))
                audio.beep(700, 0.06)
            }
        }
        onKeyDown {
            if event.key == "Space" {
                audio.beep(900, 0.04)
            }
        }
    }
}
```
## Game entities
`box` draws a rectangle, `circle` draws a circle, `sprite` draws an image, `gameText` draws canvas text and `line` draws a line. Entity properties include `x`, `y`, `width`, `height`, `radius`, `color`, `fill`, `stroke`, `lineWidth`, `size`, `font`, `opacity`, `visible`, `z`, `src` and `gravity`.
## Game loop
`onUpdate` runs every animation frame. `event.delta` is the elapsed time in seconds since the previous frame, so movement can be frame-independent.
```lucid
onUpdate {
    game.move("player", 100 * event.delta, 0)
}
```
## Keyboard and mouse
```lucid
onKeyDown {
    if event.key == "ArrowRight" {
        notification.show("Right")
    }
}
onMouseDown {
    notification.show("Mouse: " + event.x + ", " + event.y)
}
```
Use `game.key("ArrowRight")` inside `onUpdate` for continuous input.
## Collision and entities
```lucid
if game.collides("player", "enemy") {
    set health = health - 1
}
game.move("player", 5, 0)
game.set("player", "color", "#ff5577")
let x = game.get("player", "x", 0)
let position = game.position("player")
game.remove("coin")
```
## Sprites and gravity
```lucid
sprite "hero" {
    x 100
    y 100
    width 64
    height 64
    src "https://example.com/hero.png"
}
box "ball" {
    x 100
    y 40
    width 30
    height 30
    gravity 700
}
```
## Pause and timers
```lucid
function ding() {
    audio.beep(500, 0.05)
}
timer.after(1000, "ding")
game.pause()
game.resume()
game.toggle()
```
## Build
Lucid Studio builds a `lucid-app` manifest containing app id, name, version, description, language and permissions. A normal project uses `main.lucid`. The same language can be used for utilities, dashboards, creative tools, interactive interfaces, arcade games, mazes, simple platformers and other 2D experiences.