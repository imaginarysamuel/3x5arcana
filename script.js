document.addEventListener("DOMContentLoaded", function () {
  // Global filtering variables
  var currentSearchQuery = "";
  var currentMinLevel = 1;
  var currentMaxLevel = 10;

  // Update the displayed monster cards based on search text and level range
  function updateFilters() {
    var monsterCards = document.querySelectorAll(".monster-card-container");
    monsterCards.forEach(function (card) {
      // Always show cards without a data-level attribute (e.g., About/License cards)
      if (!card.hasAttribute("data-level")) {
        card.style.display = "block";
        return;
      }
      var name = card.querySelector(".monster-header").textContent.toLowerCase();
      var levelText = card.getAttribute("data-level");
      var levelNumber = parseFloat(levelText);
      var matchesSearch = name.indexOf(currentSearchQuery) !== -1;
      var matchesLevel = isNaN(levelNumber)
        ? true
        : (levelNumber >= currentMinLevel && levelNumber <= currentMaxLevel);
      card.style.display = (matchesSearch && matchesLevel) ? "block" : "none";
    });
  }

  // Listen for search input changes
  document.getElementById("search-bar").addEventListener("input", function () {
    currentSearchQuery = this.value.toLowerCase();
    updateFilters();
  });

  // Fetch monster data from Google Sheets
  fetch("https://opensheet.elk.sh/1E9c3F3JPCDnxqLE0qVtW0K7PBsgHSd7s5oU8p8qeAAY/All")
    .then(function (response) {
      return response.json();
    })
    .then(function (monsters) {
      displayMonsterList(monsters);

      // Determine the numeric level range from the data
      var levels = monsters
        .map(function (monster) { return parseFloat(monster["Level"]); })
        .filter(function (num) { return !isNaN(num); });
      if (levels.length > 0) {
        var minFromData = Math.min.apply(null, levels);
        var maxFromData = Math.max.apply(null, levels);
        currentMinLevel = minFromData;
        currentMaxLevel = maxFromData;

        // Update the range input attributes for both sliders
        var rangeMinInput = document.getElementById("range-min");
        var rangeMaxInput = document.getElementById("range-max");
        rangeMinInput.min = minFromData;
        rangeMinInput.max = maxFromData;
        rangeMaxInput.min = minFromData;
        rangeMaxInput.max = maxFromData;
        rangeMinInput.value = minFromData;
        rangeMaxInput.value = maxFromData;
        updateRangeDisplay();
      }
      updateFilters();
    })
    .catch(function (error) {
      console.error("Error loading Google Sheets data:", error);
    });

  function displayMonsterList(data) {
    var listContainer = document.getElementById("monster-list");
    listContainer.innerHTML = ""; // Clear any previous content

    // Group monsters by level
    var groupedByLevel = {};
    data.forEach(function (monster) {
      var level = monster["Level"] || "Unknown";
      if (!groupedByLevel[level]) {
        groupedByLevel[level] = [];
      }
      groupedByLevel[level].push(monster);
    });

    // Sort levels numerically (with 'Unknown' last)
    var sortedLevels = Object.keys(groupedByLevel).sort(function (a, b) {
      return (isNaN(a) ? 999 : parseInt(a, 10)) - (isNaN(b) ? 999 : parseInt(b, 10));
    });

    sortedLevels.forEach(function (level) {
      // Sort monsters alphabetically within each level
      groupedByLevel[level].sort(function (a, b) {
        return a["Name"].localeCompare(b["Name"]);
      });
      groupedByLevel[level].forEach(function (monster, index) {
        var abilities = [
          monster["Ability 1"], monster["Ability 2"], monster["Ability 3"],
          monster["Ability 4"], monster["Ability 5"], monster["Ability 6"],
          monster["Ability 7"], monster["Ability 8"], monster["Ability 9"]
        ]
          .filter(function (ability) {
            return ability && ability.trim().length > 0;
          })
          .map(function (ability) {
            return "<p>" + ability + "</p>";
          })
          .join("");

        var item = document.createElement("div");
        item.classList.add("monster-card-container");
        // Store the monster's level for filtering
        item.setAttribute("data-level", monster["Level"]);
        item.innerHTML = "" +
          '<div class="monster-card" onclick="toggleCard(\'' + level + '-' + index + '\')">' +
            '<div class="card-header">' +
              '<div class="monster-header">' + monster["Name"] + '</div>' +
              '<div class="monster-level">' + monster["Level"] + '</div>' +
            '</div>' +
            '<div class="card-body" id="monster-body-' + level + '-' + index + '">' +
              '<div class="monster-description">' + monster["Flavor Text"] + '</div>' +
              '<div class="monster-content">' +
                '<div class="monster-left">' +
                  '<div class="monster-stats-container">' +
                    '<div class="monster-stats-labels">' +
                      '<div>STR</div>' +
                      '<div>DEX</div>' +
                      '<div>CON</div>' +
                      '<div>INT</div>' +
                      '<div>WIS</div>' +
                      '<div>CHA</div>' +
                    '</div>' +
                    '<div class="monster-stats-values">' +
                      '<div>' + monster["S"] + '</div>' +
                      '<div>' + monster["D"] + '</div>' +
                      '<div>' + monster["C"] + '</div>' +
                      '<div>' + monster["I"] + '</div>' +
                      '<div>' + monster["W"] + '</div>' +
                      '<div>' + monster["Ch"] + '</div>' +
                    '</div>' +
                    '<div class="monster-traits-labels">' +
                      '<div>AL</div>' +
                      '<div>HP</div>' +
                      '<div>AC</div>' +
                      '<div>MV</div>' +
                    '</div>' +
                    '<div class="monster-traits-values">' +
                      '<div>' + monster["AL"] + '</div>' +
                      '<div>' + monster["HP"] + '</div>' +
                      '<div><b>' + monster["AC"] + '</b></div>' +
                      '<div><i>' + monster["MV"] + '</i></div>' +
                    '</div>' +
                  '</div>' +
                  '<p><b>Attack:</b> ' + monster["ATK"] + '</p>' +
                '</div>' +
                '<div class="monster-right">' + abilities + '</div>' +
              '</div>' +
            '</div>' +
          '</div>';
        listContainer.appendChild(item);
      });
    });

    // Create static About and License cards
    createAboutCard();
    createLicenseCard();
  }

  function createAboutCard() {
    var listContainer = document.getElementById("monster-list");
    var aboutCard = document.createElement("div");
    aboutCard.classList.add("monster-card-container");
    aboutCard.innerHTML = "" +
      '<div class="monster-card" onclick="toggleAboutCard()">' +
        '<div class="card-header">' +
          '<div class="monster-header">About</div>' +
        '</div>' +
        '<div class="card-body" id="about-card-body">' +
          '<div class="custom-text">' +
            'This is a codex of monsters for Shadowdark. For me, the humble 3x5 card captures the soul of flexible, 
