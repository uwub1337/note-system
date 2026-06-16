const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

// 讀取本地 .env.local，讓使用者不用把 API Key 寫進程式碼。
function loadLocalEnv() {
  const envPath = path.join(ROOT, ".env.local");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^([^#=\s]+)\s*=\s*(.+)$/);

    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^"|"$/g, "");
    }
  }
}

loadLocalEnv();

// 固定 AI 摘要提示詞，與 Vercel API 保持一致。
const SUMMARY_PROMPT = `你是筆記整理助手。請根據使用者提供的一篇或多篇筆記，整理成清楚、適合學生複習的繁體中文摘要。

請輸出 Markdown 格式，必須包含：

### 精簡摘要
用 2 到 4 句話整理整體重點。

規則：
1. 使用繁體中文。
2. 不要編造筆記中沒有的內容。
3. 內容要精簡、清楚、適合直接貼回筆記。
4. 如果有多篇筆記，請先整合重複內容，再輸出摘要。`;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function normalizeNotes(notes) {
  if (!Array.isArray(notes)) {
    return [];
  }

  return notes
    .map((note, index) => {
      const title = note?.title?.trim() || `未命名筆記 ${index + 1}`;
      const category = note?.category?.trim();
      const tags = Array.isArray(note?.tags) ? note.tags.join(", ") : "";
      const content = note?.contentText || note?.content || "";

      return [
        `## ${title}`,
        category ? `分類：${category}` : "",
        tags ? `標籤：${tags}` : "",
        "內容：",
        content,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .filter(Boolean);
}

function getGeminiText(data) {
  return data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();
}

async function handleSummary(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    sendJson(res, 500, { error: "Missing GEMINI_API_KEY. 請先執行 setup-gemini-env.bat。" });
    return;
  }

  const body = await readBody(req);
  const noteBlocks = normalizeNotes(body.notes);

  if (!noteBlocks.length) {
    sendJson(res, 400, { error: "請選擇筆記。" });
    return;
  }

  const prompt = `${SUMMARY_PROMPT}

以下是使用者選擇的筆記：

${noteBlocks.join("\n\n---\n\n")}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    sendJson(res, response.status, {
      error: data?.error?.message || "AI 摘要產生失敗。",
    });
    return;
  }

  sendJson(res, 200, {
    summary: getGeminiText(data) || "AI 沒有回傳摘要內容。",
  });
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  const safePath = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.normalize(path.join(ROOT, safePath));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/summarize") && req.method === "POST") {
      await handleSummary(req, res);
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Server error." });
  }
});

server.listen(PORT, () => {
  console.log(`筆記管理系統已啟動：http://localhost:${PORT}`);
});
