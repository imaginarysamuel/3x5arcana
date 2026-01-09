// 📌 burgermenu_script.js
// Burger Menu Functionality with centralized menu creation

// Create and inject menu HTML
function createMenu() {
  const menuHTML = `
    <div class="burger-menu">
      <div class="burger-icon" id="burger-icon">☰</div>
      <div class="menu-overlay" id="menu-overlay">
        <div class="menu-card">
          <div class="menu-card-header">
            <div class="menu-close-icon" id="menu-close-icon">✖︎</div>
          </div>
          <div class="menu-content">
            <a href="spells.html" target="_blank">SD Spells</a>
            <a href="monsters.html" target="_blank">SD Monsters</a>
            <a href="magic-items.html" target="_blank">SD Magic Items</a>
            <a href="stacks.html" target="_blank">SD Module Stat Blocks</a>
            <a href="ose-monsters.html" target="_blank">OSE Monsters</a>
            <a href="game.html" target="_blank">3x5 💔</a>
            <a href="index.html" target="_blank">Home</a>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const container = document.getElementById('menu-container');
  if (container) {
    container.innerHTML = menuHTML;
  }
}

// Initialize after menu is created
document.addEventListener("DOMContentLoaded", () => {
  createMenu();
  
  // YOUR ORIGINAL CODE - runs after menu is injected
  const burgerIcon = document.getElementById("burger-icon");
  const menuOverlay = document.getElementById("menu-overlay");
  const menuCloseIcon = document.getElementById("menu-close-icon");
  const menuCard = document.querySelector(".menu-card");
  
  function openMenu() {
    menuOverlay.classList.add("open");
    menuCard.classList.remove("closing");
  }
  
  function closeMenu() {
    menuCard.classList.add("closing");
    menuCard.addEventListener("animationend", () => {
      menuOverlay.classList.remove("open");
    }, { once: true });
  }
  
  burgerIcon.addEventListener("click", openMenu);
  menuCloseIcon.addEventListener("click", closeMenu);
  menuOverlay.addEventListener("click", (e) => {
    if (!menuCard.contains(e.target)) {
      closeMenu();
    }
  });
});
