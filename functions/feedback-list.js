// functions/feedback-list.js  （v2／免金鑰／相容耐錯版）
import { getStore } from "@netlify/blobs";

export default async (req) => {
  const url = new URL(req.url);
  const raw = url.searchParams.get("raw") === "1";
  const debug = url.searchParams.get("debug") === "1";

  try {
    const store = getStore(process.env.BLOBS_STORE || "customer-feedback"); // v2 + 字串

    // 先列出 key，再逐筆讀內容（最多 100 筆）
    const page = await store.list({ prefix: "feedback/", directories: false, paginate: false });
    const items = (page?.blobs || [])
      .sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""))
      .slice(0, 100);

    const results = [];
    const errors = [];

    for (const it of items) {
      try {
        let rec;

        // 優先使用 getWithMetadata(type: 'json')；若不存在或失敗，逐層退回
        if (typeof store.getWithMetadata === "function") {
          const out = await store.getWithMetadata(it.key, { type: "json", consistency: "strong" });
          rec = out?.value ?? null;
        }
        if (!rec) {
          // 部分版本僅支援 get(type: 'json')
          rec = await store.get(it.key, { type: "json", consistency: "strong" });
        }
        if (!rec) {
          // 最後退回以文字讀取，再自行 JSON.parse
          const txt = await store.get(it.key, { consistency: "strong" });
          rec = txt ? JSON.parse(txt) : null;
        }
        if (!rec) continue; // 空值就略過

        // 預設遮蔽個資
        if (!raw) {
          delete rec.email;
          delete rec.name;
          if (rec.meta) { delete rec.meta.ip; delete rec.meta.ua; delete rec.meta.referer; }
        }

        results.push(rec);
      } catch (e) {
        // 單筆失敗不影響整體
        errors.push({ key: it.key, message: String(e) });
        continue;
      }
    }

    return new Response(
      JSON.stringify({ count: results.length, masked: !raw, data: results, ...(debug ? { errors } : {}) }),
      { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  } catch (e) {
    // 若還是出錯，可加上 ?debug=1 觀察
    const body = debug ? JSON.stringify({ ok: false, error: String(e), stack: e?.stack }, null, 2) : "Server error";
    return new Response(body, { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } });
  }
}
