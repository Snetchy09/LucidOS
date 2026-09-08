const publishUrl = import.meta.env.VITE_LUCID_PUBLISH_API_URL || "https://lucid-backend.vercel.app";
async function publishLucidPackage({ accessToken, appId, name, version, description, category, blob }) {
    if (!publishUrl) throw new Error("Lucid publishing service is not configured.");
    if (!accessToken) throw new Error("You must be signed in to publish an app.");
    if (!(blob instanceof Blob)) throw new TypeError("The app package is invalid.");
    const cleanBase = publishUrl.replace(/\/$/, "");
    let initResponse;
    try {
        initResponse = await fetch(`${cleanBase}/api/publish-init`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ appId, name, version, description, category, size: blob.size })
        });
    } catch (error) {
        throw new Error("The Lucid publishing service could not be reached. Check network and CORS configuration.");
    }
    let initResult = {};
    try {
        initResult = await initResponse.json();
    } catch {}
    if (!initResponse.ok) {
        const error = new Error(initResult.error || `Initialization failed (${initResponse.status}).`);
        error.maxBytes = initResult.maxBytes;
        error.plan = initResult.plan;
        throw error;
    }
    const { uploadUrl, key } = initResult;
    if (!uploadUrl || !key) {
        throw new Error("Invalid response from publishing initialization.");
    }
    let uploadResponse;
    try {
        uploadResponse = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/octet-stream" },
            body: blob
        });
    } catch (error) {
        throw new Error("Failed to upload the application package to storage.");
    }
    if (!uploadResponse.ok) {
        throw new Error(`Package storage upload failed (${uploadResponse.status}).`);
    }
    let completeResponse;
    try {
        completeResponse = await fetch(`${cleanBase}/api/publish-complete`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ appId, name, version, description, category, key, size: blob.size })
        });
    } catch (error) {
        throw new Error("Failed to finalize publication record.");
    }
    let completeResult = {};
    try {
        completeResult = await completeResponse.json();
    } catch {}
    if (!completeResponse.ok) {
        throw new Error(completeResult.error || `Finalization failed (${completeResponse.status}).`);
    }
    return completeResult;
}
async function gzipBlob(blob) {
    if (!("CompressionStream" in window)) return blob;
    const stream = blob.stream().pipeThrough(new CompressionStream("gzip"));
    return new Response(stream).blob();
}
export { publishLucidPackage, gzipBlob };
