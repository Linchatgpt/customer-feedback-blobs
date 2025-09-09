import { getStore } from "@netlify/blobs";

export default async () => {
  try {
    // 建議先不要設定 BLOBS_STORE，讓讀寫都用預設 "customer-feedback"
    const store = getStore(process.env.BLOBS_STORE || "customer-feedback");

    // 只列 key，先確認 Blobs 連線與資料存在
    const page = await store.list({ prefix: "feedback/", directories: false, paginate: false });
    const keys = (page?.blobs || []).map(b => ({ key: b.key, uploadedAt: b.uploadedAt }));

    return new Response(JSON.stringify({ ok: true, count: keys.length, keys }, null, 2), {
      status: 200, headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      ok: false, name: e?.name, message: String(e), stack: e?.stack
    }, null, 2), {
      status: 500, headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
};
