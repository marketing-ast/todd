const fs = require("fs");
const http = require("http");
const path = require("path");

const PORT = Number.parseInt(process.env.PORT || "3000", 10);
const ROOT = __dirname;
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Content-Type-Options", "nosniff");

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    writeJson(response, 200, { ok: true });
    return;
  }

  if (request.method !== "GET") {
    writeJson(response, 405, { ok: false, error: "Method not allowed." });
    return;
  }

  const routeMap = {
    "/": path.join(ROOT, "index.html"),
    "/index.html": path.join(ROOT, "index.html"),
    "/styles.css": path.join(ROOT, "styles.css"),
    "/app.js": path.join(ROOT, "app.js")
  };

  const filePath = routeMap[url.pathname];

  if (!filePath || !fs.existsSync(filePath)) {
    writeJson(response, 404, { ok: false, error: "Not found." });
    return;
  }

  const extension = path.extname(filePath);
  response.writeHead(200, {
    "Content-Type": MIME_TYPES[extension] || "application/octet-stream"
  });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(PORT, () => {
  console.log(`Landing page is running on http://localhost:${PORT}`);
});

function writeJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}
