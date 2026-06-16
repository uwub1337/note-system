const STORAGE_KEYS = {
  notes: "noteSystem.notes",
  theme: "noteSystem.theme",
  sidebarCollapsed: "noteSystem.sidebarCollapsed",
};

const demoNotes = [
  {
    id: "note-demo-1",
    title: "JavaScript 期末專題開工清單",
    content: '確認四人分工、決定資料欄位、<mark class="hl-yellow">先完成本地端可展示版本</mark>。',
    category: "專題",
    tags: ["JavaScript", "分工", "期末"],
    isFavorite: true,
    isPinned: true,
    createdAt: "2026-06-01T09:00:00.000Z",
    updatedAt: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "note-demo-2",
    title: "CRUD 功能測試",
    content: "新增、查看、編輯、刪除都要測一次，重整後資料也要留在瀏覽器。",
    category: "測試",
    tags: ["測試", "CRUD", "localStorage"],
    isFavorite: false,
    isPinned: false,
    createdAt: "2026-06-08T12:30:00.000Z",
    updatedAt: "2026-06-08T12:30:00.000Z",
  },
  {
    id: "note-demo-3",
    title: "報告展示順序",
    content: "動機、畫面、核心功能、搜尋分類、資料儲存與測試，最後補未來擴充。",
    category: "報告",
    tags: ["收藏", "報告", "簡報", "展示"],
    isFavorite: true,
    isPinned: false,
    createdAt: "2026-06-08T12:31:00.000Z",
    updatedAt: "2026-06-08T12:31:00.000Z",
  },
];

const state = {
  notes: [],
  selectedId: "",
  search: "",
  category: "all",
  status: "all",
  history: [],
  future: [],
  autoSaveTimer: null,
  isApplyingSnapshot: false,
};

const elements = {
  appView: document.querySelector("#appView"),
  sidebarCollapseBtn: document.querySelector("#sidebarCollapseBtn"),
  newNoteBtn: document.querySelector("#newNoteBtn"),
  seedBtn: document.querySelector("#seedBtn"),
  themeToggleBtn: document.querySelector("#themeToggleBtn"),
  themeIcon: document.querySelector("#themeIcon"),
  themeText: document.querySelector("#themeText"),
  exportBtn: document.querySelector("#exportBtn"),
  searchInput: document.querySelector("#searchInput"),
  categoryFilter: document.querySelector("#categoryFilter"),
  statusFilter: document.querySelector("#statusFilter"),
  totalCount: document.querySelector("#totalCount"),
  favoriteCount: document.querySelector("#favoriteCount"),
  noteList: document.querySelector("#noteList"),
  emptyState: document.querySelector("#emptyState"),
  noteForm: document.querySelector("#noteForm"),
  noteId: document.querySelector("#noteId"),
  noteTitle: document.querySelector("#noteTitle"),
  noteCategory: document.querySelector("#noteCategory"),
  categoryOptions: document.querySelector("#categoryOptions"),
  noteTags: document.querySelector("#noteTags"),
  noteContent: document.querySelector("#noteContent"),
  noteFavorite: document.querySelector("#noteFavorite"),
  notePinned: document.querySelector("#notePinned"),
  tagPreview: document.querySelector("#tagPreview"),
  deleteBtn: document.querySelector("#deleteBtn"),
  clearFormBtn: document.querySelector("#clearFormBtn"),
  saveStatus: document.querySelector("#saveStatus"),
  titleError: document.querySelector("#titleError"),
  undoBtn: document.querySelector("#undoBtn"),
  redoBtn: document.querySelector("#redoBtn"),
  highlightButtons: document.querySelectorAll("[data-highlight]"),
  textColorButtons: document.querySelectorAll("[data-text-color]"),
  formatButtons: document.querySelectorAll("[data-format]"),
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sanitizeEditorHtml(rawHtml) {
  const container = document.createElement("div");
  container.innerHTML = rawHtml || "";

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.textContent || "");
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const tagName = node.tagName.toLowerCase();
    const childHtml = Array.from(node.childNodes).map(walk).join("");

    if (tagName === "br") return "<br>";
    if (tagName === "div" || tagName === "p") return `${childHtml}<br>`;
    if (tagName === "mark") {
      const allowedClasses = [
        "hl-yellow",
        "hl-green",
        "hl-teal",
        "hl-blue",
        "hl-purple",
        "hl-pink",
        "hl-red",
        "hl-orange",
        "hl-gray",
        "hl-black",
        "hl-white",
      ];
      const nextClass = allowedClasses.find((className) => node.classList.contains(className)) || "hl-yellow";
      return `<mark class="${nextClass}">${childHtml}</mark>`;
    }

    if (tagName === "span") {
      const colorClasses = [
        "text-red",
        "text-orange",
        "text-yellow",
        "text-green",
        "text-teal",
        "text-blue",
        "text-purple",
        "text-pink",
        "text-gray",
        "text-black",
        "text-white",
      ];
      const formatClasses = ["fmt-bold", "fmt-italic", "fmt-strike"];
      const nextClasses = [...colorClasses, ...formatClasses].filter((className) => node.classList.contains(className));
      return nextClasses.length ? `<span class="${nextClasses.join(" ")}">${childHtml}</span>` : childHtml;
    }

    return childHtml;
  }

  return Array.from(container.childNodes)
    .map(walk)
    .join("")
    .replace(/(<br>)+$/g, "")
    .trim();
}

