import { createWindow } from "../js/window-manager.js";
import { recordVisit } from "../js/lucid-state.js";

function createBrowser() {
    recordVisit("browser");

    const content = `
        <div class="lucid-browser">
            <div class="browser-top">
                <div class="browser-brand"><div class="browser-brand-symbol">◇</div><div><div class="browser-brand-name">lucid</div><div class="browser-brand-version">browser</div></div></div>
                <div class="browser-controls"><button class="browser-control" data-action="back" title="Back">←</button><button class="browser-control" data-action="forward" title="Forward">→</button><button class="browser-control" data-action="reload" title="Reload">↻</button></div>
                <div class="browser-address-shell"><span class="browser-address-icon">◇</span><input class="browser-address" value="lucid://home" spellcheck="false" autocomplete="off"></div>
                <button class="browser-menu-button">•••</button>
            </div>
            <div class="browser-body">
                <aside class="browser-tabs">
                    <button class="browser-tab active" data-tab="home"><span class="browser-tab-icon">◇</span><span class="browser-tab-text">Home</span><span class="browser-tab-close">×</span></button>
                    <button class="browser-add-tab" title="New tab">+</button>
                    <div class="browser-tabs-bottom"><button class="browser-side-button" data-side="bookmarks">☆<span>Bookmarks</span></button><button class="browser-side-button" data-side="history">◷<span>History</span></button></div>
                </aside>
                <main class="browser-page">
                    <section class="browser-home">
                        <div class="home-symbol">◇</div><h1>lucid</h1><p class="home-tagline">The quiet place between you and the internet.</p>
                        <div class="lucid-search"><span class="search-symbol">⌕</span><input class="home-search" placeholder="Search the web..." autocomplete="off"><button class="search-button">→</button></div>
                        <div class="home-links"><button data-url="https://github.com"><span>◆</span>GitHub</button><button data-url="https://wikipedia.org"><span>W</span>Wikipedia</button><button data-url="https://developer.mozilla.org"><span>MDN</span>MDN</button><button data-url="https://www.mozilla.org"><span>F</span>Mozilla</button></div>
                        <div class="home-status"><span class="status-dot"></span> Lucid Browser is ready</div>
                    </section>
                    <section class="browser-search-page" hidden><div class="search-page-inner"><div class="search-page-logo">◇ lucid</div><h2 class="search-query-title">Search</h2><p class="search-query-text"></p><div class="search-result-card"><div class="result-icon">↗</div><div><strong>Search the web</strong><p>Choose a search engine or open the results externally.</p></div><button class="open-search" data-engine="google">Google</button><button class="open-search" data-engine="bing">Bing</button><button class="open-search" data-engine="duckduckgo">DuckDuckGo</button></div></div></section>
                    <section class="browser-list-page" hidden><div class="search-page-inner"><div class="search-page-logo">◇ lucid</div><h2 class="browser-list-title"></h2><div class="browser-list"></div></div></section>
                    <div class="browser-web-tools" hidden><span class="browser-web-status">Web page</span><button class="browser-external-button">↗ Open externally</button><button class="browser-bookmark-button">☆ Bookmark</button></div>
                    <iframe class="browser-frame" hidden title="Lucid Browser web view"></iframe>
                </main>
            </div>
        </div>
    `;

    const windowElement = createWindow("◇ Lucid Browser", content);
    const address = windowElement.querySelector(".browser-address");
    const home = windowElement.querySelector(".browser-home");
    const searchPage = windowElement.querySelector(".browser-search-page");
    const listPage = windowElement.querySelector(".browser-list-page");
    const listTitle = windowElement.querySelector(".browser-list-title");
    const list = windowElement.querySelector(".browser-list");
    const frame = windowElement.querySelector(".browser-frame");
    const webTools = windowElement.querySelector(".browser-web-tools");
    const webStatus = windowElement.querySelector(".browser-web-status");
    const externalButton = windowElement.querySelector(".browser-external-button");
    const bookmarkButton = windowElement.querySelector(".browser-bookmark-button");
    const homeSearch = windowElement.querySelector(".home-search");
    const searchButton = windowElement.querySelector(".search-button");
    const queryText = windowElement.querySelector(".search-query-text");
    const tabText = windowElement.querySelector(".browser-tab-text");
    const visitHistory = [];
    const bookmarks = [];
    let historyIndex = -1;
    let currentUrl = "lucid://home";

    function setTab(title) { tabText.textContent = title || "Web page"; }
    function addHistory(value) { if (historyIndex >= 0 && visitHistory[historyIndex] === value) return; visitHistory.splice(historyIndex + 1); visitHistory.push(value); historyIndex = visitHistory.length - 1; }
    function showHome(push = true) { home.hidden = false; searchPage.hidden = true; listPage.hidden = true; frame.hidden = true; webTools.hidden = true; frame.src = "about:blank"; address.value = "lucid://home"; currentUrl = "lucid://home"; setTab("Home"); if (push) addHistory(currentUrl); }
    function showSearch(query, push = true) { const cleanQuery = query.trim(); if (!cleanQuery) return; currentUrl = "search.lucid/" + encodeURIComponent(cleanQuery); home.hidden = true; searchPage.hidden = false; listPage.hidden = true; frame.hidden = true; webTools.hidden = true; queryText.textContent = `"${cleanQuery}"`; address.value = currentUrl; setTab(cleanQuery); if (push) addHistory(currentUrl); }
    function showList(title, entries) { home.hidden = true; searchPage.hidden = true; listPage.hidden = false; frame.hidden = true; webTools.hidden = true; listTitle.textContent = title; list.innerHTML = entries.length ? entries.map((entry,index) => `<button class="browser-list-item" data-index="${index}"><strong>${entry.title}</strong><span>${entry.url}</span></button>`).join("") : `<div class="browser-list-empty">Nothing here yet.</div>`; list.querySelectorAll(".browser-list-item").forEach(button => button.addEventListener("click", () => openWebsite(entries[Number(button.dataset.index)].url))); }
    function showWebTools() { webTools.hidden = false; webStatus.textContent = currentUrl; bookmarkButton.textContent = bookmarks.some(item => item.url === currentUrl) ? "★ Bookmarked" : "☆ Bookmark"; }
    function openWebsite(value, push = true) { let url = String(value || "").trim(); if (!url) return; if (!/^https?:\/\//i.test(url)) url = "https://" + url; try { new URL(url); } catch { return showSearch(url); } home.hidden = true; searchPage.hidden = true; listPage.hidden = true; frame.hidden = false; currentUrl = url; address.value = url; setTab(new URL(url).hostname.replace(/^www\./, "") || "Web page"); frame.src = url; showWebTools(); if (push) addHistory(url); }
    function openExternal(url = currentUrl) { if (/^https?:\/\//i.test(url)) window.open(url, "_blank", "noopener,noreferrer"); }
    function navigateHistory(index) { if (index < 0 || index >= visitHistory.length) return; historyIndex = index; const value = visitHistory[index]; if (value === "lucid://home") showHome(false); else if (value.startsWith("search.lucid/")) showSearch(decodeURIComponent(value.slice(13)), false); else openWebsite(value, false); }
    function performSearch() { const query = homeSearch.value.trim(); if (query) showSearch(query); }

    address.addEventListener("keydown", event => { if (event.key !== "Enter") return; const value = address.value.trim(); if (value === "lucid://home") showHome(); else if (value.startsWith("search.lucid/")) showSearch(decodeURIComponent(value.slice(13))); else if (/^https?:\/\//i.test(value) || value.includes(".")) openWebsite(value); else showSearch(value); });
    homeSearch.addEventListener("keydown", event => { if (event.key === "Enter") performSearch(); });
    searchButton.addEventListener("click", performSearch);
    windowElement.querySelectorAll(".open-search").forEach(button => button.addEventListener("click", () => { const query = currentUrl.startsWith("search.lucid/") ? decodeURIComponent(currentUrl.slice(13)) : homeSearch.value.trim(); const engine = button.dataset.engine; const base = engine === "bing" ? "https://www.bing.com/search?q=" : engine === "duckduckgo" ? "https://duckduckgo.com/?q=" : "https://www.google.com/search?q="; openExternal(base + encodeURIComponent(query)); }));
    externalButton.addEventListener("click", () => openExternal());
    bookmarkButton.addEventListener("click", () => { if (!/^https?:\/\//i.test(currentUrl)) return; const index = bookmarks.findIndex(item => item.url === currentUrl); if (index >= 0) bookmarks.splice(index, 1); else bookmarks.push({ title: tabText.textContent, url: currentUrl }); showWebTools(); });
    windowElement.querySelector("[data-side=bookmarks]").addEventListener("click", () => showList("Bookmarks", bookmarks));
    windowElement.querySelector("[data-side=history]").addEventListener("click", () => showList("History", visitHistory.filter(url => url !== "lucid://home").map(url => ({ title: url.startsWith("search.lucid/") ? decodeURIComponent(url.slice(13)) : url, url }))));
    windowElement.querySelectorAll(".home-links button").forEach(button => button.addEventListener("click", () => openWebsite(button.dataset.url)));
    windowElement.querySelectorAll(".browser-control").forEach(button => button.addEventListener("click", () => { const action = button.dataset.action; if (action === "reload") { if (currentUrl.startsWith("http")) frame.src = currentUrl; else showHome(); } if (action === "back") { if (historyIndex > 0) navigateHistory(historyIndex - 1); else showHome(); } if (action === "forward" && historyIndex < visitHistory.length - 1) navigateHistory(historyIndex + 1); }));
    windowElement.querySelector(".browser-add-tab").addEventListener("click", () => { showHome(); homeSearch.focus(); });
    windowElement.querySelector(".browser-tab-close").addEventListener("click", () => windowElement.remove());
    windowElement.querySelector(".browser-menu-button").addEventListener("click", () => showList("Browser", [{ title: "Home", url: "lucid://home" }, ...bookmarks, { title: "Clear history", url: "lucid://clear-history" }]));
    showHome();
    setTimeout(() => homeSearch.focus(), 100);
    return windowElement;
}

export { createBrowser };