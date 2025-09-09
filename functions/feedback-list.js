// functions/feedback-list.js  (診斷版)
import { getStore } from "@netlify/blobs";

export default async () => {
  try {
    // v2 + 以「字串」傳入 store 名稱
    const store = getStore(process.env.BLOBS_STORE || "customer-feedback");

    // 先只列出鍵名，確認有寫入
    const page = await store.list({ prefix: "feedback/", directories: false, paginate: false });
    const keys = (page?.blobs || []).map(b => b.key);

    return new Response(
      JSON.stringify({ ok: true, count: keys.length, keys }, null, 2),
      { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  } catch (e) {
    // 暫時把錯誤回傳，方便定位
    return new Response(
      JSON.stringify({ ok: false, error: String(e), stack: e?.stack }, null, 2),
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
};
