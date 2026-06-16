const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

// 固定 AI 摘要提示詞，讓輸出格式穩定且適合直接貼回筆記。
const SUMMARY_PROMPT = `你是筆記整理助手。請根據使用者提供的一篇或多篇筆記，整理成清楚、適合學生複習的繁體中文摘要。

請輸出 Markdown 格式，必須包含：

### 精簡摘要
用 2 到 4 句話整理整體重點。

規則：
1. 使用繁體中文。
2. 不要編造筆記中沒有的內容。
3. 內容要精簡、清楚、適合直接貼回筆記。
4. 如果有多篇筆記，請先整合重複內容，再輸出摘要。`;

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Only POST requests are allowed." });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Missing GEMINI_API_KEY." });
  }

  const noteBlocks = normalizeNotes(req.body?.notes);

  if (!noteBlocks.length) {
    return res.status(400).json({ error: "請選擇筆記。" });
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
    return res.status(response.status).json({
      error: data?.error?.message || "AI 摘要產生失敗。",
    });
  }

  return res.status(200).json({
    summary: getGeminiText(data) || "AI 沒有回傳摘要內容。",
  });
}
