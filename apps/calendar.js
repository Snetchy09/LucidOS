import { createWindow } from "../js/window-manager.js";
import { notifyAnomalyEngine } from "../js/anomaly-engine.js";
import { saveUserFile } from "../js/filesystem.js";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function createCalendar() {
    notifyAnomalyEngine("calendar-opened");

    const content = `
        <div class="lucid-calendar">
            <div class="calendar-toolbar"><button class="calendar-today">Today</button><div class="calendar-navigation"><button class="calendar-prev">←</button><h2 class="calendar-title"></h2><button class="calendar-next">→</button></div></div>
            <div class="calendar-layout"><div class="calendar-main"><div class="calendar-weekdays">${DAYS.map(day => `<div>${day}</div>`).join("")}</div><div class="calendar-days"></div></div><aside class="calendar-sidebar"><h3>Events</h3><div class="calendar-selected-date">Select a day</div><div class="calendar-events"></div><div class="calendar-event-form" hidden><input class="calendar-event-input" placeholder="Event name..."><button class="calendar-add-event">Add event</button></div></aside></div>
        </div>
    `;

    const windowElement = createWindow("📅 Calendar", content);
    const title = windowElement.querySelector(".calendar-title");
    const daysContainer = windowElement.querySelector(".calendar-days");
    const selectedDate = windowElement.querySelector(".calendar-selected-date");
    const eventsContainer = windowElement.querySelector(".calendar-events");
    const eventForm = windowElement.querySelector(".calendar-event-form");
    const eventInput = windowElement.querySelector(".calendar-event-input");
    const addEventButton = windowElement.querySelector(".calendar-add-event");
    const todayButton = windowElement.querySelector(".calendar-today");
    const previousButton = windowElement.querySelector(".calendar-prev");
    const nextButton = windowElement.querySelector(".calendar-next");

    let currentDate = new Date();
    let selectedDay = new Date();
    let events = readEvents();

    function dateKey(date) {
        return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
    }

    function readEvents() {
        try {
            return JSON.parse(localStorage.getItem("lucid_calendar_events") || "{}");
        } catch {
            return {};
        }
    }

    function saveEvents() {
        const data = JSON.stringify(events, null, 2);
        localStorage.setItem("lucid_calendar_events", data);
        saveUserFile(["Documents", "Calendar"], "events.json", data, "application/json").catch(error => console.warn("Calendar file save failed:", error));
    }

    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        title.textContent = `${MONTHS[month]} ${year}`;
        daysContainer.innerHTML = "";
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement("div");
            empty.className = "calendar-day empty";
            daysContainer.appendChild(empty);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const cell = document.createElement("button");
            const key = dateKey(date);
            cell.className = "calendar-day";
            cell.textContent = day;
            if (key === dateKey(new Date())) cell.classList.add("today");
            if (key === dateKey(selectedDay)) cell.classList.add("selected");
            if (events[key]?.length) cell.classList.add("has-events");
            cell.addEventListener("click", () => {
                selectedDay = date;
                renderCalendar();
                renderEvents();
                notifyAnomalyEngine("calendar-day-selected", { date: key });
            });
            daysContainer.appendChild(cell);
        }
    }

    function renderEvents() {
        const key = dateKey(selectedDay);
        selectedDate.textContent = selectedDay.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        eventsContainer.innerHTML = "";
        const dayEvents = events[key] || [];

        if (!dayEvents.length) {
            const empty = document.createElement("p");
            empty.className = "calendar-no-events";
            empty.textContent = "No events";
            eventsContainer.appendChild(empty);
        }

        dayEvents.forEach((event, index) => {
            const item = document.createElement("div");
            item.className = "calendar-event";
            item.innerHTML = `<span>${escapeHTML(event)}</span><button data-index="${index}">×</button>`;
            item.querySelector("button").addEventListener("click", () => {
                events[key].splice(index, 1);
                if (!events[key].length) delete events[key];
                saveEvents();
                renderCalendar();
                renderEvents();
            });
            eventsContainer.appendChild(item);
        });
        eventForm.hidden = false;
    }

    addEventButton.addEventListener("click", () => {
        const value = eventInput.value.trim();
        if (!value) return;
        const key = dateKey(selectedDay);
        if (!events[key]) events[key] = [];
        events[key].push(value);
        saveEvents();
        eventInput.value = "";
        renderCalendar();
        renderEvents();
        notifyAnomalyEngine("calendar-event-created", { date: key, event: value });
    });

    previousButton.addEventListener("click", () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextButton.addEventListener("click", () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    todayButton.addEventListener("click", () => {
        currentDate = new Date();
        selectedDay = new Date();
        renderCalendar();
        renderEvents();
    });

    function escapeHTML(text) {
        return String(text ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
    }

    renderCalendar();
    renderEvents();
    return windowElement;
}

export { createCalendar };