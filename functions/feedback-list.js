import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
  try {
    // 無金鑰版本：任何人都能讀取。?raw=1 會顯示未遮罩欄位（不建議）。
    const raw = event?.queryStringParameters?.raw === "1";
 const store = getStore(process.env.BLOBS_STORE || "customer-feedback");

    let items = [];
    let cursor;
    do {
      const page = await store.list({ prefix: "feedback/", cursor, directories: false, paginate: true });
      items.push(...page.blobs);
      cursor = page.cursor;
    } while (cursor);

    items.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    items = items.slice(0, 100);

    const results = [];
    for (const it of items) {
      const { value } = await store.getWithMetadata(it.key, { type: "json", consistency: "strong" });
      const rec = { ...value };
      if (!raw) {
        delete rec.email;
        delete rec.name;
        if (rec.meta) { delete rec.meta.ip; delete rec.meta.ua; delete rec.meta.referer; }
      }
      results.push(rec);
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ count: results.length, masked: !raw, data: results })
    };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: "Server error" };
  }
};
