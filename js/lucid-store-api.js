import { createClient } from "@supabase/supabase-js";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
let supabase = null;
const authRedirect = "https://snetchy09.github.io/LucidOS/";
if (supabaseUrl && supabaseKey) {
    const client = createClient(supabaseUrl, supabaseKey);
    const auth = new Proxy(client.auth, { get(target, property, receiver) { if (property === "signUp") return ({ email, password, options = {} }) => target.signUp({ email, password, options: { ...options, emailRedirectTo: authRedirect } }); return Reflect.get(target, property, receiver); } });
    supabase = new Proxy(client, { get(target, property, receiver) { if (property === "auth") return auth; return Reflect.get(target, property, receiver); } });
}
async function getCurrentUser() {
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user || null;
}
async function signUpDeveloper(email, password, username, displayName) {
    if (!supabase) throw new Error("Lucid Store is not configured for developer accounts.");
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username, display_name: displayName } } });
    if (error) throw error;
    if (data.user && !data.session) return { user: data.user, needsConfirmation: true };
    if (!data.user) throw new Error("Developer account could not be created.");
    await createDeveloperProfile(data.user, username, displayName);
    return { user: data.user, needsConfirmation: false };
}
async function signInDeveloper(email, password) {
    if (!supabase) throw new Error("Lucid Store is not configured for developer accounts.");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
}
async function createDeveloperProfile(user, username, displayName) {
    if (!supabase) return;
    const { error } = await supabase.from("lucid_developers").upsert({ id: user.id, username, display_name: displayName });
    if (error) throw error;
}
async function signOutDeveloper() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}
async function getStoreApps() {
    if (!supabase) return [];
    const { data, error } = await supabase.from("lucid_apps").select("id,name,description,icon,icon_url,category,version,app_type,status,package_key,source_key,entry_point,created_at,updated_at,package_size").eq("status", "approved").order("created_at", { ascending: true });
    if (error) throw error;
    const apps = data || [];
    if (!apps.length) return [];
    const { data: stats } = await supabase.from("lucid_app_store_stats").select("app_id,review_count,average_rating,download_count").in("app_id", apps.map(app => app.id));
    const statMap = new Map((stats || []).map(item => [item.app_id, item]));
    return apps.map(app => ({ ...app, icon: app.icon || app.icon_url || "◇", ...(statMap.get(app.id) || { review_count: 0, average_rating: 0, download_count: 0 }) }));
}
async function recordAppDownload(appId, version) {
    if (!supabase || !appId) return;
    const user = await getCurrentUser();
    await supabase.from("lucid_app_downloads").insert({ app_id: appId, version: version || null, user_id: user?.id || null });
}
async function getAppReviews(appId) {
    if (!supabase || !appId) return [];
    const { data, error } = await supabase.from("lucid_app_reviews").select("id,rating,review,created_at,user_id").eq("app_id", appId).order("created_at", { ascending: false }).limit(30);
    if (error) throw error;
    return data || [];
}
async function saveAppReview(appId, rating, reviewText) {
    if (!supabase) throw new Error("Lucid Store is not configured.");
    const user = await getCurrentUser();
    if (!user) throw new Error("Sign in to leave a review.");
    const value = Math.max(1, Math.min(5, Number(rating) || 0));
    if (!value) throw new Error("Choose a rating.");
    const { error } = await supabase.from("lucid_app_reviews").upsert({ app_id: appId, user_id: user.id, rating: value, review: String(reviewText || "").trim().slice(0, 1000) }, { onConflict: "app_id,user_id" });
    if (error) throw error;
}
export { supabase, getStoreApps, getCurrentUser, signUpDeveloper, signInDeveloper, signOutDeveloper, recordAppDownload, getAppReviews, saveAppReview };