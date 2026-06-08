const STORAGE_KEYS = {
  notes: "noteSystem.notes",
  theme: "noteSystem.theme",
};

const demoNotes = [
  {
    id: "note-demo-1",
    title: "JavaScript 期末專題開工清單",
    content: "確認四人分工、決定資料欄位、先完成本地端可展示版本。",
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
    tags: ["CRUD", "localStorage"],
    isFavorite: false,
    isPinned: false,
    createdAt: "2026-06-02T11:30:00.000Z",
    updatedAt: "2026-06-02T11:30:00.000Z",
  },
  {
    id: "note-demo-3",
    title: "報告展示順序",
    content: "動機、畫面、核心功能、搜尋分類、資料儲存與測試，最後補未來擴充。",
    category: "報告",
    tags: ["簡報", "展示"],
    isFavorite: true,
    isPinned: false,
    createdAt: "2026-06-03T14:10:00.000Z",
    updatedAt: "2026-06-03T14:10:00.000Z",
  },
];

const state = {
  notes: [],
  selectedId: "",
  search: "",
  category: "all",
  status: "all",
};

const elements = {
  appView: document.querySelector("#appView"),
  newNoteBtn: document.querySelector("#newNoteBtn"),
  seedBtn: document.querySelector("#seedBtn"),
  themeSelect: document.querySelector("#themeSelect"),
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
  deleteBtn: document.querySelector("#deleteBtn"),
  clearFormBtn: document.querySelector("#clearFormBtn"),
  saveStatus: document.querySelector("#saveStatus"),
  titleError: document.querySelector("#titleError"),
};

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

function normalizeNote(note) {
  const now = new Date().toISOString();
  return {
    id: note.id || `note-${Date.now()}`,
    title: note.title || "未命名筆記",
    content: note.content || "",
    category: note.category || "未分類",
    tags: Array.isArray(note.tags) ? note.tags : [],
    isFavorite: Boolean(note.isFavorite),
    isPinned: Boolean(note.isPinned),
    createdAt: note.createdAt || now,
    updatedAt: note.updatedAt || now,
  };
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(state.notes));
}

function applyTheme(theme) {
  const availableThemes = ["warm", "forest", "ocean", "rose", "graphite"];
  const nextTheme = availableThemes.includes(theme) ? theme : "warm";
  document.body.dataset.theme = nextTheme;
  elements.themeSelect.value = nextTheme;
  localStorage.setItem(STORAGE_KEYS.theme, nextTheme);
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

function makeNoteCard(note) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = `note-card${note.id === state.selectedId ? " active" : ""}`;
  card.dataset.id = note.id;

  const badges = [
    note.isPinned ? '<span class="badge warn">置頂</span>' : "",
    note.isFavorite ? '<span class="badge warn">收藏</span>' : "",
    note.category ? `<span class="badge">${escapeHtml(note.category)}</span>` : "",
    ...note.tags.map((tag) => `<span class="badge">#${escapeHtml(tag)}</span>`),
  ].join("");

  card.innerHTML = `
    <div class="badge-row">${badges}</div>
    <h3>${escapeHtml(note.title)}</h3>
    <p>${escapeHtml(note.content || "沒有內容")}</p>
    <small class="note-meta">更新：${formatDate(note.updatedAt)}</small>
  `;

  card.addEventListener("click", () => selectNote(note.id));
  return card;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getFilteredNotes() {
  const keyword = state.search.trim().toLowerCase();

  return state.notes
    .filter((note) => {
      const matchesKeyword =
        !keyword ||
        note.title.toLowerCase().includes(keyword) ||
        note.content.toLowerCase().includes(keyword);
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

  state.selectedId = id;
  elements.noteId.value = note.id;
  elements.noteTitle.value = note.title;
  elements.noteCategory.value = note.category;
  elements.noteTags.value = note.tags.join(", ");
  elements.noteContent.value = note.content;
  elements.noteFavorite.checked = note.isFavorite;
  elements.notePinned.checked = note.isPinned;
  elements.deleteBtn.disabled = false;
  elements.saveStatus.textContent = `上次更新：${formatDate(note.updatedAt)}`;
  elements.titleError.classList.add("is-hidden");
  renderNotes();
}

function clearForm() {
  state.selectedId = "";
  elements.noteForm.reset();
  elements.noteId.value = "";
  elements.deleteBtn.disabled = true;
  elements.saveStatus.textContent = "新增筆記";
  elements.titleError.classList.add("is-hidden");
  renderNotes();
  elements.noteTitle.focus();
}

function upsertNote(event) {
  event.preventDefault();

  const title = elements.noteTitle.value.trim();
  if (!title) {
    elements.titleError.classList.remove("is-hidden");
    elements.noteTitle.focus();
    return;
  }

  const now = new Date().toISOString();
  const existingId = elements.noteId.value;
  const payload = {
    id: existingId || `note-${Date.now()}`,
    title,
    content: elements.noteContent.value.trim(),
    category: elements.noteCategory.value.trim() || "未分類",
    tags: parseTags(elements.noteTags.value),
    isFavorite: elements.noteFavorite.checked,
    isPinned: elements.notePinned.checked,
    createdAt: now,
    updatedAt: now,
  };

  if (existingId) {
    state.notes = state.notes.map((note) =>
      note.id === existingId ? { ...note, ...payload, createdAt: note.createdAt } : note,
    );
  } else {
    state.notes = [payload, ...state.notes];
  }

  state.selectedId = payload.id;
  saveNotes();
  state.search = "";
  state.category = "all";
  state.status = "all";
  elements.searchInput.value = "";
  elements.statusFilter.value = "all";
  renderAll();
  selectNote(payload.id);
  elements.saveStatus.textContent = "已儲存";
}

function deleteSelectedNote() {
  if (!state.selectedId) return;
  const note = state.notes.find((item) => item.id === state.selectedId);
  const message = note ? `確定要刪除「${note.title}」嗎？` : "確定要刪除這筆筆記嗎？";

  if (!window.confirm(message)) return;

  state.notes = state.notes.filter((item) => item.id !== state.selectedId);
  saveNotes();
  clearForm();
  renderAll();
}

function resetDemoData() {
  if (!window.confirm("確定要重置成展示資料嗎？目前筆記會被覆蓋。")) return;

  state.notes = [...demoNotes];
  state.search = "";
  state.category = "all";
  state.status = "all";
  elements.searchInput.value = "";
  elements.statusFilter.value = "all";
  saveNotes();
  clearForm();
  renderAll();
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
        note.content || "沒有內容",
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

function bindEvents() {
  elements.newNoteBtn.addEventListener("click", clearForm);
  elements.clearFormBtn.addEventListener("click", clearForm);
  elements.deleteBtn.addEventListener("click", deleteSelectedNote);
  elements.seedBtn.addEventListener("click", resetDemoData);
  elements.themeSelect.addEventListener("change", (event) => applyTheme(event.target.value));
  elements.exportBtn.addEventListener("click", exportNotes);
  elements.noteForm.addEventListener("submit", upsertNote);

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
}

function init() {
  state.notes = loadNotes();
  applyTheme(localStorage.getItem(STORAGE_KEYS.theme) || "warm");
  elements.deleteBtn.disabled = true;
  bindEvents();
  renderAll();
  clearForm();
}

init();