function htmlToPlainText(html) {
  const container = document.createElement("div");
  container.innerHTML = html || "";
  return (container.textContent || "").replace(/\s+/g, " ").trim();
}

function normalizeNote(note) {
  const now = new Date().toISOString();
  return {
    id: note.id || `note-${Date.now()}`,
    title: note.title || "未命名筆記",
    content: sanitizeEditorHtml(note.content || ""),
    category: note.category || "未分類",
    tags: Array.isArray(note.tags) ? note.tags : [],
    isFavorite: Boolean(note.isFavorite),
    isPinned: Boolean(note.isPinned),
    createdAt: note.createdAt || now,
    updatedAt: note.updatedAt || now,
  };
}

function loadNotes() {
  const rawNotes = localStorage.getItem(STORAGE_KEYS.notes);

  if (!rawNotes) {
    localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(demoNotes));
    return demoNotes.map(normalizeNote);
  }

  try {
    const parsedNotes = JSON.parse(rawNotes);
    return Array.isArray(parsedNotes) ? parsedNotes.map(normalizeNote) : demoNotes.map(normalizeNote);
  } catch {
    return demoNotes.map(normalizeNote);
  }
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(state.notes));
}

function applyTheme(theme) {
  const availableThemes = ["graphite", "midnight"];
  const nextTheme = availableThemes.includes(theme) ? theme : "graphite";
  document.body.dataset.theme = nextTheme;
  elements.themeIcon.textContent = nextTheme === "midnight" ? "☾" : "☀";
  elements.themeText.textContent = nextTheme === "midnight" ? "深色模式" : "淺色模式";
  localStorage.setItem(STORAGE_KEYS.theme, nextTheme);
}

function applyPanelState(panel, isCollapsed) {
  if (panel === "sidebar") {
    elements.appView.classList.toggle("sidebar-collapsed", isCollapsed);
    elements.sidebarCollapseBtn.setAttribute("aria-expanded", String(!isCollapsed));
    elements.sidebarCollapseBtn.title = isCollapsed ? "展開工作台" : "收合工作台";
    elements.sidebarCollapseBtn.setAttribute("aria-label", isCollapsed ? "展開工作台" : "收合工作台");
    localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, String(isCollapsed));
  }

}

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getCategories() {
  const categories = state.notes
    .map((note) => note.category.trim())
    .filter(Boolean);
  return [...new Set(categories)].sort((a, b) => a.localeCompare(b, "zh-Hant"));
}

