import http from "node:http";
import crypto from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
const PORT = Number(process.env.PORT || 3000);
const FREE_MAX_APP_BYTES = 100 * 1024 * 1024;
const PRO_MAX_APP_BYTES = Number(process.env.B2_PRO_MAX_APP_BYTES || 1024 * 1024 * 1024);
const lucidOrigin = (() => { const configured = String(process.env.LUCID_ORIGIN || "https://snetchy09.github.io"); try { return new URL(configured).origin; } catch { return "https://snetchy09.github.io"; } })();
const required = ["B2_REGION","B2_BUCKET_NAME","B2_APPLICATION_KEY_ID","B2_APPLICATION_KEY","SUPABASE_URL","SUPABASE_ANON_KEY"];
for (const name of required) if (!process.env[name]) console.warn(`Lucid Publish: ${name} is not configured.`);
const b2 = new S3Client({ region: process.env.B2_REGION, endpoint: `https://s3.${process.env.B2_REGION}.backblazeb2.com`, credentials: { accessKeyId: process.env.B2_APPLICATION_KEY_ID || "", secretAccessKey: process.env.B2_APPLICATION_KEY || "" } });
const supabase = createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_ANON_KEY || "");
function sendJson(res, status, value) { const body = JSON.stringify(value); res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body), "Access-Control-Allow-Origin": lucidOrigin, "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Lucid-App-Id, X-Lucid-App-Name, X-Lucid-Version, X-Lucid-Category, X-Lucid-Description", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" }); res.end(body); }
function getBearerToken(req) { const header = req.headers.authorization || ""; if (!header.startsWith("Bearer ")) return null; return header.slice(7).trim() || null; }
function sanitizePart(value, fallback) { const cleaned = String(value || "").trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80); return cleaned || fallback; }
function textPart(value, fallback, limit) { const text = String(value || "").trim().slice(0, limit); return text || fallback; }
function isSubscriber(user) { const plan = String(user.app_metadata?.plan || user.app_metadata?.subscription || "free").toLowerCase(); return ["pro","premium","subscriber"].includes(plan); }
async function publish(req, res) {
    const token = getBearerToken(req);
    if (!token) return sendJson(res, 401, { error: "Authentication required." });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return sendJson(res, 401, { error: "Invalid or expired session." });
    const user = data.user;
    const subscriber = isSubscriber(user);
    const maxBytes = subscriber ? PRO_MAX_APP_BYTES : FREE_MAX_APP_BYTES;
    const length = Number(req.headers["content-length"] || 0);
    if (!length || length <= 0) return sendJson(res, 400, { error: "The package size is missing." });
    if (length > maxBytes) return sendJson(res, 413, { error: subscriber ? "Your package is larger than the storage limit for your plan." : "Free developer accounts can publish apps up to 100 MB.", maxBytes, plan: subscriber ? "subscriber" : "free" });
    if (!process.env.B2_BUCKET_NAME || !process.env.B2_APPLICATION_KEY_ID || !process.env.B2_APPLICATION_KEY) return sendJson(res, 503, { error: "Lucid publishing storage is not configured yet." });
    const appId = sanitizePart(req.headers["x-lucid-app-id"], "lucid-app");
    const version = sanitizePart(req.headers["x-lucid-version"], "1.0.0");
    const name = textPart(req.headers["x-lucid-app-name"], appId, 120);
    const category = textPart(req.headers["x-lucid-category"], "Other", 40);
    const description = textPart(req.headers["x-lucid-description"], "A Lucid OS application.", 500);
    const objectId = crypto.randomUUID();
    const key = `apps/${user.id}/${appId}/${version}/${objectId}.lucidpkg`;
    try {
        await b2.send(new PutObjectCommand({ Bucket: process.env.B2_BUCKET_NAME, Key: key, Body: req, ContentLength: length, ContentType: "application/octet-stream", Metadata: { "lucid-user": user.id, "lucid-app": appId, "lucid-version": version, "lucid-name": name } }));
        const { data: submission, error: submissionError } = await supabase.from("lucid_app_submissions").insert({ app_id: appId, developer_id: user.id, name, app_name: name, description, category, version, package_key: key, source_key: key, status: "pending", storage_provider: "b2", package_size: length }).select("id").single();
        if (submissionError) return sendJson(res, 502, { error: "Package uploaded but the Store submission could not be created." });
        const publicBase = String(process.env.B2_PUBLIC_BASE_URL || "").replace(/\/$/, "");
        const publicUrl = publicBase ? `${publicBase}/${key}` : null;
        sendJson(res, 201, { success: true, submissionId: submission.id, key, size: length, plan: subscriber ? "subscriber" : "free", maxBytes, url: publicUrl });
    } catch (uploadError) {
        console.error("Lucid B2 upload failed:", uploadError);
        sendJson(res, 502, { error: "The app could not be uploaded to storage." });
    }
}
const server = http.createServer(async (req, res) => {
    if (req.method === "OPTIONS") { res.writeHead(204, { "Access-Control-Allow-Origin": lucidOrigin, "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Lucid-App-Id, X-Lucid-App-Name, X-Lucid-Version, X-Lucid-Category, X-Lucid-Description", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" }); res.end(); return; }
    if (req.method === "GET" && req.url === "/health") return sendJson(res, 200, { ok: true, service: "lucid-publish" });
    if (req.method === "POST" && req.url === "/publish") return publish(req, res);
    sendJson(res, 404, { error: "Not found." });
});
server.listen(PORT, () => console.log(`Lucid publish service listening on port ${PORT}`));