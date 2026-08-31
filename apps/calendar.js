import {
    createWindow
} from "../js/window-manager.js";

import {
    notifyAnomalyEngine
} from "../js/anomaly-engine.js";


const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];


const DAYS = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
];


function createCalendar() {

    notifyAnomalyEngine(
        "calendar-opened"
    );


    const content = `

        <div class="lucid-calendar">

            <div class="calendar-toolbar">

                <button
                    class="calendar-today"
                >
                    Today
                </button>

                <div class="calendar-navigation">

                    <button
                        class="calendar-prev"
                    >
                        ←
                    </button>

                    <h2
                        class="calendar-title"
                    >
                    </h2>

                    <button
                        class="calendar-next"
                    >
                        →
                    </button>

                </div>

            </div>


            <div class="calendar-layout">

                <div class="calendar-main">

                    <div class="calendar-weekdays">

                        ${DAYS.map(
                            day =>
                                `<div>${day}</div>`
                        ).join("")}

                    </div>


                    <div
                        class="calendar-days"
                    >
                    </div>

                </div>


                <aside class="calendar-sidebar">

                    <h3>
                        Events
                    </h3>

                    <div
                        class="calendar-selected-date"
                    >
                        Select a day
                    </div>


                    <div
                        class="calendar-events"
                    >
                    </div>


                    <div
                        class="calendar-event-form"
                        hidden
                    >

                        <input
                            class="calendar-event-input"
                            placeholder="Event name..."
                        >

                        <button
                            class="calendar-add-event"
                        >
                            Add event
                        </button>

                    </div>

                </aside>

            </div>

        </div>

    `;


    const windowElement =
        createWindow(
            "📅 Calendar",
            content
        );


    const title =
        windowElement.querySelector(
            ".calendar-title"
        );


    const daysContainer =
        windowElement.querySelector(
            ".calendar-days"
        );


    const selectedDate =
        windowElement.querySelector(
            ".calendar-selected-date"
        );


    const eventsContainer =
        windowElement.querySelector(
            ".calendar-events"
        );


    const eventForm =
        windowElement.querySelector(
            ".calendar-event-form"
        );


    const eventInput =
        windowElement.querySelector(
            ".calendar-event-input"
        );


    const addEventButton =
        windowElement.querySelector(
            ".calendar-add-event"
        );


    const todayButton =
        windowElement.querySelector(
            ".calendar-today"
        );


    const previousButton =
        windowElement.querySelector(
            ".calendar-prev"
        );


    const nextButton =
        windowElement.querySelector(
            ".calendar-next"
        );


    let currentDate =
        new Date();


    let selectedDay =
        new Date();


    let events =
        JSON.parse(
            localStorage.getItem(
                "lucid_calendar_events"
            ) || "{}"
        );


    /* =========================
       DATE KEY
    ========================= */

    function dateKey(date) {

        return [
            date.getFullYear(),
            String(
                date.getMonth() + 1
            ).padStart(2, "0"),
            String(
                date.getDate()
            ).padStart(2, "0")
        ].join("-");

    }


    /* =========================
       SAVE EVENTS
    ========================= */

    function saveEvents() {

        localStorage.setItem(
            "lucid_calendar_events",
            JSON.stringify(events)
        );

    }


    /* =========================
       RENDER CALENDAR
    ========================= */

    function renderCalendar() {

        const year =
            currentDate.getFullYear();


        const month =
            currentDate.getMonth();


        title.textContent =
            MONTHS[month] +
            " " +
            year;


        daysContainer.innerHTML =
            "";


        const firstDay =
            new Date(
                year,
                month,
                1
            ).getDay();


        const daysInMonth =
            new Date(
                year,
                month + 1,
                0
            ).getDate();


        for (
            let i = 0;
            i < firstDay;
            i++
        ) {

            const empty =
                document.createElement(
                    "div"
                );


            empty.className =
                "calendar-day empty";


            daysContainer.appendChild(
                empty
            );

        }


        for (
            let day = 1;
            day <= daysInMonth;
            day++
        ) {

            const date =
                new Date(
                    year,
                    month,
                    day
                );


            const cell =
                document.createElement(
                    "button"
                );


            cell.className =
                "calendar-day";


            cell.textContent =
                day;


            const key =
                dateKey(date);


            if (
                key ===
                dateKey(new Date())
            ) {

                cell.classList.add(
                    "today"
                );

            }


            if (
                key ===
                dateKey(selectedDay)
            ) {

                cell.classList.add(
                    "selected"
                );

            }


            if (
                events[key] &&
                events[key].length
            ) {

                cell.classList.add(
                    "has-events"
                );

            }


            cell.addEventListener(
                "click",
                function () {

                    selectedDay =
                        date;

                    renderCalendar();

                    renderEvents();

                    notifyAnomalyEngine(
                        "calendar-day-selected",
                        {
                            date: key
                        }
                    );

                }
            );


            daysContainer.appendChild(
                cell
            );

        }

    }


    /* =========================
       EVENTS
    ========================= */

    function renderEvents() {

        const key =
            dateKey(selectedDay);


        selectedDate.textContent =
            selectedDay.toLocaleDateString(
                undefined,
                {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }
            );


        eventsContainer.innerHTML =
            "";


        const dayEvents =
            events[key] || [];


        if (
            dayEvents.length === 0
        ) {

            const empty =
                document.createElement(
                    "p"
                );


            empty.className =
                "calendar-no-events";


            empty.textContent =
                "No events";


            eventsContainer.appendChild(
                empty
            );

        }


        dayEvents.forEach(
            function (event, index) {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "calendar-event";


                item.innerHTML = `

                    <span>
                        ${event}
                    </span>

                    <button
                        data-index="${index}"
                    >
                        ×
                    </button>

                `;


                item.querySelector(
                    "button"
                ).addEventListener(
                    "click",
                    function () {

                        events[key].splice(
                            index,
                            1
                        );


                        if (
                            events[key].length === 0
                        ) {

                            delete events[key];

                        }


                        saveEvents();

                        renderCalendar();

                        renderEvents();

                    }
                );


                eventsContainer.appendChild(
                    item
                );

            }
        );


        eventForm.hidden =
            false;

    }


    /* =========================
       ADD EVENT
    ========================= */

    addEventButton.addEventListener(
        "click",
        function () {

            const value =
                eventInput.value.trim();


            if (!value) {
                return;
            }


            const key =
                dateKey(selectedDay);


            if (!events[key]) {

                events[key] = [];

            }


            events[key].push(
                value
            );


            saveEvents();


            eventInput.value =
                "";


            renderCalendar();

            renderEvents();


            notifyAnomalyEngine(
                "calendar-event-created",
                {
                    date: key,
                    event: value
                }
            );

        }
    );


    /* =========================
       NAVIGATION
    ========================= */

    previousButton.addEventListener(
        "click",
        function () {

            currentDate.setMonth(
                currentDate.getMonth() - 1
            );

            renderCalendar();

        }
    );


    nextButton.addEventListener(
        "click",
        function () {

            currentDate.setMonth(
                currentDate.getMonth() + 1
            );

            renderCalendar();

        }
    );


    todayButton.addEventListener(
        "click",
        function () {

            currentDate =
                new Date();

            selectedDay =
                new Date();

            renderCalendar();

            renderEvents();

        }
    );


    renderCalendar();

    renderEvents();


    return windowElement;
}


export {
    createCalendar
};