function parseTags(value) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getTagClass(tag) {
  const normalized = tag.trim().toLowerCase();
  if (["重要", "urgent", "important"].includes(normalized)) return "tag-chip-important";
  if (["完成", "done", "complete"].includes(normalized)) return "tag-chip-done";
  if (["學習", "study", "learning"].includes(normalized)) return "tag-chip-study";
  return "";
}

function renderTagPreview() {
  const tags = parseTags(elements.noteTags.value);
  elements.tagPreview.innerHTML = "";

  tags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = `badge ${getTagClass(tag)}`.trim();
    chip.textContent = `#${tag}`;
    elements.tagPreview.append(chip);
  });
}

function getEditorHtml() {
  return sanitizeEditorHtml(elements.noteContent.innerHTML);
}

function setEditorHtml(html) {
  elements.noteContent.innerHTML = sanitizeEditorHtml(html);
}

function getEditorSnapshot() {
  return {
    title: elements.noteTitle.value.trim(),
    category: elements.noteCategory.value.trim() || "未分類",
    tags: parseTags(elements.noteTags.value),
    content: getEditorHtml(),
    isFavorite: elements.noteFavorite.checked,
    isPinned: elements.notePinned.checked,
  };
}

function syncHistoryButtons() {
  elements.undoBtn.disabled = state.history.length === 0;
  elements.redoBtn.disabled = state.future.length === 0;
}

function pushHistorySnapshot() {
  if (state.isApplyingSnapshot) return;
  state.history.push({
    notes: JSON.parse(JSON.stringify(state.notes)),
    selectedId: state.selectedId,
  });
  if (state.history.length > 60) state.history.shift();
  state.future = [];
  syncHistoryButtons();
}

function applySnapshot(snapshot) {
  state.isApplyingSnapshot = true;
  clearTimeout(state.autoSaveTimer);
  state.notes = snapshot.notes.map(normalizeNote);
  state.selectedId = snapshot.selectedId || "";
  saveNotes();
  renderAll();

  if (state.selectedId) {
    const note = state.notes.find((item) => item.id === state.selectedId);
    if (note) {
      elements.noteId.value = note.id;
      elements.noteTitle.value = note.title;
      elements.noteCategory.value = note.category;
      elements.noteTags.value = note.tags.join(", ");
      setEditorHtml(note.content);
      elements.noteFavorite.checked = note.isFavorite;
      elements.notePinned.checked = note.isPinned;
      elements.deleteBtn.disabled = false;
      elements.saveStatus.textContent = `上次更新：${formatDate(note.updatedAt)}`;
      elements.titleError.classList.add("is-hidden");
      renderTagPreview();
    } else {
      clearForm(false);
    }
  } else {
    clearForm(false);
  }

  state.isApplyingSnapshot = false;
  syncHistoryButtons();
}

function undoChanges() {
  if (state.history.length === 0) return;
  state.future.push({
    notes: JSON.parse(JSON.stringify(state.notes)),
    selectedId: state.selectedId,
  });
  const snapshot = state.history.pop();
  applySnapshot(snapshot);
}

function redoChanges() {
  if (state.future.length === 0) return;
  state.history.push({
    notes: JSON.parse(JSON.stringify(state.notes)),
    selectedId: state.selectedId,
  });
  const snapshot = state.future.pop();
  applySnapshot(snapshot);
}

function makeNoteCard(note) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = `note-card${note.id === state.selectedId ? " active" : ""}`;
  card.dataset.id = note.id;

  const badgeRow = document.createElement("div");
  badgeRow.className = "badge-row";

  if (note.isPinned) {
    const badge = document.createElement("span");
    badge.className = "badge warn";
    badge.textContent = "置頂";
    badgeRow.append(badge);
  }

  if (note.isFavorite) {
    const badge = document.createElement("span");
    badge.className = "badge warn";
    badge.textContent = "收藏";
    badgeRow.append(badge);
  }

  if (note.category) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = note.category;
    badgeRow.append(badge);
  }

  note.tags.forEach((tag) => {
    const badge = document.createElement("span");
    badge.className = `badge ${getTagClass(tag)}`.trim();
    badge.textContent = `#${tag}`;
    badgeRow.append(badge);
  });

  const title = document.createElement("h3");
  title.textContent = note.title;

  const preview = document.createElement("p");
  preview.innerHTML = note.content || "沒有內容";

  const meta = document.createElement("small");
  meta.className = "note-meta";
  meta.textContent = `更新：${formatDate(note.updatedAt)}`;

  card.append(badgeRow, title, preview, meta);
  card.addEventListener("click", () => selectNote(note.id));
  return card;
}

