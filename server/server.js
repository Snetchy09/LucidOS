import http from "node:http";
import crypto from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const PORT = Number(process.env.PORT || 3000);
const FREE_MAX_APP_BYTES = 100 * 1024 * 1024;
const PRO_MAX_APP_BYTES = Number(process.env.B2_PRO_MAX_APP_BYTES || 1024 * 1024 * 1024);

const required = [
    "B2_REGION",
    "B2_BUCKET_NAME",
    "B2_APPLICATION_KEY_ID",
    "B2_APPLICATION_KEY",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY"
];

for (const name of required) {
    if (!process.env[name]) {
        console.warn(`Lucid Publish: ${name} is not configured.`);
    }
}

const b2 = new S3Client({
    region: process.env.B2_REGION,
    endpoint: `https://s3.${process.env.B2_REGION}.backblazeb2.com`,
    credentials: {
        accessKeyId: process.env.B2_APPLICATION_KEY_ID || "",
        secretAccessKey: process.env.B2_APPLICATION_KEY || ""
    }
});

const supabase = createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_ANON_KEY || ""
);

function sendJson(res, status, value) {
    const body = JSON.stringify(value);
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
        "Access-Control-Allow-Origin": process.env.LUCID_ORIGIN || "*",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Lucid-App-Id, X-Lucid-App-Name, X-Lucid-Version",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    });
    res.end(body);
}

function getBearerToken(req) {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) return null;
    return header.slice(7).trim() || null;
}

function sanitizePart(value, fallback) {
    const cleaned = String(value || "")
        .trim()
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
    return cleaned || fallback;
}

function isSubscriber(user) {
    const plan = String(user.app_metadata?.plan || user.app_metadata?.subscription || "free").toLowerCase();
    return plan === "pro" || plan === "premium" || plan === "subscriber";
}

async function publish(req, res) {
    const token = getBearerToken(req);
    if (!token) {
        sendJson(res, 401, { error: "Authentication required." });
        return;
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
        sendJson(res, 401, { error: "Invalid or expired session." });
        return;
    }

    const user = data.user;
    const subscriber = isSubscriber(user);
    const maxBytes = subscriber ? PRO_MAX_APP_BYTES : FREE_MAX_APP_BYTES;
    const length = Number(req.headers["content-length"] || 0);

    if (!length || length <= 0) {
        sendJson(res, 400, { error: "The package size is missing." });
        return;
    }

    if (length > maxBytes) {
        sendJson(res, 413, {
            error: subscriber
                ? "Your package is larger than the storage limit for your plan."
                : "Free developer accounts can publish apps up to 100 MB.",
            maxBytes,
            plan: subscriber ? "subscriber" : "free"
        });
        return;
    }

    if (!process.env.B2_BUCKET_NAME || !process.env.B2_APPLICATION_KEY_ID || !process.env.B2_APPLICATION_KEY) {
        sendJson(res, 503, { error: "Lucid publishing storage is not configured yet." });
        return;
    }

    const appId = sanitizePart(req.headers["x-lucid-app-id"], "lucid-app");
    const version = sanitizePart(req.headers["x-lucid-version"], "1.0.0");
    const name = sanitizePart(req.headers["x-lucid-app-name"], appId);
    const objectId = crypto.randomUUID();
    const key = `apps/${user.id}/${appId}/${version}/${objectId}.lucidpkg`;

    try {
        await b2.send(new PutObjectCommand({
            Bucket: process.env.B2_BUCKET_NAME,
            Key: key,
            Body: req,
            ContentLength: length,
            ContentType: "application/octet-stream",
            Metadata: {
                "lucid-user": user.id,
                "lucid-app": appId,
                "lucid-version": version,
                "lucid-name": name
            }
        }));

        const publicBase = String(process.env.B2_PUBLIC_BASE_URL || "").replace(/\/$/, "");
        const publicUrl = publicBase ? `${publicBase}/${key}` : null;

        sendJson(res, 201, {
            success: true,
            key,
            size: length,
            plan: subscriber ? "subscriber" : "free",
            maxBytes,
            url: publicUrl
        });
    } catch (uploadError) {
        console.error("Lucid B2 upload failed:", uploadError);
        sendJson(res, 502, { error: "The app could not be uploaded to storage." });
    }
}

const server = http.createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
        res.writeHead(204, {
            "Access-Control-Allow-Origin": process.env.LUCID_ORIGIN || "*",
            "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Lucid-App-Id, X-Lucid-App-Name, X-Lucid-Version",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
        });
        res.end();
        return;
    }

    if (req.method === "GET" && req.url === "/health") {
        sendJson(res, 200, { ok: true, service: "lucid-publish" });
        return;
    }

    if (req.method === "POST" && req.url === "/publish") {
        await publish(req, res);
        return;
    }

    sendJson(res, 404, { error: "Not found." });
});

server.listen(PORT, () => {
    console.log(`Lucid publish service listening on port ${PORT}`);
});
