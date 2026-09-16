let sounds = []
let soundTimer = null
let currentAudio = null
let previousSound = null

const folders = {
    intro: "audio/intro/",
    liminal: "audio/liminal/",
    uneasy: "audio/uneasy/",
    sunnyday: "audio/sunnyday/",
    nostalgia: "audio/nostalgia/",
    darkhallway: "audio/darkhallway/",
    funnycreepy: "audio/funnycreepy/",
    hallucinations: "audio/hallucinations/",
    death: "audio/death/"
}

const soundFiles = [
    { name: "intro", type: "intro", file: "intro.mp3", points: 79875 },
    { name: "liminal_01", type: "liminal", file: "empty.mp3" },
    { name: "uneasy_01", type: "uneasy", file: "dreamcore.mp3" },
    { name: "sunny_01", type: "sunnyday", file: "dream.mp3" },
    { name: "nostalgia_01", type: "nostalgia", file: "also empty.mp3" },
    { name: "hallway_01", type: "darkhallway", file: "again also empty.mp3" },
    { name: "funny_01", type: "funnycreepy", file: "again.mp3" },
    { name: "hallucination_01", type: "hallucinations", file: "....mp3" },
    { name: "death", type: "death", file: "....mp3", points: 0 }
]

function randomPoints(used) {
    let number = Math.floor(Math.random() * 91) + 10

    while (used.includes(number)) {
        number = Math.floor(Math.random() * 91) + 10
    }

    return number
}

function loadSounds() {
    sounds = []

    let usedPoints = [999998, 0]

    for (let item of soundFiles) {
        let points = item.points

        if (points === undefined) {
            points = randomPoints(usedPoints)
            usedPoints.push(points)
        }

        sounds.push({
            name: item.name,
            type: item.type,
            file: folders[item.type] + item.file,
            points: points
        })
    }
}

function addPoints() {
    for (let sound of sounds) {
        if (sound.name === "intro") {
            continue
        }

        if (sound.name === "death") {
            sound.points += Math.floor(Math.random() * 7)
        } else {
            sound.points += Math.floor(Math.random() * 16) + 5
        }
    }
}

function chooseSound() {
    addPoints()

    let highest = -1
    let pick = []

    for (let sound of sounds) {
        if (sound.name === previousSound) {
            continue
        }

        if (sound.points > highest) {
            highest = sound.points
            pick = [sound]
        } else if (sound.points === highest) {
            pick.push(sound)
        }
    }

    if (pick.length === 0) {
        pick = sounds
    }

    return pick[Math.floor(Math.random() * pick.length)]
}

function playSound(sound) {
    if (!sound) return

    sound.points = 0
    previousSound = sound.name

    currentAudio = new Audio(sound.file)
    currentAudio.volume = 0.45

    currentAudio.onended = function() {
        scheduleSound()
    }

    currentAudio.play()
}

function scheduleSound() {
    if (soundTimer) {
        clearTimeout(soundTimer)
    }

    let wait = Math.floor(Math.random() * 30000) + 25000

    soundTimer = setTimeout(function() {
        let next = chooseSound()
        playSound(next)
    }, wait)
}

function startLucidAudio() {
    loadSounds()

    let intro = sounds.find(sound => sound.type === "intro")

    if (intro) {
        intro.points = 79875
        playSound(intro)
    }

    scheduleSound()
}

function stopLucidAudio() {
    clearTimeout(soundTimer)

    if (currentAudio) {
        currentAudio.pause()
        currentAudio = null
    }
}

function playChosenSound(name) {
    let sound = sounds.find(item => item.name === name)

    if (sound) {
        playSound(sound)
    }
}

function getSoundList() {
    return sounds
}

function setSoundVolume(value) {
    if (currentAudio) {
        currentAudio.volume = Math.max(0, Math.min(1, value))
    }
}

export {
    startLucidAudio,
    stopLucidAudio,
    playChosenSound,
    getSoundList,
    setSoundVolume
}
