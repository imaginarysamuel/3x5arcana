// 📌 monsters_rendering.js
// 🎨 Pure rendering functions - no data fetching, no DOM manipulation

// ===============================
// 🛠️ Shared Helpers
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

// Format OSE saving throws (bold letters, plain numbers)
function formatSavingThrows(savesString) {
  return savesString
    .replace(/(D)(\d+)/g, '<strong>$1</strong>$2')
    .replace(/(W)(\d+)/g, '<strong>$1</strong>$2')
    .replace(/(P)(\d+)/g, '<strong>$1</strong>$2')
    .replace(/(B)(\d+)/g, '<strong>$1</strong>$2')
    .replace(/(S)(\d+)/g, '<strong>$1</strong>$2');
}

// ===============================
// 👹 Shadowdark Monster Renderer
// ===============================

function renderShadowdarkMonster(monster, monsterId, useAlt = false) {
  // 🧸 Load custom HTML card
  if (monster["Type"] === "custom-html") {
    setTimeout(() => {
      const path = useAlt ? monster["Alt HTML Path"] : monster["HTML Path"];
      fetch(path)
        .then(res => res.text())
        .then(html => {
          const target = document.getElementById(`${monsterId}-body`);
          if (target) target.innerHTML = html;
        });
    }, 0);
    return `
      <div class="card-header">
        <div class="card-favorite-title">
          <div class="favorite-icon" id="${monsterId}-favorite-icon">●</div>
          <div class="card-title">${monster["Name"]}</div>
        </div>
      </div>
      <div class="card-body" id="${monsterId}-body">
        <div class="loading">Loading...</div>
      </div>
    `;
  }

  const abilities = [];
  for (let i = 1; i <= 9; i++) {
    if (monster[`Ability ${i}`]) {
      abilities.push(`<p>${formatAbility(monster[`Ability ${i}`])}</p>`);
    }
  }
  const abilitiesHTML = abilities.length
    ? abilities.join("")
    : "<p>No special abilities.</p>";

  // Build stat pairs with &nbsp; to prevent orphan line breaks
  function statPair(label, value) {
    if (value === undefined || value === "") return null;
    return `<strong>${label}</strong>&nbsp;${value}`;
  }

  const combatLine = [
    statPair("AC", monster["AC"]),
    statPair("HP", monster["HP"]),
    statPair("ATK", monster["ATK"]),
    statPair("MV", monster["MV"]),
  ].filter(Boolean).join(", ");

  const statsLine = [
    statPair("S", monster["S"]),
    statPair("D", monster["D"]),
    statPair("C", monster["C"]),
    statPair("I", monster["I"]),
    statPair("W", monster["W"]),
    statPair("Ch", monster["Ch"]),
  ].filter(Boolean).join(", ");

  const identityLine = [
    statPair("AL", monster["AL"]),
    statPair("LV", monster["Level"]),
  ].filter(Boolean).join(", ");

  return `
    ${getCardActionButtonsHTML()}
    <div class="card-header">
      <div class="card-favorite-title">
        <div class="favorite-icon" id="${monsterId}-favorite-icon">●</div>
        <div class="card-title">${monster["Name"]}</div>
      </div>
      <div class="monster-level">
        ${monster["Level"] || "?"}
      </div>
    </div>
    <div class="card-body" id="${monsterId}-body">
      <p class="flavor-text">
        ${monster["Flavor Text"] || "No description available."}
      </p>
      <div class="divider"></div>
      <p class="statline">
        ${[combatLine, statsLine, identityLine].filter(Boolean).join("<br>")}
      </p>
      <div class="divider"></div>
      <div class="abilities">
        ${abilitiesHTML}
      </div>
    </div>
  `;
}

// ===============================
// ⚔️ OSE Flat Monster Renderer
// ===============================

function renderOSEFlatMonster(monster, monsterId) {
  const abilities = ["Ability 1","Ability 2","Ability 3","Ability 4","Ability 5","Ability 6"]
    .map(k => monster[k]?.trim()).filter(Boolean)
    .map(a => `<p>${formatAbility(a)}</p>`).join("");

  const hdVal = (monster["Hit Dice"] || "").match(/^(½|\d+)/)?.[1] || "?";

  return `
    ${getCardActionButtonsHTML()}
    <div class="card-header">
      <div class="card-favorite-title">
        <div class="favorite-icon" id="${monsterId}-favorite-icon">◆</div>
        <div class="card-title">${monster.Name || "Unknown Monster"}</div>
      </div>
      <div class="monster-level">${hdVal}</div>
    </div>
    <div class="card-body" id="${monsterId}-body">
      <p class="flavor-text">${monster.Description || ""}</p>
      <div class="divider"></div>
      <div class="ose-stats"><p>
        <strong>AC</strong>&nbsp;${monster.AC || "-"},
        <strong>HD</strong>&nbsp;${monster["Hit Dice"] || "-"},<br>
        <strong>ATK</strong>&nbsp;${monster.Attacks || "-"},
        <strong>THAC0</strong>&nbsp;${monster.THAC0 || "-"},<br>
        <strong>MV</strong>&nbsp;${monster.Movement || "-"},<br>
        ${formatSavingThrows(monster["Saving Throws"] || "-")},<br>
        <strong>Morale</strong>&nbsp;${monster.Morale || "-"},
        <strong>AL</strong>&nbsp;${monster.Alignment || "-"},
        <strong>XP</strong>&nbsp;${monster.XP || "-"},<br>
        <strong>#</strong>&nbsp;${monster["Number Appearing"] || "-"},
        <strong>TT</strong>&nbsp;${monster["Treasure Type"] || "-"}
      </p></div>
      ${abilities ? `<div class="divider"></div><div class="abilities">${abilities}</div>` : ""}
    </div>
  `;
}

// ===============================
// 🔀 Main Entry Point
// ===============================

function getMonsterCardHTML(monster, monsterId, useAlt = false) {
  if (monster["Hit Dice"]) {
    return renderOSEFlatMonster(monster, monsterId);
  }
  return renderShadowdarkMonster(monster, monsterId, useAlt);
}

// 🌍 Export for use by other scripts
window.getMonsterCardHTML = getMonsterCardHTML;