function getFilteredNotes() {
  const keyword = state.search.trim().toLowerCase();

  return state.notes
    .filter((note) => {
      const plainText = htmlToPlainText(note.content).toLowerCase();
      const matchesKeyword =
        !keyword ||
        note.title.toLowerCase().includes(keyword) ||
        plainText.includes(keyword);
      const matchesCategory = state.category === "all" || note.category === state.category;
      const matchesStatus =
        state.status === "all" ||
        (state.status === "favorite" && note.isFavorite) ||
        (state.status === "pinned" && note.isPinned);

      return matchesKeyword && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
}

function renderFilters() {
  const categories = getCategories();
  const selectedCategory = categories.includes(state.category) ? state.category : "all";
  state.category = selectedCategory;

  elements.categoryFilter.innerHTML = '<option value="all">全部分類</option>';
  elements.categoryOptions.innerHTML = "";

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    option.selected = category === selectedCategory;
    elements.categoryFilter.append(option);

    const dataOption = document.createElement("option");
    dataOption.value = category;
    elements.categoryOptions.append(dataOption);
  });

  elements.categoryFilter.value = selectedCategory;
}

function renderNotes() {
  const notes = getFilteredNotes();
  elements.noteList.innerHTML = "";
  elements.emptyState.classList.toggle("is-hidden", notes.length > 0);

  notes.forEach((note) => {
    elements.noteList.append(makeNoteCard(note));
  });

  elements.totalCount.textContent = state.notes.length;
  elements.favoriteCount.textContent = state.notes.filter((note) => note.isFavorite).length;
}

function renderAll() {
  renderFilters();
  renderNotes();
}

function selectNote(id) {
  const note = state.notes.find((item) => item.id === id);
  if (!note) return;

  clearTimeout(state.autoSaveTimer);
  state.selectedId = id;
  elements.noteId.value = note.id;
  elements.noteTitle.value = note.title;
  elements.noteCategory.value = note.category;
  elements.noteTags.value = note.tags.join(", ");
  setEditorHtml(note.content);
  elements.noteFavorite.checked = note.isFavorite;
  elements.notePinned.checked = note.isPinned;
  elements.deleteBtn.disabled = false;
  elements.saveStatus.textContent = `上次更新：${formatDate(note.updatedAt)}`;
  elements.titleError.classList.add("is-hidden");
  renderTagPreview();
  renderNotes();
}

function clearForm(shouldFocus = true) {
  clearTimeout(state.autoSaveTimer);
  state.selectedId = "";
  elements.noteForm.reset();
  elements.noteId.value = "";
  setEditorHtml("");
  elements.deleteBtn.disabled = true;
  elements.saveStatus.textContent = "輸入後會自動儲存";
  elements.titleError.classList.add("is-hidden");
  renderTagPreview();
  renderNotes();
  if (shouldFocus) elements.noteTitle.focus();
}

function queueAutoSave() {
  if (state.isApplyingSnapshot) return;
  clearTimeout(state.autoSaveTimer);
  elements.saveStatus.textContent = "自動儲存中...";
  state.autoSaveTimer = setTimeout(commitAutoSave, 500);
}

