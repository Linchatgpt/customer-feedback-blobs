import { getStore } from "@netlify/blobs";

export const handler = async (event, context) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const contentType = event.headers["content-type"] || "";
    if (!contentType.includes("application/json")) {
      return { statusCode: 400, body: "Invalid content type" };
    }

    const data = JSON.parse(event.body || "{}");

    const { name = "", email = "", rating, category = "", message = "", consent } = data;
    if (!message || typeof rating !== "number" || rating < 1 || rating > 5) {
      return { statusCode: 400, body: "Missing or invalid fields" };
    }
    if (consent !== true) {
      return { statusCode: 400, body: "Consent is required" };
    }

    if (data.website) {
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    const now = new Date();
    const key = `feedback/${now.toISOString()}_${cryptoRandom()}.json`;

    const payload = {
      name,
      email,
      rating,
      category,
      message,
      consent: true,
      created_at: now.toISOString(),
      meta: {
        ip: event.headers["x-nf-client-connection-ip"] || null,
        ua: event.headers["user-agent"] || null,
        referer: event.headers["referer"] || null
      }
    };

const store = getStore(process.env.BLOBS_STORE || "customer-feedback");
    await store.setJSON(key, payload, {
      metadata: {
        rating: String(rating),
        category,
        src: "webform"
      },
      onlyIfNew: true
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Server error" };
  }
};

function cryptoRandom(len = 8) {
  const bytes = new Uint8Array(len);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
