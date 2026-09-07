import { supabase, getCurrentUser } from "./lucid-store-api.js";
const observer = new MutationObserver(() => { setupAuth(); setupAccount(); });
observer.observe(document.body, { childList: true, subtree: true });
setupAuth();
setupAccount();
if (supabase) supabase.auth.onAuthStateChange(event => { if (event === "PASSWORD_RECOVERY") showPasswordReset(); refreshAccountUI(); });
function setupAuth() { if (!window.lucidAuth) window.lucidAuth = { open: showAuthDialog }; }
function refreshAccountUI() { document.querySelectorAll('.settings-page[data-page-content="account"]').forEach(page => { page.dataset.accountReady = ""; setupAccount(); }); }
async function showAuthDialog(mode = "signin") {
    if (document.querySelector(".lucid-auth-overlay")) return;
    const overlay = document.createElement("div");
    overlay.className = "lucid-account-overlay lucid-auth-overlay";
    overlay.innerHTML = `<div class="lucid-account-dialog lucid-auth-dialog"><button class="lucid-dialog-close" type="button">×</button><div class="account-plan-label">LUCID ACCOUNT</div><div class="studio-auth-tabs"><button type="button" class="studio-auth-tab" data-mode="signup">Create account</button><button type="button" class="studio-auth-tab" data-mode="signin">Sign in</button></div><div class="lucid-auth-form"></div></div>`;
    document.body.appendChild(overlay);
    const render = currentMode => {
        const signup = currentMode === "signup";
        overlay.querySelectorAll(".studio-auth-tab").forEach(button => button.classList.toggle("active", button.dataset.mode === currentMode));
        overlay.querySelector(".lucid-auth-form").innerHTML = `<h2>${signup ? "Create your Lucid account" : "Welcome back"}</h2>${signup ? '<label>Username<input id="lucid-auth-username" type="text" maxlength="32" autocomplete="username"></label><label>Display name<input id="lucid-auth-display-name" type="text" maxlength="48"></label>' : ""}<label>Email<input id="lucid-auth-email" type="email" autocomplete="email"></label><label>Password<input id="lucid-auth-password" type="password" autocomplete="${signup ? "new-password" : "current-password"}"></label>${signup ? '<div class="studio-security-warning"><strong>Security notice</strong><span>Use a unique password that you do not use on other websites.</span></div>' : '<button type="button" class="studio-forgot-password">Forgot password?</button>'}<button type="button" class="lucid-account-primary" id="lucid-auth-submit">${signup ? "Create account" : "Sign in"}</button><div class="lucid-account-message" id="lucid-auth-message"></div>`;
        overlay.querySelector("#lucid-auth-submit").addEventListener("click", () => submitAuth(signup, overlay));
        overlay.querySelector(".studio-forgot-password")?.addEventListener("click", () => sendReset(overlay));
    };
    overlay.querySelectorAll(".studio-auth-tab").forEach(button => button.addEventListener("click", () => render(button.dataset.mode)));
    const close = () => overlay.remove();
    overlay.querySelector(".lucid-dialog-close").addEventListener("click", close);
    overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
    render(mode);
}
async function submitAuth(signup, overlay) {
    const email = overlay.querySelector("#lucid-auth-email").value.trim();
    const password = overlay.querySelector("#lucid-auth-password").value;
    const message = overlay.querySelector("#lucid-auth-message");
    if (!email || !password) { message.textContent = "Enter your email and password."; return; }
    if (password.length < 8) { message.textContent = "Your password must be at least 8 characters."; return; }
    try {
        message.textContent = signup ? "Creating account..." : "Signing in...";
        const result = signup ? await supabase.auth.signUp({ email, password, options: { data: { username: overlay.querySelector("#lucid-auth-username").value.trim(), display_name: overlay.querySelector("#lucid-auth-display-name").value.trim() } } }) : await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        if (signup && !result.data.session) { message.textContent = "Account created. Check your email to confirm your account."; return; }
        overlay.remove();
        refreshAccountUI();
        document.dispatchEvent(new CustomEvent("lucid-account-changed"));
    } catch (error) { message.textContent = error.message || "Unable to complete account access."; }
}
async function sendReset(overlay) {
    const email = overlay.querySelector("#lucid-auth-email").value.trim();
    const message = overlay.querySelector("#lucid-auth-message");
    if (!email) { message.textContent = "Enter your email first."; return; }
    message.textContent = "Sending reset link...";
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: "https://snetchy09.github.io/LucidOS/" });
    message.textContent = error ? error.message : "If that email has an account, a reset link has been sent.";
}
function showPasswordReset() {
    if (document.querySelector(".lucid-password-reset")) return;
    const overlay = document.createElement("div");
    overlay.className = "lucid-account-overlay lucid-password-reset";
    overlay.innerHTML = `<div class="lucid-account-dialog"><h2>Choose a new password</h2><p>Set a new password for your Lucid account.</p><label>New password<input id="lucid-new-password" type="password" autocomplete="new-password"></label><label>Confirm password<input id="lucid-confirm-password" type="password" autocomplete="new-password"></label><div class="lucid-account-message"></div><button class="lucid-account-primary" id="lucid-save-password">Change password</button></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector("#lucid-save-password").addEventListener("click", async () => {
        const password = overlay.querySelector("#lucid-new-password").value;
        const confirm = overlay.querySelector("#lucid-confirm-password").value;
        const message = overlay.querySelector(".lucid-account-message");
        if (password.length < 8) { message.textContent = "Your password must be at least 8 characters."; return; }
        if (password !== confirm) { message.textContent = "The passwords do not match."; return; }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) { message.textContent = error.message; return; }
        message.textContent = "Password changed. You can sign in with it now.";
        setTimeout(() => overlay.remove(), 1200);
    });
}
async function setupAccount() {
    const page = document.querySelector('.settings-page[data-page-content="account"]');
    if (!page || page.dataset.accountReady === "true") return;
    const save = page.querySelector(".save-account");
    if (!save) return;
    page.dataset.accountReady = "true";
    const user = await getCurrentUser();
    const description = page.querySelector("h2 + p");
    if (description) description.textContent = user?.email || "Your Lucid account";
    const plan = String(user?.app_metadata?.plan || user?.app_metadata?.subscription || "free").toLowerCase();
    const plus = ["pro", "premium", "subscriber"].includes(plan);
    const card = document.createElement("section");
    card.className = "account-plan-card";
    card.innerHTML = `<div><span class="account-plan-label">LUCID PLUS</span><h3>${plus ? "Plus plan" : "Free plan"}</h3><p>${plus ? "1 GB publishing limit and larger developer features." : "100 MB publishing limit and access to the Lucid Store."}</p></div><button type="button" class="account-plan-button">${plus ? "Manage Plus" : "Upgrade to Plus"}</button>`;
    save.closest(".setting-row")?.insertAdjacentElement("afterend", card);
    card.querySelector(".account-plan-button").addEventListener("click", async () => {
        const user = await getCurrentUser();
        if (!user) { await showAuthDialog("signup"); return; }
        showPlans(plus);
    });
    const access = document.createElement("section");
    access.className = "account-auth-card";
    access.innerHTML = user ? `<div><strong>Lucid Account</strong><small>Signed in as ${escapeHTML(user.email || "your account")}</small></div><button type="button" class="account-auth-button">Sign out</button>` : `<div><strong>Lucid Account</strong><small>Sign in or create an account to use Lucid Store, Lucid Studio, reviews, and subscriptions.</small></div><button type="button" class="account-auth-button">Sign in / Create account</button>`;
    card.insertAdjacentElement("beforebegin", access);
    access.querySelector(".account-auth-button").addEventListener("click", async () => { if (user) { await supabase.auth.signOut(); refreshAccountUI(); document.dispatchEvent(new CustomEvent("lucid-account-changed")); } else showAuthDialog("signup"); });
}
function showPlans(plus) {
    if (document.querySelector(".lucid-plans-overlay")) return;
    const overlay = document.createElement("div");
    overlay.className = "lucid-account-overlay lucid-plans-overlay";
    overlay.innerHTML = `<div class="lucid-plans-dialog"><button class="lucid-dialog-close" type="button">×</button><div class="account-plan-label">LUCID PLUS</div><h2>${plus ? "Your Plus plan" : "Choose your plan"}</h2><div class="lucid-plan-grid"><div class="lucid-plan"><h3>Free</h3><strong>100 MB</strong><span>Publishing limit</span><b>${plus ? "Included" : "Current plan"}</b></div><div class="lucid-plan lucid-plan-featured"><h3>Plus</h3><strong>1 GB</strong><span>Larger app publishing limit</span><button class="account-plan-button" id="lucid-plus-action">${plus ? "Manage Plus" : "Upgrade to Plus"}</button></div></div><p class="settings-hint">Payments are handled securely by Lemon Squeezy. Lucid only receives subscription status through signed webhooks.</p><div class="lucid-account-message" id="lucid-billing-message"></div></div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector(".lucid-dialog-close").addEventListener("click", close);
    overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
    overlay.querySelector("#lucid-plus-action")?.addEventListener("click", async () => {
        const button = overlay.querySelector("#lucid-plus-action");
        const message = overlay.querySelector("#lucid-billing-message");
        button.disabled = true;
        try {
            const user = await getCurrentUser();
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            if (!token || !user) { await showAuthDialog("signup"); overlay.remove(); return; }
            const response = await fetch("https://lucid-backend.vercel.app/api/create-checkout", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || `Checkout failed (${response.status}).`);
            window.location.href = result.url;
        } catch (error) { message.textContent = error.message || "Unable to open checkout."; button.disabled = false; }
    });
}
function escapeHTML(text) { return String(text ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