function commitAutoSave() {
  if (state.isApplyingSnapshot) return;

  const snapshot = getEditorSnapshot();
  const existingId = elements.noteId.value;
  const now = new Date().toISOString();
  const hasMeaningfulInput =
    snapshot.title ||
    htmlToPlainText(snapshot.content) ||
    snapshot.tags.length > 0 ||
    snapshot.category !== "未分類" ||
    snapshot.isFavorite ||
    snapshot.isPinned;

  if (!existingId && !hasMeaningfulInput) {
    elements.saveStatus.textContent = "輸入後會自動儲存";
    return;
  }

  if (!snapshot.title) {
    elements.titleError.classList.remove("is-hidden");
    elements.saveStatus.textContent = "請先輸入標題";
    return;
  }

  elements.titleError.classList.add("is-hidden");

  const payload = {
    id: existingId || `note-${Date.now()}`,
    title: snapshot.title,
    content: snapshot.content,
    category: snapshot.category,
    tags: snapshot.tags,
    isFavorite: snapshot.isFavorite,
    isPinned: snapshot.isPinned,
    createdAt: now,
    updatedAt: now,
  };

  if (existingId) {
    const current = state.notes.find((note) => note.id === existingId);
    if (
      current &&
      current.title === payload.title &&
      current.content === payload.content &&
      current.category === payload.category &&
      current.isFavorite === payload.isFavorite &&
      current.isPinned === payload.isPinned &&
      JSON.stringify(current.tags) === JSON.stringify(payload.tags)
    ) {
      elements.saveStatus.textContent = `上次更新：${formatDate(current.updatedAt)}`;
      return;
    }

    pushHistorySnapshot();
    state.notes = state.notes.map((note) =>
      note.id === existingId ? { ...note, ...payload, createdAt: note.createdAt } : note,
    );
  } else {
    pushHistorySnapshot();
    state.notes = [payload, ...state.notes];
  }

  state.selectedId = payload.id;
  saveNotes();
  renderAll();
  selectNote(payload.id);
  elements.saveStatus.textContent = "已自動儲存";
}

function deleteSelectedNote() {
  if (!state.selectedId) return;
  const note = state.notes.find((item) => item.id === state.selectedId);
  const message = note ? `確定要刪除「${note.title}」嗎？` : "確定要刪除這筆筆記嗎？";

  if (!window.confirm(message)) return;

  pushHistorySnapshot();
  state.notes = state.notes.filter((item) => item.id !== state.selectedId);
  saveNotes();
  clearForm();
  renderAll();
  syncHistoryButtons();
}

function resetDemoData() {
  if (!window.confirm("確定要重置成展示資料嗎？目前筆記會被覆蓋。")) return;

  pushHistorySnapshot();
  state.notes = demoNotes.map(normalizeNote);
  state.search = "";
  state.category = "all";
  state.status = "all";
  elements.searchInput.value = "";
  elements.statusFilter.value = "all";
  saveNotes();
  clearForm();
  renderAll();
  syncHistoryButtons();
}

function exportNotes() {
  const notes = getFilteredNotes();
  const content = notes
    .map((note) => {
      const tags = note.tags.length ? note.tags.map((tag) => `#${tag}`).join(" ") : "無";
      return [
        `標題：${note.title}`,
        `分類：${note.category}`,
        `標籤：${tags}`,
        `收藏：${note.isFavorite ? "是" : "否"}`,
        `置頂：${note.isPinned ? "是" : "否"}`,
        `更新時間：${formatDate(note.updatedAt)}`,
        "",
        htmlToPlainText(note.content) || "沒有內容",
      ].join("\n");
    })
    .join("\n\n---\n\n");

  const blob = new Blob([content || "目前沒有可匯出的筆記。"], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "notes-export.txt";
  link.click();
  URL.revokeObjectURL(url);
}

function handleEditorPaste(event) {
  event.preventDefault();
  const text = (event.clipboardData || window.clipboardData).getData("text/plain");
  document.execCommand("insertText", false, text);
}

function applyHighlight(color) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  if (!elements.noteContent.contains(range.commonAncestorContainer)) return;

  const mark = document.createElement("mark");
  mark.className = `hl-${color}`;

  try {
    range.surroundContents(mark);
  } catch {
    const fragment = range.extractContents();
    mark.appendChild(fragment);
    range.insertNode(mark);
  }

  selection.removeAllRanges();
  queueAutoSave();
}

