const fs = require("fs");
const http = require("http");
const path = require("path");

loadEnvFile();

const PORT = Number.parseInt(process.env.PORT || "3000", 10);
const ROOT = __dirname;
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Content-Type-Options", "nosniff");

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    });
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    writeJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/lead") {
    try {
      const payload = await readJson(request);
      const validationError = validateLead(payload);

      if (validationError) {
        writeJson(response, 400, { ok: false, error: validationError });
        return;
      }

      if (payload.website) {
        writeJson(response, 200, { ok: true });
        return;
      }

      if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
        writeJson(response, 500, {
          ok: false,
          error: "Не настроены Telegram-переменные окружения."
        });
        return;
      }

      await sendLeadToTelegram({
        name: payload.name,
        phone: payload.phone,
        page: payload.page,
        submittedAt: new Date().toISOString()
      });

      writeJson(response, 200, { ok: true });
      return;
    } catch (error) {
      console.error("Lead delivery failed:", error);
      writeJson(response, 500, {
        ok: false,
        error: "Не удалось отправить заявку. Попробуйте еще раз или напишите в WhatsApp."
      });
      return;
    }
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

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const source = fs.readFileSync(envPath, "utf8");

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1_000_000) {
        reject(new Error("Payload too large."));
        request.destroy();
      }
    });

    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

function validateLead(payload) {
  if (!payload || typeof payload !== "object") {
    return "Некорректные данные формы.";
  }

  if (!String(payload.phone || "").trim()) {
    return "Введите номер телефона.";
  }

  if (!/^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/.test(String(payload.phone || "").trim())) {
    return "Введите номер в формате +7 (700) 000-00-00.";
  }

  if (String(payload.name || "").trim().length > 120) {
    return "Поле с именем слишком длинное.";
  }

  if (String(payload.phone || "").trim().length > 30) {
    return "Поле с телефоном заполнено некорректно.";
  }

  return null;
}

async function sendLeadToTelegram(payload) {
  const text = [
    "Новая заявка на созвон с IT-лендинга",
    "",
    `Имя: ${payload.name || "Не указано"}`,
    `Телефон: ${payload.phone}`,
    `Страница: ${payload.page || "Не указана"}`,
    `Время: ${payload.submittedAt}`
  ].join("\n");

  const apiUrl = `https://api.telegram.org/bot${encodeURIComponent(
    process.env.TELEGRAM_BOT_TOKEN
  )}/sendMessage`;

  const telegramResponse = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      disable_web_page_preview: true,
      text
    })
  });

  const responseData = await telegramResponse.json();

  if (!telegramResponse.ok || !responseData.ok) {
    throw new Error(responseData.description || "Telegram API request failed.");
  }
}

function writeJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}
