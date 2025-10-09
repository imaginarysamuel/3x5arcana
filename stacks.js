// ===============================
// 🃏 stacks.js - Smart Stack Renderer
// ===============================
// Detects and renders multiple card types: bookmarks, monsters, spells, items, generic
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
  // Support both single URL and array of URLs
  const urls = Array.isArray(STACK_DATA_URL) ? STACK_DATA_URL : [STACK_DATA_URL];
  
  // Fetch all URLs and combine the data
  Promise.all(urls.map(url => fetch(url).then(r => r.json())))
    .then(results => {
      // Flatten all results into single array
      data = results.flat();
      console.log(`✅ Fetched stack data from ${urls.length} source(s):`, data);
      if (typeof loadFavorites === "function") loadFavorites();
      if (typeof displayList === "function") displayList();
      if (typeof displayFavorites === "function") displayFavorites(true);
    })
    .catch(err => {
      console.error("❌ Error loading stack data:", err);
      if (typeof showError === "function") {
        showError("Failed to load data. Please refresh.");
      }
    });
}

// ===============================
// 🧠 Card Type Detection
// ===============================
function detectCardType(item) {
  // bookmark (highest priority)
  if (item.Name && item.Name.startsWith("★")) return "bookmark";
  
  // Monster (has combat stats: AC, HP, STR/S)
  if (item.AC || item.HP || item.STR || item.S) return "monster";
  
  // Spell (has Class, Tier, Duration, Range)
  if (item.Class || item.Tier || item.Duration || item.Range) return "spell";
  
  // Item (has Description, Bonus, Benefit, Curse, Personality, Reference)
  if (item.Bonus || item.Benefit || item.Curse || item.Personality || item.Reference) return "item";
  
  // Generic (numbered columns or fallback)
  return "generic";
}

// ===============================
// 🎨 Rendering Functions
// ===============================

// 🎯 Render Bookmark
function renderBookmark(item, cardId) {
  const displayName = item.Name.substring(1).trim(); // Strip ★
  return `
    <div class="card-header">
      <div class="card-favorite-title">
        <div class="card-title">${displayName || "Bookmark"}</div>
      </div>
    </div>
  `;
}

// 👹 Render Monster
function renderMonster(item, cardId, useAlt = false) {
  // Format abilities
  const abilities = [];
  for (let i = 1; i <= 9; i++) {
    if (item[`Ability ${i}`]) {
      abilities.push(`<p>${formatAbility(item[`Ability ${i}`])}</p>`);
    }
  }
  const abilitiesHTML = abilities.length > 0 ? abilities.join("") : "<p>No special abilities.</p>";

  return `
    <div class="card-header">
      <div class="card-favorite-title">
        <div class="favorite-icon" id="${cardId}-favorite-icon">●</div>
        <div class="card-title">${item.Name || "Unknown Monster"}</div>
      </div>
      <div class="monster-level">${item.Level || "?"}</div>
    </div>
    <div class="card-body" id="${cardId}-body">
      <p class="flavor-text">${item["Flavor Text"] || "No description available."}</p>
      <div class="divider"></div>
      <table class="stats-table">
        <tr><th>STR</th><th>DEX</th><th>CON</th><th>INT</th><th>WIS</th><th>CHA</th></tr>
        <tr>
          <td>${item.S || "-"}</td>
          <td>${item.D || "-"}</td>
          <td>${item.C || "-"}</td>
          <td>${item.I || "-"}</td>
          <td>${item.W || "-"}</td>
          <td>${item.Ch || "-"}</td>
        </tr>
      </table>
      <div class="divider"></div>
      <table class="traits-table">
        <tr><th>AC</th><th>HP</th><th>AL</th><th>MV</th></tr>
        <tr>
          <td>${item.AC || "-"}</td>
          <td>${item.HP || "-"}</td>
          <td>${item.AL || "-"}</td>
          <td>${item.MV || "-"}</td>
        </tr>
      </table>
      <div class="divider"></div>
      <div class="attacks">
        <p><strong>Attack:</strong> ${item.ATK || "None"}</p>
      </div>
      <div class="divider"></div>
      <div class="abilities">${abilitiesHTML}</div>
    </div>
  `;
}

// ✨ Render Spell
function renderSpell(item, cardId, useAlt = false) {
  return `
    <div class="card-header">
      <div class="card-favorite-title">
        <div class="favorite-icon" id="${cardId}-favorite-icon">●</div>
        <div class="card-title">${item.Name || "Unknown Spell"}</div>
      </div>
      <div class="spell-level">${item.Tier || "?"}</div>
    </div>
    <div class="card-body" id="${cardId}-body">
      <p class="spell-school">${item.Class || "Unknown Class"}</p>
      <div class="divider"></div>
      <table class="spell-details">
        <tr><th>Range</th><th>Duration</th></tr>
        <tr>
          <td>${item.Range || "-"}</td>
          <td>${item.Duration || "-"}</td>
        </tr>
      </table>
      <div class="divider"></div>
      <p class="spell-description">${item.Description || "No description available."}</p>
    </div>
  `;
}