function applyTextColor(color) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  if (!elements.noteContent.contains(range.commonAncestorContainer)) return;

  const span = document.createElement("span");
  span.className = `text-${color}`;

  try {
    range.surroundContents(span);
  } catch {
    const fragment = range.extractContents();
    span.appendChild(fragment);
    range.insertNode(span);
  }

  selection.removeAllRanges();
  queueAutoSave();
}

function applyInlineFormat(format) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  if (!elements.noteContent.contains(range.commonAncestorContainer)) return;

  const formatMap = {
    bold: "fmt-bold",
    italic: "fmt-italic",
    strike: "fmt-strike",
  };
  const className = formatMap[format];
  if (!className) return;

  const span = document.createElement("span");
  span.className = className;

  try {
    range.surroundContents(span);
  } catch {
    const fragment = range.extractContents();
    span.appendChild(fragment);
    range.insertNode(span);
  }

  selection.removeAllRanges();
  queueAutoSave();
}

function bindEvents() {
  elements.sidebarCollapseBtn.addEventListener("click", () => {
    applyPanelState("sidebar", !elements.appView.classList.contains("sidebar-collapsed"));
  });

  elements.newNoteBtn.addEventListener("click", clearForm);
  elements.clearFormBtn.addEventListener("click", clearForm);
  elements.deleteBtn.addEventListener("click", deleteSelectedNote);
  elements.seedBtn.addEventListener("click", resetDemoData);
  elements.noteForm.addEventListener("submit", (event) => event.preventDefault());

  elements.themeToggleBtn.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "midnight" ? "graphite" : "midnight";
    applyTheme(nextTheme);
  });
  elements.exportBtn.addEventListener("click", exportNotes);

  elements.noteTitle.addEventListener("input", queueAutoSave);
  elements.noteCategory.addEventListener("input", queueAutoSave);
  elements.noteFavorite.addEventListener("change", queueAutoSave);
  elements.notePinned.addEventListener("change", queueAutoSave);

  elements.noteTags.addEventListener("input", () => {
    renderTagPreview();
    queueAutoSave();
  });

  elements.noteContent.addEventListener("input", queueAutoSave);
  elements.noteContent.addEventListener("paste", handleEditorPaste);

  elements.undoBtn.addEventListener("click", undoChanges);
  elements.redoBtn.addEventListener("click", redoChanges);

  elements.highlightButtons.forEach((button) => {
    button.addEventListener("click", () => applyHighlight(button.dataset.highlight));
  });

  elements.textColorButtons.forEach((button) => {
    button.addEventListener("click", () => applyTextColor(button.dataset.textColor));
  });

  elements.formatButtons.forEach((button) => {
    button.addEventListener("click", () => applyInlineFormat(button.dataset.format));
  });

  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderNotes();
  });

  elements.categoryFilter.addEventListener("change", (event) => {
    state.category = event.target.value;
    renderNotes();
  });

  elements.statusFilter.addEventListener("change", (event) => {
    state.status = event.target.value;
    renderNotes();
  });

  document.addEventListener("keydown", (event) => {
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    const metaKey = isMac ? event.metaKey : event.ctrlKey;
    if (!metaKey) return;

    if (event.key.toLowerCase() === "z" && !event.shiftKey) {
      event.preventDefault();
      undoChanges();
    }

    if (event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey)) {
      event.preventDefault();
      redoChanges();
    }
  });
}

function init() {
  state.notes = loadNotes();
  applyTheme(localStorage.getItem(STORAGE_KEYS.theme) || "graphite");
  applyPanelState("sidebar", localStorage.getItem(STORAGE_KEYS.sidebarCollapsed) === "true");
  localStorage.removeItem("noteSystem.leftPanelsCollapsed");
  localStorage.removeItem("noteSystem.listCollapsed");
  elements.deleteBtn.disabled = true;
  bindEvents();
  renderAll();
  clearForm();
  syncHistoryButtons();
}

init();
