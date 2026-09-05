import { createWindow } from "../js/window-manager.js";
import { recordVisit } from "../js/lucid-state.js";

function createBrowser() {
    recordVisit("browser");

    const content = `
        <div class="lucid-browser">
            <div class="browser-top">
                <div class="browser-brand">
                    <div class="browser-brand-symbol">◇</div>
                    <div>
                        <div class="browser-brand-name">lucid</div>
                        <div class="browser-brand-version">browser</div>
                    </div>
                </div>
                <div class="browser-controls">
                    <button class="browser-control" data-action="back" title="Back">←</button>
                    <button class="browser-control" data-action="forward" title="Forward">→</button>
                    <button class="browser-control" data-action="reload" title="Reload">↻</button>
                </div>
                <div class="browser-address-shell">
                    <span class="browser-address-icon">◇</span>
                    <input class="browser-address" value="lucid://home" spellcheck="false" autocomplete="off">
                </div>
                <button class="browser-menu-button">•••</button>
            </div>
            <div class="browser-body">
                <aside class="browser-tabs">
                    <button class="browser-tab active" data-tab="home">
                        <span class="browser-tab-icon">◇</span>
                        <span class="browser-tab-text">Home</span>
                        <span class="browser-tab-close">×</span>
                    </button>
                    <button class="browser-add-tab" title="New tab">+</button>
                    <div class="browser-tabs-bottom">
                        <button class="browser-side-button">☆<span>Bookmarks</span></button>
                        <button class="browser-side-button">◷<span>History</span></button>
                    </div>
                </aside>
                <main class="browser-page">
                    <section class="browser-home">
                        <div class="home-symbol">◇</div>
                        <h1>lucid</h1>
                        <p class="home-tagline">The quiet place between you and the internet.</p>
                        <div class="lucid-search">
                            <span class="search-symbol">⌕</span>
                            <input class="home-search" placeholder="Search the web..." autocomplete="off">
                            <button class="search-button">→</button>
                        </div>
                        <div class="home-links">
                            <button data-url="https://github.com"><span>◆</span>GitHub</button>
                            <button data-url="https://wikipedia.org"><span>W</span>Wikipedia</button>
                            <button data-url="https://example.com"><span>◇</span>Example</button>
                        </div>
                        <div class="home-status">
                            <span class="status-dot"></span> Lucid Browser is ready
                        </div>
                    </section>
                    <section class="browser-search-page" hidden>
                        <div class="search-page-inner">
                            <div class="search-page-logo">◇ lucid</div>
                            <h2 class="search-query-title">Search</h2>
                            <p class="search-query-text"></p>
                            <div class="search-result-card">
                                <div class="result-icon">↗</div>
                                <div>
                                    <strong>Search the web</strong>
                                    <p>Continue this search using the web search service.</p>
                                </div>
                                <button class="open-search">Open results</button>
                            </div>
                        </div>
                    </section>
                    <iframe class="browser-frame" hidden title="Lucid Browser web view"></iframe>
                </main>
            </div>
        </div>
    `;

    const windowElement = createWindow("◇ Lucid Browser", content);

    const address = windowElement.querySelector(".browser-address");
    const home = windowElement.querySelector(".browser-home");
    const searchPage = windowElement.querySelector(".browser-search-page");
    const frame = windowElement.querySelector(".browser-frame");
    const homeSearch = windowElement.querySelector(".home-search");
    const searchButton = windowElement.querySelector(".search-button");
    const queryText = windowElement.querySelector(".search-query-text");
    const openSearch = windowElement.querySelector(".open-search");
    const tab = windowElement.querySelector(".browser-tab");

    let currentSearch = "";
    let history = [];
    let historyIndex = -1;

    function showHome() {
        home.hidden = false;
        searchPage.hidden = true;
        frame.hidden = true;
        frame.src = "about:blank";
        address.value = "lucid://home";
        tab.querySelector(".browser-tab-text").textContent = "Home";
    }

    function showSearch(query) {
        currentSearch = query.trim();
        if (!currentSearch) return;

        home.hidden = true;
        searchPage.hidden = false;
        frame.hidden = true;

        queryText.textContent = `"${currentSearch}"`;
        address.value = "search.lucid/" + encodeURIComponent(currentSearch);
        tab.querySelector(".browser-tab-text").textContent = currentSearch;

        history.push("search:" + currentSearch);
        historyIndex = history.length - 1;
    }

    function openWebsite(url) {
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }

        home.hidden = true;
        searchPage.hidden = true;
        frame.hidden = false;
        frame.src = url;

        address.value = url;
        tab.querySelector(".browser-tab-text").textContent = "Web page";

        history.push(url);
        historyIndex = history.length - 1;
    }

    address.addEventListener("keydown", event => {
        if (event.key !== "Enter") return;

        const value = address.value.trim();
        if (!value) return;

        if (value === "lucid://home") {
            showHome();
            return;
        }

        if (value.startsWith("search.lucid/")) {
            const query = decodeURIComponent(value.substring(13));
            showSearch(query);
            return;
        }

        if (value.includes("://") || value.includes(".")) {
            openWebsite(value);
            return;
        }

        showSearch(value);
    });

    function performSearch() {
        const query = homeSearch.value.trim();
        if (!query) return;
        showSearch(query);
    }

    homeSearch.addEventListener("keydown", event => {
        if (event.key === "Enter") performSearch();
    });

    searchButton.addEventListener("click", performSearch);

    openSearch.addEventListener("click", () => {
        const url = "https://www.google.com/search?q=" + encodeURIComponent(currentSearch);
        window.open(url, "_blank");
    });

    windowElement.querySelectorAll(".home-links button").forEach(button => {
        button.addEventListener("click", () => openWebsite(button.dataset.url));
    });

    windowElement.querySelectorAll(".browser-control").forEach(button => {
        button.addEventListener("click", () => {
            const action = button.dataset.action;

            if (action === "reload") {
                if (!frame.hidden) frame.src = frame.src;
                else showHome();
                return;
            }

            if (action === "back") {
                if (historyIndex <= 0) { showHome(); return; }
                historyIndex--;
                const previous = history[historyIndex];
                if (previous.startsWith("search:")) showSearch(previous.substring(7));
                else openWebsite(previous);
            }

            if (action === "forward") {
                if (historyIndex >= history.length - 1) return;
                historyIndex++;
                const next = history[historyIndex];
                if (next.startsWith("search:")) showSearch(next.substring(7));
                else openWebsite(next);
            }
        });
    });

    windowElement.querySelector(".browser-add-tab").addEventListener("click", () => {
        showHome();
        homeSearch.focus();
    });

    windowElement.querySelector(".browser-tab-close").addEventListener("click", () => {
        windowElement.remove();
    });

    setTimeout(() => homeSearch.focus(), 100);

    return windowElement;
}

export { createBrowser };