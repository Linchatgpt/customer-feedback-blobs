import { getStore } from "@netlify/blobs";

export default async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return new Response("Invalid content type", { status: 400 });
    }

    const data = await req.json();
    const { name = "", email = "", rating, category = "", message = "", consent } = data;

    if (!message || typeof rating !== "number" || rating < 1 || rating > 5) {
      return new Response("Missing or invalid fields", { status: 400 });
    }
    if (consent !== true) return new Response("Consent is required", { status: 400 });
    if (data.website) return new Response(JSON.stringify({ ok: true }), { status: 200 }); // 蜜罐

    const now = new Date();
    const key = `feedback/${now.toISOString()}_${cryptoRandom()}.json`;

    const payload = {
      name, email, rating, category, message, consent: true,
      created_at: now.toISOString(),
      meta: {
        ip: req.headers.get("x-nf-client-connection-ip"),
        ua: req.headers.get("user-agent"),
        referer: req.headers.get("referer")
      }
    };

    // ✅ v2 正確用法：以「字串」指定 store 名稱
    const store = getStore(process.env.BLOBS_STORE || "customer-feedback");
    await store.setJSON(key, payload, {
      metadata: { rating: String(rating), category, src: "webform" },
      onlyIfNew: true
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  } catch (err) {
    console.error(err);
    return new Response("Server error", { status: 500 });
  }
};

function cryptoRandom(len = 8) {
  const bytes = new Uint8Array(len);
  (globalThis.crypto?.getRandomValues ? crypto.getRandomValues(bytes)
                                      : bytes.fill(0).forEach((_,i)=>bytes[i]=Math.floor(Math.random()*256)));
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}
