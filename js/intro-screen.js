let introFinished = false
let introSkipped = false
let introAnimation = null
let introTimers = []

function rememberTimer(callback, delay) {
    const timer = setTimeout(() => {
        introTimers = introTimers.filter(item => item !== timer)
        callback()
    }, delay)
    introTimers.push(timer)
    return timer
}

function clearIntroTimers() {
    introTimers.forEach(timer => clearTimeout(timer))
    introTimers = []
}

function finishIntro(screen) {
    if (introFinished || introSkipped) return

    screen.classList.add("intro-ending")
    rememberTimer(() => {
        if (introSkipped) return
        screen.remove()
        introFinished = true
        console.info("[Lucid Intro] finished")
        window.dispatchEvent(new Event("lucid-intro-finished"))
    }, 900)
}

function skipIntro(screen) {
    if (introFinished) return

    introSkipped = true
    introFinished = true
    clearIntroTimers()

    if (introAnimation) {
        cancelAnimationFrame(introAnimation)
        introAnimation = null
    }

    screen.classList.add("intro-skipped")
    console.info("[Lucid Intro] skipped by user")
    window.dispatchEvent(new Event("lucid-intro-skipped"))

    const finishTimer = setTimeout(() => {
        screen.remove()
        window.dispatchEvent(new Event("lucid-intro-finished"))
    }, 320)
    introTimers.push(finishTimer)
}

const closedEye = "M40,90 Q160,90 280,90 Q160,90 40,90 Z"
const openEye = "M40,90 Q160,20 280,90 Q160,160 40,90 Z"

function lidShape(open) {
    const amount = Math.max(0, Math.min(1, open))
    const top = 90 - 70 * amount
    const bottom = 90 + 70 * amount
    return `M40,90 Q160,${top} 280,90 Q160,${bottom} 40,90 Z`
}

function smoothStep(value) {
    return value * value * (3 - 2 * value)
}

function easeOut(value) {
    return 1 - Math.pow(1 - value, 3)
}

function animateEye(eye, softEye, clip, message, screen) {
    const start = performance.now()
    const totalTime = 3400

    function frame(now) {
        if (introSkipped || introFinished) return

        let progress = (now - start) / totalTime
        if (progress > 1) progress = 1

        let openAmount = 0

        if (progress < 0.22) {
            openAmount = 0
        } else if (progress < 0.48) {
            openAmount = easeOut((progress - 0.22) / 0.26)
        } else if (progress < 0.62) {
            openAmount = 1
        } else if (progress < 0.70) {
            openAmount = 1 - smoothStep((progress - 0.62) / 0.08)
        } else if (progress < 0.77) {
            openAmount = smoothStep((progress - 0.70) / 0.07)
        } else if (progress < 0.90) {
            openAmount = 1
        } else {
            openAmount = smoothStep((progress - 0.90) / 0.10)
        }

        const shape = lidShape(openAmount)
        eye.setAttribute("d", shape)
        softEye.setAttribute("d", shape)
        clip.setAttribute("d", shape)

        if (progress < 1) {
            introAnimation = requestAnimationFrame(frame)
            return
        }

        eye.setAttribute("d", openEye)
        softEye.setAttribute("d", openEye)
        clip.setAttribute("d", openEye)

        rememberTimer(() => {
            if (!introSkipped && !introFinished) showWelcome(message, screen)
        }, 260)
    }

    introAnimation = requestAnimationFrame(frame)
}

function createIntroScreen() {
    if (document.querySelector(".lucid-intro-screen")) return

    const screen = document.createElement("div")
    screen.className = "lucid-intro-screen"

    screen.innerHTML = `
        <div class="intro-noise"></div>
        <div class="intro-corner intro-corner-top">LUCID / BOOT</div>
        <div class="intro-corner intro-corner-bottom">SYSTEM 0.2</div>

        <div class="click-start">
            <div class="click-text">click to wake it</div>
        </div>

        <div class="intro-core">
            <div class="intro-orbit intro-orbit-wide"></div>
            <div class="intro-orbit intro-orbit-tight"></div>
            <div class="intro-tick-ring"></div>

            <div class="intro-eye-wrap">
                <svg class="intro-eye" viewBox="0 0 320 180" aria-hidden="true">
                    <defs>
                        <filter id="eyeGlow">
                            <feGaussianBlur stdDeviation="1.2" result="blur"/>
                            <feMerge>
                                <feMergeNode in="blur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                        <clipPath id="eyeClip">
                            <path id="clipShape" d="${closedEye}"/>
                        </clipPath>
                    </defs>
                    <path id="softEye" d="${closedEye}" class="soft-eye"/>
                    <path id="eyeShape" d="${closedEye}" class="main-eye"/>
                    <g clip-path="url(#eyeClip)">
                        <circle class="eye-light" cx="160" cy="90" r="39"/>
                        <circle class="eye-pupil" cx="160" cy="90" r="13"/>
                        <circle class="eye-reflection" cx="150" cy="80" r="4"/>
                    </g>
                </svg>
            </div>
        </div>

        <div class="intro-message"></div>
        <button class="intro-skip" type="button">skip intro</button>
    `

    document.body.appendChild(screen)

    const clickStart = screen.querySelector(".click-start")
    const skipButton = screen.querySelector(".intro-skip")
    const core = screen.querySelector(".intro-core")
    const wrap = screen.querySelector(".intro-eye-wrap")
    const eye = screen.querySelector("#eyeShape")
    const softEye = screen.querySelector("#softEye")
    const clip = screen.querySelector("#clipShape")
    const message = screen.querySelector(".intro-message")

    clickStart.addEventListener("click", () => {
        if (introSkipped || introFinished) return

        clickStart.classList.add("click-hidden")
        screen.classList.add("intro-awake")
        core.classList.add("core-awake")
        console.info("[Lucid Intro] wake sequence started")

        rememberTimer(() => {
            if (!introSkipped && !introFinished) {
                window.dispatchEvent(new Event("lucid-intro-started"))
            }
        }, 650)

        rememberTimer(() => {
            if (!introSkipped && !introFinished) {
                wrap.classList.add("visible")
            }
        }, 360)

        rememberTimer(() => {
            if (!introSkipped && !introFinished) {
                animateEye(eye, softEye, clip, message, screen)
            }
        }, 720)
    }, { once: true })

    skipButton.addEventListener("click", event => {
        event.stopPropagation()
        skipIntro(screen)
    })
}

function showWelcome(message, screen) {
    if (introSkipped || introFinished) return

    message.classList.add("message-visible")

    const text = "LUCID OS"
    let i = 0

    function addLetter() {
        if (introSkipped || introFinished) return

        if (i >= text.length) {
            rememberTimer(() => finishIntro(screen), 700)
            return
        }

        const span = document.createElement("span")
        span.textContent = text[i]
        message.appendChild(span)

        rememberTimer(() => {
            if (!introSkipped && !introFinished) {
                span.classList.add("letter-show")
            }
        }, 30)

        if (Math.random() > 0.78) {
            span.classList.add("letter-flicker")
        }

        i++
        rememberTimer(addLetter, 120 + Math.random() * 80)
    }

    addLetter()
}

function hasIntroFinished() {
    return introFinished
}

export {
    createIntroScreen,
    hasIntroFinished
}
