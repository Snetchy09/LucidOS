let introFinished = false

const closedEye = "M40,90 Q160,90 280,90 Q160,90 40,90 Z"
const openEye = "M40,90 Q160,18 280,90 Q160,162 40,90 Z"

function lidShape(open) {
    if (open < 0) open = 0
    if (open > 1) open = 1

    let top = 90 - 72 * open
    let bottom = 90 + 72 * open

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
    const totalTime = 8200

    function frame(now) {
        let progress = (now - start) / totalTime

        if (progress > 1) progress = 1

        let openAmount = 0

        if (progress < 0.10) {
            openAmount = 0
        } else if (progress < 0.56) {
            let t = (progress - 0.10) / 0.46
            openAmount = easeOut(t)
        } else if (progress < 0.66) {
            openAmount = 1
        } else if (progress < 0.73) {
            let t = (progress - 0.66) / 0.07
            openAmount = 1 - smoothStep(t)
        } else if (progress < 0.81) {
            let t = (progress - 0.73) / 0.08
            openAmount = smoothStep(t)
        } else if (progress < 0.89) {
            openAmount = 1
        } else if (progress < 0.94) {
            let t = (progress - 0.89) / 0.05
            openAmount = 1 - smoothStep(t)
        } else {
            let t = (progress - 0.94) / 0.06
            openAmount = smoothStep(t)
        }

        let shape = lidShape(openAmount)

        eye.setAttribute("d", shape)
        softEye.setAttribute("d", shape)
        clip.setAttribute("d", shape)

        if (progress < 1) {
            requestAnimationFrame(frame)
        } else {
            eye.setAttribute("d", openEye)
            softEye.setAttribute("d", openEye)
            clip.setAttribute("d", openEye)

            setTimeout(() => {
                showWelcome(message, screen)
            }, 1000)
        }
    }

    requestAnimationFrame(frame)
}

function createIntroScreen() {
    if (document.querySelector(".lucid-intro-screen")) return

    const screen = document.createElement("div")
    screen.className = "lucid-intro-screen"

    screen.innerHTML = `
        <div class="click-start">
            <div class="click-text">click here dude</div>
        </div>

        <div class="intro-eye-wrap">
            <svg class="intro-eye" viewBox="0 0 320 180">
                <defs>
                    <filter id="eyeGlow">
                        <feGaussianBlur stdDeviation="0.9" result="blur"/>
                        <feMerge>
                            <feMergeNode in="blur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>

                    <filter id="bigEyeGlow">
                        <feGaussianBlur stdDeviation="2.8"/>
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
                    <circle class="eye-reflection" cx="151" cy="80" r="5"/>
                </g>
            </svg>
        </div>

        <div class="intro-message"></div>
    `

    document.body.appendChild(screen)

    const clickStart = screen.querySelector(".click-start")
    const wrap = screen.querySelector(".intro-eye-wrap")
    const eye = screen.querySelector("#eyeShape")
    const softEye = screen.querySelector("#softEye")
    const clip = screen.querySelector("#clipShape")
    const message = screen.querySelector(".intro-message")

    clickStart.addEventListener("click", () => {
        clickStart.classList.add("click-hidden")

        setTimeout(() => {
            window.dispatchEvent(new Event("lucid-intro-started"))
        }, 3000)

        setTimeout(() => {
            wrap.classList.add("visible")
        }, 900)

        setTimeout(() => {
            animateEye(eye, softEye, clip, message, screen)
        }, 1800)
    }, { once: true })
}

function showWelcome(message, screen) {
    message.classList.add("message-visible")

    const text = "Welcome"
    let i = 0

    function addLetter() {
        if (i >= text.length) {
            setTimeout(() => {
                screen.classList.add("intro-ending")

                setTimeout(() => {
                    screen.remove()
                    introFinished = true
                    window.dispatchEvent(new Event("lucid-intro-finished"))
                }, 2300)
            }, 2500)

            return
        }

        const span = document.createElement("span")
        span.textContent = text[i]
        message.appendChild(span)

        setTimeout(() => {
            span.classList.add("letter-show")
        }, 40)

        if (Math.random() > 0.65) {
            span.classList.add("letter-flicker")
        }

        i++

        setTimeout(addLetter, 250 + Math.random() * 180)
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
