import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const FREE_LIMIT_BYTES = 100 * 1024 * 1024;
const PRO_LIMIT_BYTES = Number(process.env.B2_PRO_MAX_APP_BYTES || 1024 * 1024 * 1024);

const clientOrigin = (() => {
    try {
        return new URL(process.env.LUCID_ORIGIN || "https://snetchy09.github.io").origin;
    } catch {
        return "https://snetchy09.github.io";
    }
})();

const s3Client = new S3Client({
    region: process.env.B2_REGION,
    endpoint: process.env.B2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.B2_KEY_ID || "",
        secretAccessKey: process.env.B2_APPLICATION_KEY || ""
    }
});

const setCorsHeaders = (res) => {
    res.setHeader("Access-Control-Allow-Origin", clientOrigin);
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Lucid-App-Id, X-Lucid-App-Name, X-Lucid-Version, X-Lucid-Category, X-Lucid-Description");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
};

const extractBearerToken = (req) => {
    const header = req.headers.authorization || "";
    return header.startsWith("Bearer ") ? header.slice(7).trim() || null : null;
};

const sanitizeSlug = (val, fallback) => {
    const cleaned = String(val || "").trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
    return cleaned || fallback;
};

const checkIsSubscriber = (userRecord) => {
    const planType = String(userRecord.app_metadata?.plan || userRecord.app_metadata?.subscription || "free").toLowerCase();
    return ["pro", "premium", "subscriber"].includes(planType);
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
    const isPro = checkIsSubscriber(currentUser);
    const maxAllowedBytes = isPro ? PRO_LIMIT_BYTES : FREE_LIMIT_BYTES;

    const payload = req.body || {};
    const packageSize = Number(payload.size || 0);

    if (packageSize <= 0) return res.status(400).json({ error: "Invalid package size." });
    if (packageSize > maxAllowedBytes) {
        return res.status(413).json({
            error: isPro ? "Package exceeds plan storage limit." : "Free developer accounts capped at 100 MB.",
            maxBytes: maxAllowedBytes,
            plan: isPro ? "subscriber" : "free"
        });
    }

    if (!process.env.B2_BUCKET || !process.env.B2_KEY_ID || !process.env.B2_APPLICATION_KEY || !process.env.B2_ENDPOINT || !process.env.B2_REGION) {
        return res.status(503).json({ error: "Storage backend unconfigured." });
    }

    const appSlug = sanitizeSlug(payload.appId, "lucid-app");
    const appVersion = sanitizeSlug(payload.version, "1.0.0");
    const uniqueFileId = crypto.randomUUID();
    const storageKey = `apps/${currentUser.id}/${appSlug}/${appVersion}/${uniqueFileId}.lucidpkg`;

    try {
        const putCommand = new PutObjectCommand({
            Bucket: process.env.B2_BUCKET,
            Key: storageKey,
            ContentType: "application/octet-stream"
        });

        const signedUploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 900 });

        return res.status(200).json({
            success: true,
            uploadUrl: signedUploadUrl,
            key: storageKey,
            maxBytes: maxAllowedBytes,
            plan: isPro ? "subscriber" : "free"
        });
    } catch (err) {
        console.error("Presign generation failed:", err);
        return res.status(500).json({ error: "Could not initialize upload session." });
    }
}
