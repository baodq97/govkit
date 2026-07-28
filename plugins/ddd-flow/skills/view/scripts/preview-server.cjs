#!/usr/bin/env node
// Live preview server for domain-visualize (Phase 1).
//
// Zero dependency by construction — Node built-ins only (http, fs, path, crypto). Nothing is
// vendored, so there is no third-party code to audit or patch.
//
// Architecture adapted from the brainstorm companion server in the `superpowers` plugin
// (https://github.com/obra/superpowers, MIT, Jesse Vincent): watch a session directory, push to
// an already-open browser, record the user's clicks for the agent's next turn. Two deliberate
// departures:
//
//   1. SSE instead of WebSocket. The push is one-way (server -> browser); feedback travels back
//      over a plain POST. That removes the whole RFC 6455 implementation (handshake, masking,
//      frame codec) for no loss of function at this scale.
//   2. The shell is frozen and the DATA moves. superpowers pushes a fresh HTML screen per
//      question; here `shell.html` never changes and only `model.json` is rewritten, so every
//      view renders from one payload and cross-view contradiction is impossible.
//
// Usage:
//   node preview-server.cjs --dir <session-dir> [--port N] [--host H] [--url-host H]
//                           [--idle-timeout-minutes N]
//
// Session directory layout (all created on demand):
//   <session-dir>/model.json          <- the agent rewrites this; the browser re-renders
//   <session-dir>/events.jsonl        <- the user's browser interactions, one JSON per line
//   <session-dir>/server-info.json    <- connection details, for when stdout is not captured

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

// ---------------------------------------------------------------------------- args

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

const SESSION_DIR = path.resolve(
  args.dir || process.env.DDD_FLOW_PREVIEW_DIR || path.join(process.cwd(), ".ddd-flow", "preview"),
);
const HOST = args.host || process.env.DDD_FLOW_PREVIEW_HOST || "127.0.0.1";
const URL_HOST =
  args["url-host"] || (HOST === "127.0.0.1" || HOST === "0.0.0.0" ? "localhost" : HOST);
const PORT = Number(args.port || process.env.DDD_FLOW_PREVIEW_PORT || 0); // 0 => OS picks a free port
const IDLE_MINUTES = Number(args["idle-timeout-minutes"] || 240);

const MODEL_PATH = path.join(SESSION_DIR, "model.json");
const EVENTS_PATH = path.join(SESSION_DIR, "events.jsonl");
const INFO_PATH = path.join(SESSION_DIR, "server-info.json");
const SHELL_PATH = path.join(__dirname, "shell.html");

// One shape for "nothing has been written yet", used by both the seed file and the read-failure
// fallback. They must stay identical or the shell behaves differently depending on which it got.
const EMPTY_MODEL = {
  schemaVersion: 2,
  kind: "workspace",
  source: { mode: "draft" },
  documents: [],
  gaps: [],
};

let shellHtml = null;
const KEY = crypto.randomBytes(8).toString("hex");
const COOKIE_NAME = "ddd_flow_preview_key";

fs.mkdirSync(SESSION_DIR, { recursive: true });

// A first render should show something rather than an error, so seed an empty model when the
// agent has not written one yet.
if (!fs.existsSync(MODEL_PATH)) {
  fs.writeFileSync(MODEL_PATH, `${JSON.stringify(EMPTY_MODEL, null, 2)}\n`);
}

// ---------------------------------------------------------------------------- auth

// The key gates every route: a stray tab, or another machine on the network when bound to
// 0.0.0.0, must not be able to read the model or inject feedback. After the first load the
// browser carries it in a cookie, so reloads work without the query string.
function authorized(req) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.searchParams.get("key") === KEY) return true;
  const cookie = req.headers.cookie || "";
  return cookie.split(";").some((part) => part.trim() === `${COOKIE_NAME}=${KEY}`);
}

function deny(res) {
  res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
  res.end("403 — missing or bad session key. Use the full URL, including ?key=…\n");
}

// ---------------------------------------------------------------------------- SSE fan-out

/** @type {Set<import('node:http').ServerResponse>} */
const clients = new Set();

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    // A disconnected client can throw on write; drop it rather than crash the server.
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}

// ---------------------------------------------------------------------------- watch

let watchTimer = null;

// fs.watch fires more than once per logical write on most platforms (truncate, then write), so
// coalesce; a burst of change events should push exactly one re-render.
function scheduleReload() {
  if (watchTimer) clearTimeout(watchTimer);
  watchTimer = setTimeout(() => {
    watchTimer = null;
    broadcast("model", { at: Date.now() });
  }, 60);
}

