// admin.js — logic for the Resource Manager (admin.html).
// Everything here runs entirely in the browser: there is no server and
// nothing is written back to disk automatically. "Export" downloads a
// fresh data file; you replace the one in /data with it to publish changes.

const CATEGORIES = {
  books: { varName: "BOOKS_RESOURCES", label: "Books", file: "books-data.js" },
  articles: { varName: "ARTICLES_RESOURCES", label: "Journal Articles", file: "articles-data.js" },
  newspaper: { varName: "NEWSPAPER_RESOURCES", label: "Newspaper Articles", file: "newspaper-data.js" },
  periodicals: { varName: "PERIODICALS_RESOURCES", label: "Periodicals", file: "periodicals-data.js" },
  videos: { varName: "VIDEOS_RESOURCES", label: "Videos", file: "videos-data.js" },
  websites: { varName: "WEBSITES_RESOURCES", label: "Websites", file: "websites-data.js" },
};

// Working copies (what the user is editing) and untouched originals
// (for "Reset to original"), keyed by category.
const state = {};
const originals = {};

for (const key in CATEGORIES) {
  const source = window[CATEGORIES[key].varName] || [];
  state[key] = JSON.parse(JSON.stringify(source));
  originals[key] = JSON.parse(JSON.stringify(source));
}

let currentCategory = "books";
let editingIndex = null; // null = adding a new entry

const entryListEl = document.getElementById("entry-list");
const formEl = document.getElementById("entry-form");
const paragraphListEl = document.getElementById("paragraph-list");
const previewEl = document.getElementById("preview-container");

const fields = {
  title: document.getElementById("f-title"),
  citation: document.getElementById("f-citation"),
  topic: document.getElementById("f-topic"),
  image: document.getElementById("f-image"),
  alt: document.getElementById("f-alt"),
  caption: document.getElementById("f-caption"),
};

// ---------- Entry list ----------

function renderEntryList() {
  const entries = state[currentCategory];
  entryListEl.innerHTML = "";
  entries.forEach((entry, index) => {
    const li = document.createElement("li");

    const name = document.createElement("span");
    name.className = "entry-name";
    name.innerHTML = `${stripHtml(entry.title)}<span class="entry-topic">${stripHtml(entry.topic)}</span>`;

    const actions = document.createElement("span");
    actions.className = "entry-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "icon-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => loadEntryIntoForm(index));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "icon-btn delete";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteEntry(index));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(name);
    li.appendChild(actions);
    entryListEl.appendChild(li);
  });
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function deleteEntry(index) {
  const entry = state[currentCategory][index];
  const confirmed = confirm(`Delete "${stripHtml(entry.title)}"? This can't be undone (unless you Reset to original).`);
  if (!confirmed) return;
  state[currentCategory].splice(index, 1);
  if (editingIndex === index) {
    clearForm();
  }
  renderEntryList();
}

// ---------- Form: paragraphs ----------

function addParagraphRow(value) {
  const row = document.createElement("div");
  row.className = "paragraph-row";

  const textarea = document.createElement("textarea");
  textarea.rows = 3;
  textarea.value = value || "";
  textarea.addEventListener("input", updatePreview);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "icon-btn delete";
  removeBtn.textContent = "\u00d7";
  removeBtn.addEventListener("click", () => {
    row.remove();
    updatePreview();
  });

  row.appendChild(textarea);
  row.appendChild(removeBtn);
  paragraphListEl.appendChild(row);
}

function getParagraphs() {
  return Array.from(paragraphListEl.querySelectorAll("textarea"))
    .map((t) => t.value.trim())
    .filter((v) => v.length > 0);
}

document.getElementById("add-paragraph-btn").addEventListener("click", () => {
  addParagraphRow("");
});

// ---------- Form: load / clear ----------

function clearForm() {
  editingIndex = null;
  formEl.reset();
  paragraphListEl.innerHTML = "";
  addParagraphRow("");
  updatePreview();
}

function loadEntryIntoForm(index) {
  const entry = state[currentCategory][index];
  editingIndex = index;
  fields.title.value = entry.title;
  fields.citation.value = entry.citation;
  fields.topic.value = entry.topic;
  fields.image.value = entry.image;
  fields.alt.value = entry.imageAlt;
  fields.caption.value = entry.caption;
  paragraphListEl.innerHTML = "";
  (entry.annotation.length ? entry.annotation : [""]).forEach(addParagraphRow);
  updatePreview();
  window.scrollTo({ top: formEl.offsetTop - 20, behavior: "smooth" });
}