// 🗡️ Render Magic Item
function renderItem(item, cardId, useAlt = false) {
  // Build sections based on what exists
  const sections = [];
  
  if (item.Description) {
    sections.push(`<p class="item-description">${item.Description}</p>`);
  }
  
  if (item.Bonus) {
    sections.push(`<p><strong>Bonus:</strong> ${item.Bonus}</p>`);
  }
  
  if (item.Benefit) {
    sections.push(`<p><strong>Benefit:</strong> ${item.Benefit}</p>`);
  }
  
  if (item.Curse) {
    sections.push(`<p><strong>Curse:</strong> ${item.Curse}</p>`);
  }
  
  if (item.Personality) {
    sections.push(`<p><strong>Personality:</strong> ${item.Personality}</p>`);
  }
  
  const content = sections.length > 0 ? sections.join('<div class="divider"></div>') : "<p>No description available.</p>";
  
  return `
    <div class="card-header">
      <div class="card-favorite-title">
        <div class="favorite-icon" id="${cardId}-favorite-icon">●</div>
        <div class="card-title">${item.Name || "Unknown Item"}</div>
      </div>
      ${item.Reference ? `<div class="item-reference">${item.Reference}</div>` : ""}
    </div>
    <div class="card-body" id="${cardId}-body">
      ${content}
    </div>
  `;
}

// 📝 Render Generic Card
function renderGeneric(item, cardId, useAlt = false) {
  const paragraphs = getContentChunks(item)
    .map(text => `<p>${parseMarkdown(text)}</p>`)
    .join("");
  
  return `
    <div class="card-header">
      <div class="card-favorite-title">
        <div class="favorite-icon" id="${cardId}-favorite-icon">●</div>
        <div class="card-title">${item.Name || "Untitled"}</div>
      </div>
    </div>
    <div class="card-body" id="${cardId}-body">
      ${paragraphs || "<p>No content available.</p>"}
    </div>
  `;
}

// ===============================
// 🛠️ Helper Functions
// ===============================

// Format monster abilities (bold first sentence)
function formatAbility(ability) {
  const match = ability.match(/^(.*?[.:])/);
  if (match) {
    const bolded = `<strong>${match[1]}</strong>`;
    return ability.replace(match[1], bolded);
  }
  return ability;
}

// Gather numbered columns ("1", "2", "3", etc.) as content text
function getContentChunks(row) {
  const chunks = Object.keys(row)
    .filter(k => /^\d+$/.test(k) && row[k] != null)
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    .map(k => String(row[k]).trim())
    .filter(s => s.length > 0);
  
  return chunks;
}

// Simple markdown parser (inline only: bold, italic, inline code)
function parseMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')  // **bold**
    .replace(/\*(.+?)\*/g, '<em>$1</em>')              // *italic*
    .replace(/__(.+?)__/g, '<strong>$1</strong>')      // __bold__
    .replace(/_(.+?)_/g, '<em>$1</em>')                // _italic_
    .replace(/`(.+?)`/g, '<code>$1</code>');           // `code`
}

// ===============================
// 🔧 Main Rendering Function
// ===============================
function getCardInnerHTML(item, cardId, useAlt = false) {
  const type = detectCardType(item);
  
  switch(type) {
    case "bookmark":
      return renderBookmark(item, cardId);
    case "monster":
      return renderMonster(item, cardId, useAlt);
    case "spell":
      return renderSpell(item, cardId, useAlt);
    case "item":
      return renderItem(item, cardId, useAlt);
    default:
      return renderGeneric(item, cardId, useAlt);
  }
}

// ===============================
// 📊 Data Filtering/Sorting
// ===============================

// Stacks preserve spreadsheet order (no sorting)
function getSortedData() {
  return data.slice();
}

// Filter - searches Name and content across all card types
function getFilteredData(sortedData) {
  const q = (typeof currentSearchQuery === "string" ? currentSearchQuery : "").toLowerCase();
  if (!q) return sortedData;
  
  return sortedData.filter(item => {
    // Search in Name
    const nameHit = (item.Name || "").toLowerCase().includes(q);
    
    // Search in generic content (numbered columns)
    const contentHit = getContentChunks(item).some(txt => txt.toLowerCase().includes(q));
    
    // Search in type-specific fields
    const monsterHit = (item["Flavor Text"] || "").toLowerCase().includes(q);
    const spellHit = (item.Description || "").toLowerCase().includes(q) || 
                     (item.Class || "").toLowerCase().includes(q);
    const itemHit = (item.Description || "").toLowerCase().includes(q) ||
                    (item.Benefit || "").toLowerCase().includes(q) ||
                    (item.Bonus || "").toLowerCase().includes(q);
    
    return nameHit || contentHit || monsterHit || spellHit || itemHit;
  });
}

// ===============================
// 🌍 Export for list_script.js
// ===============================
window.getSortedData = getSortedData;
window.getFilteredData = getFilteredData;
window.getCardInnerHTML = getCardInnerHTML;

// Optional dev helper
window.__stackData = () => data; // call in console to inspect