try {
  fs.watch(SESSION_DIR, (_type, filename) => {
    if (!filename || path.basename(String(filename)) !== "model.json") return;
    scheduleReload();
  });
} catch (err) {
  process.stderr.write(
    `preview-server: fs.watch unavailable (${err.message}); falling back to polling\n`,
  );
  let lastSeen = 0;
  setInterval(() => {
    let mtime = 0;
    try {
      mtime = fs.statSync(MODEL_PATH).mtimeMs;
    } catch {
      return;
    }
    if (mtime !== lastSeen) {
      lastSeen = mtime;
      scheduleReload();
    }
  }, 500).unref();
}

// ---------------------------------------------------------------------------- idle shutdown

let lastActivity = Date.now();

function touch() {
  lastActivity = Date.now();
}

if (IDLE_MINUTES > 0) {
  setInterval(() => {
    const idleMs = Date.now() - lastActivity;
    if (clients.size === 0 && idleMs > IDLE_MINUTES * 60_000) {
      process.stderr.write(`preview-server: idle for ${IDLE_MINUTES}m, exiting\n`);
      process.exit(0);
    }
  }, 60_000).unref();
}

// ---------------------------------------------------------------------------- routes

function readBody(req, limitBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  touch();

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (!authorized(req)) {
    deny(res);
    return;
  }

  const setCookie =
    url.searchParams.get("key") === KEY
      ? { "set-cookie": `${COOKIE_NAME}=${KEY}; Path=/; SameSite=Strict` }
      : {};

  // The frozen shell. It never changes across a session — only the data does, so read it once
  // rather than re-reading 86 KB from disk on every page load.
  if (url.pathname === "/") {
    if (shellHtml === null) {
      try {
        shellHtml = fs.readFileSync(SHELL_PATH, "utf8");
      } catch {
        res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        res.end("shell.html not found next to preview-server.cjs\n");
        return;
      }
    }
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      ...setCookie,
    });
    res.end(shellHtml);
    return;
  }

  // The browser asks for this unprompted; answering 204 keeps the only console error off a page
  // whose whole job is to make real problems visible.
  if (url.pathname === "/favicon.ico") {
    res.writeHead(204, setCookie);
    res.end();
    return;
  }

  if (url.pathname === "/model.json") {
    let body;
    try {
      body = fs.readFileSync(MODEL_PATH, "utf8");
    } catch {
      body = JSON.stringify(EMPTY_MODEL);
    }
    res.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...setCookie,
    });
    res.end(body);
    return;
  }

  // Server-sent events: the whole live-update mechanism, in one route.
  if (url.pathname === "/stream") {
    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store",
      connection: "keep-alive",
      ...setCookie,
    });
    res.write(`event: hello\ndata: ${JSON.stringify({ at: Date.now() })}\n\n`);
    clients.add(res);

    // Proxies and browsers drop a silent event-stream; a comment line every 25s keeps it open.
    const heartbeat = setInterval(() => {
      try {
        res.write(": keep-alive\n\n");
      } catch {
        clearInterval(heartbeat);
        clients.delete(res);
      }
    }, 25_000);

    req.on("close", () => {
      clearInterval(heartbeat);
      clients.delete(res);
    });
    return;
  }

  // Browser interactions land here and are appended as JSONL for the agent's next turn. This is
  // the honest boundary of "live": the page updates instantly, but the agent only reads these
  // when its next turn runs.
  if (url.pathname === "/feedback" && req.method === "POST") {
    let event;
    try {
      event = JSON.parse(await readBody(req));
    } catch (err) {
      res.writeHead(400, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: err.message }));
      return;
    }
    const line = JSON.stringify({ ...event, timestamp: Math.floor(Date.now() / 1000) });
    fs.appendFileSync(EVENTS_PATH, `${line}\n`);
    res.writeHead(200, { "content-type": "application/json; charset=utf-8", ...setCookie });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("404\n");
});

server.listen(PORT, HOST, () => {
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : PORT;
  const info = {
    type: "server-started",
    pid: process.pid,
    port,
    host: HOST,
    url: `http://${URL_HOST}:${port}/?key=${KEY}`,
    sessionDir: SESSION_DIR,
    modelPath: MODEL_PATH,
    eventsPath: EVENTS_PATH,
    idleTimeoutMinutes: IDLE_MINUTES,
  };
  fs.writeFileSync(INFO_PATH, `${JSON.stringify(info, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(info)}\n`);
});

function shutdown() {
  try {
    fs.writeFileSync(path.join(SESSION_DIR, "server-stopped"), `${new Date().toISOString()}\n`);
  } catch {
    /* best effort */
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
