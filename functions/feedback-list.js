import { getStore } from "@netlify/blobs";

export default async (req) => {
  try {
    const url = new URL(req.url);
    const raw = url.searchParams.get("raw") === "1";

    const store = getStore(process.env.BLOBS_STORE || "customer-feedback");

    let items = [], cursor;
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
        delete rec.email; delete rec.name;
        if (rec.meta) { delete rec.meta.ip; delete rec.meta.ua; delete rec.meta.referer; }
      }
      results.push(rec);
    }

    return new Response(JSON.stringify({ count: results.length, masked: !raw, data: results }), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  } catch (e) {
    console.error(e);
    return new Response("Server error", { status: 500 });
  }
};
