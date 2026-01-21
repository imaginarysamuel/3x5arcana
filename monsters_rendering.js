// 📌 monsters_rendering.js
// 🎨 Pure rendering functions - no data fetching, no DOM manipulation

// Format monster abilities (bold first sentence)
function formatAbility(ability) {
  const match = ability.match(/^(.*?[.:])/);
  if (match) {
    const bolded = `<strong>${match[1]}</strong>`;
    return ability.replace(match[1], bolded);
  }
  return ability;
}

// Generate monster card HTML
function getMonsterCardHTML(monster, monsterId, useAlt = false) {
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

  const statLine = [
    ["AC", monster["AC"]],
    ["HP", monster["HP"]],
    ["ATK", monster["ATK"]],
    ["MV", monster["MV"]],
    ["S", monster["S"]],
    ["D", monster["D"]],
    ["C", monster["C"]],
    ["I", monster["I"]],
    ["W", monster["W"]],
    ["Ch", monster["Ch"]],
    ["AL", monster["AL"]],
    ["LV", monster["Level"]],
  ]
    .filter(item =>
      item === "<br>" ||
      (Array.isArray(item) && item[1] !== undefined && item[1] !== "")
    )
    .map(item =>
      item === "<br>"
        ? "<br>"
        : `<strong>${item[0]}</strong> ${item[1]}`
    )
    .join(", ");

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
        ${statLine}
      </p>

      <div class="divider"></div>

      <div class="abilities">
        ${abilitiesHTML}
      </div>
    </div>
  `;
}

// 🌍 Export for use by other scripts
window.getMonsterCardHTML = getMonsterCardHTML;
