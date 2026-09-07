# Lucid Script
Lucid Script is the native language for building LucidOS applications and 2D games. It keeps the syntax small while providing state, functions, UI, graphics, keyboard and mouse input, storage, files, audio and a real game loop.
## App structure
```lucid
app "Hello"
window {
    title "Hello"
    text "Hello from Lucid!"
}
```
## Values
```lucid
let name = "Lucid"
let score = 10
let enabled = true
let empty = null
let colors = ["red", "green", "blue"]
let player = { name: "Nova", score: 20 }
text player.name
text colors[0]
```
Strings support `{name}` and `{player.score}` interpolation.
## Logic
```lucid
if score > 10 {
    text "High score"
} else {
    text "Keep playing"
}
repeat 3 {
    notification.show("Again")
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
let total = add(5, 7)
text total
```
## Interface
```lucid
heading "Profile"
text "Welcome, {name}"
input "Your name" {
    onInput {
        set name = event.value
    }
}
checkbox "Enabled" {
    onChange {
        set enabled = event.checked
    }
}
select "Pick a color" {
    option "Red"
    option "Blue"
    option "Green"
    onChange {
        set color = event.value
    }
}
button "Save" {
    onClick {
        storage.set("name", name)
        notification.show("Saved")
    }
}
```
Event handlers receive an `event` object. Use `event.value`, `event.checked`, `event.key`, `event.code`, `event.x`, `event.y`, `event.delta` and `event.dt` where appropriate.
## System APIs
```lucid
notification.show("Hello")
files.write("note.txt", "Hello")
let contents = files.read("note.txt")
storage.set("score", score)
let saved = storage.get("score", 0)
storage.remove("score")
let number = random.integer(1, 100)
let color = random.pick(colors)
let now = time.now()
let hour = time.hour()
let rounded = math.round(4.7)
clipboard.copy(name)
window.open("https://example.com")
audio.beep(600, 0.08)
```
## 2D games
A `game` block creates a canvas scene with a frame loop.
```lucid
app "Box Game"
window {
    title "Box Game"
    let score = 0
    game {
        size 640, 360
        background "#10131a"
        box "player" {
            x 80
            y 160
            width 40
            height 40
            color "#ffffff"
        }
        circle "coin" {
            x 480
            y 180
            radius 14
            color "#ffd84d"
        }
        gameText "Score: {score}" {
            x 20
            y 34
            size 24
            color "#ffffff"
        }
        onUpdate {
            if game.key("ArrowRight") {
                game.move("player", 260 * event.delta, 0)
            }
            if game.key("ArrowLeft") {
                game.move("player", -260 * event.delta, 0)
            }
            if game.key("ArrowUp") {
                game.move("player", 0, -260 * event.delta)
            }
            if game.key("ArrowDown") {
                game.move("player", 0, 260 * event.delta)
            }
            if game.collides("player", "coin") {
                set score = score + 1
                game.set("coin", "x", random.integer(30, 610))
                game.set("coin", "y", random.integer(70, 330))
                audio.beep(720, 0.05)
            }
        }
        onKeyDown {
            if event.key == "Space" {
                game.set("player", "color", "#55ddff")
            }
        }
        onMouseDown {
            game.set("player", "x", event.x)
            game.set("player", "y", event.y)
        }
    }
}
```
## Game objects
`box` supports `x`, `y`, `width`, `height`, `color`.
`circle` supports `x`, `y`, `radius`, `color`.
`sprite` supports `x`, `y`, `width`, `height`, `src`.
`gameText` supports `x`, `y`, `size`, `color`.
`line` supports `x1`, `y1`, `x2`, `y2`, `width`, `color`.
## Game API
`game.key(key)` checks a held keyboard key.
`game.width()` and `game.height()` return canvas dimensions.
`game.mouseX` and `game.mouseY` return the latest pointer position.
`game.move(name, x, y)` moves an entity.
`game.get(name, property, fallback)` reads entity state.
`game.set(name, property, value)` changes entity state.
`game.collides(a, b)` checks circle, box and mixed collisions.
`game.distance(a, b)` returns distance between entity centers.
`game.remove(name)` removes an entity.
`game.clear()` removes all entities.
`game.pause()`, `game.resume()` and `game.togglePause()` control the loop.
## Game events
`onUpdate` runs every frame and receives `event.delta` and `event.dt` in seconds.
`onKeyDown` and `onKeyUp` receive `event.key` and `event.code`.
`onMouseDown` and `onMouseUp` receive `event.x`, `event.y` and `event.button`.
## Building
Lucid Studio validates a project by running the script, generates a Lucid application manifest and exports a `.lucidpkg` package containing the manifest and `main.lucid`.
## Design
There are no semicolons, classes, imports or constructors. Lucid Script is meant to be easy to read while still being capable of real interactive software.