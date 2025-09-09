// functions/feedback-update.js  （v2／免金鑰／容錯與可讀錯誤）
import { getStore } from "@netlify/blobs";

export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "Method Not Allowed" }), { status: 405 });
    }

    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid content type" }), { status: 400 });
    }

    const { key, patch } = await req.json().catch(() => ({}));
    if (!key || !String(key).startsWith("feedback/")) {
      return new Response(JSON.stringify({ ok: false, error: "Bad Request: key (prefix feedback/) is required" }), { status: 400 });
    }
    if (!patch || typeof patch !== "object") {
      return new Response(JSON.stringify({ ok: false, error: "Bad Request: patch object is required" }), { status: 400 });
    }

    const store = getStore(process.env.BLOBS_STORE || "customer-feedback");

    // 讀現有（具容錯）
    let rec = await store.get(key, { type: "json" });
    if (!rec) {
      const txt = await store.get(key);
      rec = txt ? JSON.parse(txt) : null;
    }
    if (!rec) return new Response(JSON.stringify({ ok: false, error: "Not Found" }), { status: 404 });

    // 僅允許這些欄位
    const allowed = new Set(["name", "email", "rating", "category", "message"]);
    for (const k of Object.keys(patch)) {
      if (!allowed.has(k)) delete patch[k];
    }

    // rating：僅在有提供時檢核；空值視為不修改
    if (Object.prototype.hasOwnProperty.call(patch, "rating")) {
      if (patch.rating === "" || patch.rating == null) {
        delete patch.rating;
      } else {
        const r = Number(patch.rating);
        if (!(r >= 1 && r <= 5)) {
          return new Response(JSON.stringify({ ok: false, error: "Invalid rating (must be 1-5)" }), { status: 400 });
        }
        patch.rating = r;
      }
    }

    const updated = { ...rec, ...patch, updated_at: new Date().toISOString() };
    await store.setJSON(key, updated);

    return new Response(JSON.stringify({ ok: true, key }), {
      status: 200, headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
};
