import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
  try {
    const adminKey = process.env.ADMIN_KEY;
    const provided = event.headers["x-admin-key"];
    if (!adminKey || provided !== adminKey) {
      return { statusCode: 401, body: "Unauthorized" };
    }

    const store = getStore({ name: process.env.BLOBS_STORE || "customer-feedback" });

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
      results.push(value);
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ count: results.length, data: results })
    };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: "Server error" };
  }
};
