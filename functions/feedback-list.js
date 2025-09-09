// functions/feedback-list.js  （v2／免金鑰／穩定耐錯＋回傳 _key）
import { getStore } from "@netlify/blobs";

export default async (req) => {
  // 安全解析查詢參數（req.url 可能是相對路徑）
  let raw = false, debug = false;
  try {
    const base = process.env.URL || "https://example.com";
    const url = new URL(req.url, base);
    raw = url.searchParams.get("raw") === "1";
    debug = url.searchParams.get("debug") === "1";
  } catch {}

  try {
    const store = getStore(process.env.BLOBS_STORE || "customer-feedback");

    // 先列 key，再逐筆讀取（最多 100 筆）
    const page = await store.list({ prefix: "feedback/", directories: false, paginate: false });
    const items = (page?.blobs || [])
      .sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""))
      .slice(0, 100);

    const results = [];
    const errors = [];

    for (const it of items) {
      try {
        let rec = null;
        if (typeof store.getWithMetadata === "function") {
          const out = await store.getWithMetadata(it.key, { type: "json" });
          rec = out?.value ?? null;
        }
        if (!rec) rec = await store.get(it.key, { type: "json" });
        if (!rec) {
          const txt = await store.get(it.key);
          rec = txt ? JSON.parse(txt) : null;
        }
        if (!rec) continue;

        // 預設遮蔽個資
        if (!raw) {
          delete rec.email; delete rec.name;
          if (rec.meta) { delete rec.meta.ip; delete rec.meta.ua; delete rec.meta.referer; }
        }

        // ✅ 回傳 _key 供刪除／更新使用
        results.push({ _key: it.key, ...rec });
      } catch (e) {
        errors.push({ key: it.key, message: String(e) });
      }
    }

    return new Response(
      JSON.stringify({ count: results.length, masked: !raw, data: results, ...(debug ? { errors } : {}) }),
      { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  } catch (e) {
    const body = debug
      ? JSON.stringify({ ok: false, error: String(e), stack: e?.stack }, null, 2)
      : "Server error";
    return new Response(body, {
      status: 500,
      headers: { "Content-Type": debug ? "application/json; charset=utf-8" : "text/plain; charset=utf-8" }
    });
  }
};
