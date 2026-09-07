import { supabase, getCurrentUser } from "./lucid-store-api.js";
const observer = new MutationObserver(() => { setupAuth(); setupAccount(); });
observer.observe(document.body, { childList: true, subtree: true });
setupAuth();
setupAccount();
if (supabase) supabase.auth.onAuthStateChange(event => { if (event === "PASSWORD_RECOVERY") showPasswordReset(); });
function setupAuth() {
    document.querySelectorAll(".studio-auth-form").forEach(form => {
        const password = form.querySelector("#studio-password");
        const submit = form.querySelector("#studio-auth-submit");
        if (!password || !submit || form.querySelector(".studio-forgot-password")) return;
        if (password.autocomplete !== "current-password") return;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "studio-forgot-password";
        button.textContent = "Forgot password?";
        button.addEventListener("click", () => sendReset(form));
        submit.insertAdjacentElement("afterend", button);
    });
}
async function sendReset(form) {
    const email = form.querySelector("#studio-email")?.value.trim();
    const message = form.querySelector("#studio-auth-message");
    if (!email) { message.textContent = "Enter your email first."; return; }
    if (!supabase) { message.textContent = "Account recovery is unavailable right now."; return; }
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
    card.querySelector(".account-plan-button").addEventListener("click", () => showPlans(plus));
}
function showPlans(plus) {
    if (document.querySelector(".lucid-plans-overlay")) return;
    const overlay = document.createElement("div");
    overlay.className = "lucid-account-overlay lucid-plans-overlay";
    overlay.innerHTML = `<div class="lucid-plans-dialog"><button class="lucid-dialog-close" type="button">×</button><div class="account-plan-label">LUCID PLUS</div><h2>${plus ? "Your Plus plan" : "Choose your plan"}</h2><div class="lucid-plan-grid"><div class="lucid-plan"><h3>Free</h3><strong>100 MB</strong><span>Publishing limit</span><b>${plus ? "Included" : "Current plan"}</b></div><div class="lucid-plan lucid-plan-featured"><h3>Plus</h3><strong>1 GB</strong><span>Larger app publishing limit</span><button class="account-plan-button" id="lucid-plus-action">${plus ? "Open billing" : "Upgrade to Plus"}</button></div></div><p class="settings-hint">Payments are handled securely by Lemon Squeezy. Lucid only receives subscription status through signed webhooks.</p><div class="lucid-account-message" id="lucid-billing-message"></div></div>`;
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
            if (!token || !user) throw new Error("Sign in to manage Lucid Plus.");
            const response = await fetch("https://lucid-backend.vercel.app/api/create-checkout", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || `Checkout failed (${response.status}).`);
            window.location.href = result.url;
        } catch (error) {
            message.textContent = error.message || "Unable to open checkout.";
            button.disabled = false;
        }
    });
}
