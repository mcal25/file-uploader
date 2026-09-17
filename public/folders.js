const page = document.querySelector(".folders-page-panel");
const currentFolderId = page.dataset.folderId;

const filePicker = document.getElementById("file-picker");
const uploadButton = document.getElementById("file-upload-submit");
const dropOverlay = document.getElementById("drop-overlay");
const uploadConfirmation = document.getElementById("upload-confirmation");
const uploadSummary = document.getElementById("upload-summary");
const uploadFileList = document.getElementById("upload-file-list");
const cancelUpload = document.getElementById("cancel-upload");
const confirmUpload = document.getElementById("confirm-upload");

let pendingFiles = [];
let dragDepth = 0;

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unit = 0;

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unit]}`;
}

function showUploadConfirmation(files) {
  pendingFiles = files;
  const folderPaths = new Set();
  let totalSize = 0;

  uploadFileList.replaceChildren();
  files.forEach(({ file, path }) => {
    totalSize += file.size;
    const parts = path.split("/");
    parts.pop();

    for (let index = 1; index <= parts.length; index += 1) {
      folderPaths.add(parts.slice(0, index).join("/"));
    }

    const item = document.createElement("li");
    item.textContent = `${path} (${formatSize(file.size)})`;
    uploadFileList.appendChild(item);
  });

  const fileLabel = files.length === 1 ? "file" : "files";
  const folderLabel = folderPaths.size === 1 ? "folder" : "folders";
  uploadSummary.textContent = `${files.length} ${fileLabel} and ${folderPaths.size} ${folderLabel} selected. Total size: ${formatSize(totalSize)}.`;
  uploadConfirmation.hidden = false;
  confirmUpload.focus();
}

function closeUploadConfirmation() {
  uploadConfirmation.hidden = true;
  pendingFiles = [];
}

function filesFromPicker(fileList) {
  // A directory picker may provide webkitRelativePath, which preserves folders.
  return Array.from(fileList).map((file) => ({
    file,
    path: file.webkitRelativePath || file.name,
  }));
}

async function readEntry(entry, parentPath = "") {
  // Dropped folders are directory entries. Read each directory in batches,
  // then recurse into child directories.
  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
    return [{ file, path: `${parentPath}${file.name}` }];
  }

  const reader = entry.createReader();
  const entries = [];
  let batch;

  do {
    batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
    entries.push(...batch);
  } while (batch.length);

  const files = [];
  for (const child of entries) {
    files.push(...await readEntry(child, `${parentPath}${entry.name}/`));
  }
  return files;
}

async function filesFromDrop(dataTransfer) {
  // DataTransferItem lets us distinguish dropped files from dropped folders.
  const files = [];
  const items = Array.from(dataTransfer.items || []);

  for (const item of items) {
    const entry = item.webkitGetAsEntry?.();
    if (entry) {
      files.push(...await readEntry(entry));
    } else if (item.kind === "file") {
      const file = item.getAsFile();
      if (file) files.push({ file, path: file.name });
    }
  }

  return files;
}

function openContextMenu(event, itemNode) {
  event.preventDefault();
  event.stopPropagation();

  const contextMenu = document.getElementById("context-menu");
  const downloadButton = document.getElementById("menu-download");
  contextMenu.dataset.activeType = itemNode.dataset.type;
  contextMenu.dataset.activeId = itemNode.dataset.id;
  contextMenu.dataset.activeName = itemNode.dataset.name;
  console.log(itemNode.dataset);
  downloadButton.hidden = false;

  const menuWidth = 160;
  const menuHeight = 90;
  const left = Math.min(event.clientX, window.innerWidth - menuWidth - 10);
  const top = Math.min(event.clientY, window.innerHeight - menuHeight - 10);

  contextMenu.style.left = `${left}px`;
  contextMenu.style.top = `${top}px`;
  contextMenu.style.display = "block";
}

function closeContextMenu() {
  document.getElementById("context-menu").style.display = "none";
}

function submitItemAction(action) {
  const contextMenu = document.getElementById("context-menu");
  const type = contextMenu.dataset.activeType;
  const id = contextMenu.dataset.activeId;
  const name = contextMenu.dataset.activeName;
  let newName;
  if (!type || !id) return;

  if (action === "rename") {
    newName = prompt(`Rename ${name}:`, name);
    if (!newName || newName === name) return closeContextMenu();
  }

  if (action === "delete" && !confirm(`Are you sure you want to delete "${name}"?`)) {
    return closeContextMenu();
  }

  if (action === "download") {
    const downloadPath = type === "folders"
      ? `/folders/${id}/download`
      : `/folders/files/${id}/download`;
    window.location.assign(downloadPath);
    return closeContextMenu();
  }

  if (action === "sharelink") {
    
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = type === "folders"
    ? `/folders/${id}/${action}`
    : `/folders/files/${id}/${action}`;

  if (action === "rename") {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "name";
    input.value = newName;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

uploadButton.addEventListener("click", () => filePicker.click());
filePicker.addEventListener("change", () => {
  const files = filesFromPicker(filePicker.files);
  if (files.length) showUploadConfirmation(files);
  filePicker.value = "";
});

["dragenter", "dragover"].forEach((eventName) => {
  document.addEventListener(eventName, (event) => {
    event.preventDefault();
    dragDepth += 1;
    dropOverlay.classList.add("visible");
  });
});

document.addEventListener("dragleave", (event) => {
  event.preventDefault();
  dragDepth -= 1;
  if (dragDepth <= 0) {
    dragDepth = 0;
    dropOverlay.classList.remove("visible");
  }
});

document.addEventListener("drop", async (event) => {
  event.preventDefault();
  dragDepth = 0;
  dropOverlay.classList.remove("visible");

  const files = await filesFromDrop(event.dataTransfer);
  if (files.length) showUploadConfirmation(files);
});

cancelUpload.addEventListener("click", closeUploadConfirmation);
uploadConfirmation.addEventListener("click", (event) => {
  if (event.target === uploadConfirmation) closeUploadConfirmation();
});

confirmUpload.addEventListener("click", async () => {
  confirmUpload.disabled = true;
  confirmUpload.textContent = "Uploading...";

  const formData = new FormData();
  formData.append("folderId", currentFolderId);
  pendingFiles.forEach(({ file, path }) => {
    formData.append("uploaded_file", file, file.name);
    formData.append("relativePaths", path);
  });

  try {
    const response = await fetch("/folders/upload", {
      method: "POST",
      body: formData,
      headers: { "X-Requested-With": "fetch" },
    });

    if (!response.ok) throw new Error(await response.text());
    window.location.reload();
  } catch (error) {
    alert(`Upload failed: ${error.message}`);
    confirmUpload.disabled = false;
    confirmUpload.textContent = "Upload";
  }
});

document.querySelectorAll(".item-node").forEach((item) => {
  item.addEventListener("contextmenu", (event) => openContextMenu(event, item));
  item.querySelector(".menu-btn")?.addEventListener("click", (event) => openContextMenu(event, item));
});

document.querySelectorAll(".folder-card").forEach((folder) => {
  folder.addEventListener("click", (event) => {
    if (!event.target.closest("a, button")) folder.querySelector("a").click();
  });
});

document.addEventListener("click", closeContextMenu);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeContextMenu();
});

document.getElementById("menu-rename").addEventListener("click", () => submitItemAction("rename"));
document.getElementById("menu-delete").addEventListener("click", () => submitItemAction("delete"));
document.getElementById("menu-download").addEventListener("click", () => submitItemAction("download"));