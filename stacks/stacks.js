// ===============================
// 🃏 stacks.js - Generic Stack Renderer
// ===============================
// Works with any unsorted card stack (rules, adventure modules, etc.)
// Expects STACK_DATA_URL to be defined in HTML before this script loads

let data = [];

// Show loading state
if (typeof showLoading === "function") showLoading("Loading...");

// Validate that STACK_DATA_URL is defined
if (typeof STACK_DATA_URL === "undefined") {
  console.error("❌ STACK_DATA_URL not defined. Please define it before loading stacks.js");
  if (typeof showError === "function") {
    showError("Configuration error. Please check the page setup.");
  }
} else {
  // Fetch the data
  fetch(STACK_DATA_URL)
    .then(r => r.json())
    .then(d => {
      console.log("✅ Fetched stack data:", d);
      data = d;
      if (typeof loadFavorites === "function") loadFavorites();
      if (typeof displayList === "function") displayList();
      if (typeof displayFavorites === "function") displayFavorites(true);
      if (typeof showDone === "function") showDone();
    })
    .catch(err => {
      console.error("❌ Error loading stack data:", err);
      if (typeof showError === "function") {
        showError("Failed to load data. Please refresh.");
      }
    });
}

// ===============================
// Helpers for list rendering
// ===============================

// 🧠 Gather numbered columns ("1", "2", "3", etc.) as content text
function getContentChunks(row) {
  const chunks = Object.keys(row)
    .filter(k => /^\d+$/.test(k) && row[k] != null)
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    .map(k => String(row[k]).trim())
    .filter(s => s.length > 0);
  
  return chunks;
}

// Sort data - stacks preserve spreadsheet order (no sorting)
function getSortedData() {
  return data.slice();
}

// Filter - searches Name and any numbered column
function getFilteredData(sortedData) {
  const q = (typeof currentSearchQuery === "string" ? currentSearchQuery : "").toLowerCase();
  if (!q) return sortedData;
  
  return sortedData.filter(item => {
    const nameHit = (item.Name || "").toLowerCase().includes(q);
    const contentHit = getContentChunks(item).some(txt => txt.toLowerCase().includes(q));
    return nameHit || contentHit;
  });
}

// 🎨 Simple markdown parser (inline only: bold, italic, inline code)
function parseMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')  // **bold**
    .replace(/\*(.+?)\*/g, '<em>$1</em>')              // *italic*
    .replace(/__(.+?)__/g, '<strong>$1</strong>')      // __bold__
    .replace(/_(.+?)_/g, '<em>$1</em>')                // _italic_
    .replace(/`(.+?)`/g, '<code>$1</code>');           // `code`
}

// 🧱 Build the card HTML
function getCardInnerHTML(item, cardId, useAlt = false) {
  const isDivider = item.Name && item.Name.startsWith("★");
  const displayName = isDivider ? item.Name.substring(1).trim() : item.Name;
  
  // Dividers: no favorite icon, no body
  if (isDivider) {
    return `
      <div class="card-header">
        <div class="card-favorite-title">
          <div class="card-title">${displayName || "Divider"}</div>
        </div>
      </div>
    `;
  }
  
  // Regular cards: full rendering
  const paragraphs = getContentChunks(item)
    .map(text => `<p>${parseMarkdown(text)}</p>`)
    .join("");
  
  return `
    <div class="card-header">
      <div class="card-favorite-title">
        <div class="favorite-icon" id="${cardId}-favorite-icon">●</div>
        <div class="card-title">${displayName || "Untitled"}</div>
      </div>
    </div>
    <div class="card-body" id="${cardId}-body">
      ${paragraphs || "<p>No content available.</p>"}
    </div>
  `;
}

// Expose for list_script.js
window.getSortedData = getSortedData;
window.getFilteredData = getFilteredData;
window.getCardInnerHTML = getCardInnerHTML;

// Optional dev helper
window.__stackData = () => data; // call in console to inspect
