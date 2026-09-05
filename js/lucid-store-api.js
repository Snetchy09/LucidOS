import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Lucid Store: Supabase environment variables are missing.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) { console.error("Lucid Auth:", error); return null; }
    return data.user || null;
}

async function signUpDeveloper(email, password, username, displayName) {
    const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { username, display_name: displayName } }
    });

    if (error) throw error;

    if (data.user && !data.session) {
        return { user: data.user, needsConfirmation: true };
    }

    if (!data.user) throw new Error("Developer account could not be created.");

    await createDeveloperProfile(data.user, username, displayName);
    return { user: data.user, needsConfirmation: false };
}

async function signInDeveloper(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
}

async function createDeveloperProfile(user, username, displayName) {
    const { error } = await supabase.from("lucid_developers").upsert({
        id: user.id, username, display_name: displayName
    });
    if (error) throw error;
}

async function signOutDeveloper() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

async function getStoreApps() {
    const { data, error } = await supabase
        .from("lucid_apps")
        .select(`
            id, name, description, icon, icon_url, category, version,
            app_type, status, package_key, entry_point, created_at, updated_at
        `)
        .eq("status", "approved")
        .order("created_at", { ascending: true });

    if (error) { console.error("Lucid Store database error:", error); throw error; }

    return (data || []).map(app => ({
        ...app, icon: app.icon || app.icon_url || "◇"
    }));
}

export { supabase, getStoreApps, getCurrentUser, signUpDeveloper, signInDeveloper, signOutDeveloper };