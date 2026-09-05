const publishUrl = import.meta.env.VITE_LUCID_PUBLISH_API_URL || "";

async function publishLucidPackage({ accessToken, appId, name, version, blob }) {
    if (!publishUrl) {
        throw new Error("Lucid publishing service is not configured.");
    }

    if (!accessToken) {
        throw new Error("You must be signed in to publish an app.");
    }

    if (!(blob instanceof Blob)) {
        throw new TypeError("The app package is invalid.");
    }

    const response = await fetch(`${publishUrl.replace(/\/$/, "")}/publish`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/octet-stream",
            "X-Lucid-App-Id": appId,
            "X-Lucid-App-Name": name,
            "X-Lucid-Version": version
        },
        body: blob
    });

    let result = null;
    try {
        result = await response.json();
    } catch {
        result = {};
    }

    if (!response.ok) {
        const error = new Error(result.error || "Publishing failed.");
        error.maxBytes = result.maxBytes;
        error.plan = result.plan;
        throw error;
    }

    return result;
}

async function gzipBlob(blob) {
    if (!("CompressionStream" in window)) return blob;

    const stream = blob.stream().pipeThrough(new CompressionStream("gzip"));
    return new Response(stream).blob();
}

export { publishLucidPackage, gzipBlob };
