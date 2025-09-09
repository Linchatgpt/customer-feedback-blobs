// functions/feedback-delete.js  （v2／免金鑰／支援多筆）
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

    const payload = await req.json().catch(() => ({}));
    let { key, keys } = payload || {};
    if (key) keys = [key];
    if (!Array.isArray(keys) || keys.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "Provide { key } or { keys: [] }" }), { status: 400 });
    }

    // 只允許刪除 feedback/ 前綴
    const targets = keys.filter(k => typeof k === "string" && k.startsWith("feedback/"));
    if (targets.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "No valid keys (prefix feedback/)" }), { status: 400 });
    }

    const store = getStore(process.env.BLOBS_STORE || "customer-feedback");
    const deleted = [], failed = [];

    for (const k of targets) {
      try {
        if (typeof store.delete === "function") await store.delete(k);
        else if (typeof store.del === "function") await store.del(k);
        else if (typeof store.remove === "function") await store.remove(k);
        else throw new Error("Delete not supported by current SDK");
        deleted.push(k);
      } catch (e) {
        failed.push({ key: k, message: String(e) });
      }
    }

    return new Response(JSON.stringify({ ok: failed.length === 0, deleted, failed }), {
      status: 200, headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: "Server error" }), {
      status: 500, headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
};
