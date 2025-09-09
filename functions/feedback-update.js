import { getStore } from "@netlify/blobs";

export default async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return new Response("Invalid content type", { status: 400 });

    const { key, patch } = await req.json();
    if (!key || !String(key).startsWith("feedback/")) {
      return new Response("Bad Request: key (prefix feedback/) is required", { status: 400 });
    }
    if (!patch || typeof patch !== "object") {
      return new Response("Bad Request: patch object is required", { status: 400 });
    }

    const store = getStore(process.env.BLOBS_STORE || "customer-feedback");

    // 讀現有
    let rec = await store.get(key, { type: "json" });
    if (!rec) {
      const txt = await store.get(key);
      rec = txt ? JSON.parse(txt) : null;
    }
    if (!rec) return new Response("Not Found", { status: 404 });

    // 合併 patch（允許修改的欄位）
    const allowed = ["name", "email", "rating", "category", "message"];
    for (const k of Object.keys(patch)) {
      if (allowed.includes(k)) rec[k] = patch[k];
    }
    // 基本驗證
    if (rec.rating != null) {
      const r = Number(rec.rating);
      if (!(r >= 1 && r <= 5)) return new Response("Invalid rating", { status: 400 });
      rec.rating = r;
    }
    // 更新時間戳（非必要）
    rec.updated_at = new Date().toISOString();

    // 寫回
    await store.setJSON(key, rec);

    return new Response(JSON.stringify({ ok: true, key }), {
      status: 200, headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  } catch (e) {
    console.error(e);
    return new Response("Server error", { status: 500 });
  }
};