function buildResourceFromForm() {
  return {
    title: fields.title.value.trim(),
    citation: fields.citation.value.trim(),
    topic: fields.topic.value.trim(),
    image: fields.image.value.trim(),
    imageAlt: fields.alt.value.trim(),
    caption: fields.caption.value.trim(),
    annotation: getParagraphs(),
  };
}

// ---------- Live preview ----------

function updatePreview() {
  const resource = buildResourceFromForm();
  if (!resource.title && !resource.citation) {
    previewEl.innerHTML = '<p style="color:var(--peach); font-size:0.85rem;">Start filling in the form to see a preview here.</p>';
    return;
  }
  previewEl.innerHTML = renderResourceEntry(resource);
}

for (const key in fields) {
  fields[key].addEventListener("input", updatePreview);
}

// ---------- Save / cancel ----------

formEl.addEventListener("submit", (e) => {
  e.preventDefault();
  const resource = buildResourceFromForm();

  if (!resource.title || !resource.citation || !resource.topic) {
    alert("Please fill in at least the title, citation, and topic.");
    return;
  }

  if (editingIndex === null) {
    state[currentCategory].push(resource);
  } else {
    state[currentCategory][editingIndex] = resource;
  }

  renderEntryList();
  clearForm();
});

document.getElementById("cancel-btn").addEventListener("click", clearForm);
document.getElementById("add-new-btn").addEventListener("click", clearForm);

// ---------- Category tabs ----------

document.getElementById("category-tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".cat-tab");
  if (!btn) return;
  document.querySelectorAll(".cat-tab").forEach((t) => t.classList.remove("active"));
  btn.classList.add("active");
  currentCategory = btn.dataset.cat;
  clearForm();
  renderEntryList();
});

// ---------- Export ----------

document.getElementById("export-btn").addEventListener("click", () => {
  const cat = CATEGORIES[currentCategory];
  const header =
    `// ${cat.file} — resource data for the ${cat.label} page.\n` +
    `// Edit this file directly, or use admin.html to add/edit/delete entries\n` +
    `// and export a fresh copy of this file.\n\n` +
    `var ${cat.varName} = `;
  const body = JSON.stringify(state[currentCategory], null, 2);
  const fileContent = header + body + ";\n";

  const blob = new Blob([fileContent], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = cat.file;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// ---------- Import ----------

document.getElementById("import-input").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = reader.result;
      const eqIdx = text.indexOf("=");
      const startIdx = text.indexOf("[", eqIdx);
      const endIdx = text.lastIndexOf("]");
      if (eqIdx === -1 || startIdx === -1 || endIdx === -1) {
        throw new Error("Could not find a resource array in this file.");
      }
      const parsed = JSON.parse(text.slice(startIdx, endIdx + 1));

      // Guess the category from the filename (e.g. "articles-data.js");
      // fall back to whichever tab is currently selected.
      let targetCat = currentCategory;
      for (const key in CATEGORIES) {
        if (file.name.includes(key)) {
          targetCat = key;
          break;
        }
      }

      state[targetCat] = parsed;
      if (targetCat !== currentCategory) {
        document.querySelectorAll(".cat-tab").forEach((t) => t.classList.remove("active"));
        document.querySelector(`.cat-tab[data-cat="${targetCat}"]`).classList.add("active");
        currentCategory = targetCat;
      }
      clearForm();
      renderEntryList();
      alert(`Imported ${parsed.length} entries into "${CATEGORIES[targetCat].label}".`);
    } catch (err) {
      alert("Sorry, that file couldn't be read: " + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = ""; // allow importing the same file again later
});

// ---------- Reset ----------

document.getElementById("reset-btn").addEventListener("click", () => {
  const confirmed = confirm(
    `Reset "${CATEGORIES[currentCategory].label}" back to the data it started with this session? Any unexported edits will be lost.`
  );
  if (!confirmed) return;
  state[currentCategory] = JSON.parse(JSON.stringify(originals[currentCategory]));
  clearForm();
  renderEntryList();
});

// ---------- Init ----------

clearForm();
renderEntryList();
