import { createClient } from "@supabase/supabase-js";

const clientOrigin = (() => {
    try {
        return new URL(process.env.LUCID_ORIGIN || "https://snetchy09.github.io").origin;
    } catch {
        return "https://snetchy09.github.io";
    }
})();

const setCorsHeaders = (res) => {
    res.setHeader("Access-Control-Allow-Origin", clientOrigin);
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Lucid-App-Id, X-Lucid-App-Name, X-Lucid-Version, X-Lucid-Category, X-Lucid-Description");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
};

const extractBearerToken = (req) => {
    const header = req.headers.authorization || "";
    return header.startsWith("Bearer ") ? header.slice(7).trim() || null : null;
};

const sanitizeTextField = (val, fallback, maxLen) => {
    const text = String(val || "").trim().slice(0, maxLen);
    return text || fallback;
};

export default async function handler(req, res) {
    setCorsHeaders(res);

    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

    const authToken = extractBearerToken(req);
    if (!authToken) return res.status(401).json({ error: "Authentication required." });

    const supabaseClient = createClient(
        process.env.SUPABASE_URL || "",
        process.env.SUPABASE_ANON_KEY || "",
        { global: { headers: { Authorization: `Bearer ${authToken}` } } }
    );

    const { data: authData, error: authError } = await supabaseClient.auth.getUser(authToken);
    if (authError || !authData.user) return res.status(401).json({ error: "Invalid or expired session." });

    const currentUser = authData.user;
    const payload = req.body || {};

    const appId = sanitizeTextField(payload.appId, "lucid-app", 80);
    const version = sanitizeTextField(payload.version, "1.0.0", 40);
    const appName = sanitizeTextField(payload.name, appId, 120);
    const categoryName = sanitizeTextField(payload.category, "Other", 40);
    const appDescription = sanitizeTextField(payload.description, "A Lucid OS application.", 500);
    const storageKey = String(payload.key || "").trim();
    const packageSize = Number(payload.size || 0);

    if (!storageKey || !storageKey.startsWith(`apps/${currentUser.id}/`)) {
        return res.status(400).json({ error: "Invalid package storage key." });
    }

    try {
        const { data: submissionRow, error: insertError } = await supabaseClient
            .from("lucid_app_submissions")
            .insert({
                app_id: appId,
                developer_id: currentUser.id,
                name: appName,
                app_name: appName,
                description: appDescription,
                category: categoryName,
                version: version,
                package_key: storageKey,
                source_key: storageKey,
                status: "pending",
                storage_provider: "b2",
                package_size: packageSize
            })
            .select("id")
            .single();

        if (insertError) {
            console.error("Submission insertion error:", insertError);
            return res.status(502).json({ error: "Store submission could not be created." });
        }

        const publicBaseUrl = String(process.env.B2_PUBLIC_BASE_URL || "").replace(/\/$/, "");
        const publicUrl = publicBaseUrl ? `${publicBaseUrl}/${storageKey}` : null;

        return res.status(201).json({
            success: true,
            submissionId: submissionRow.id,
            key: storageKey,
            url: publicUrl
        });
    } catch (err) {
        console.error("Publication finalization failed:", err);
        return res.status(500).json({ error: "Internal server error." });
    }
}
