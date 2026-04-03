// 📌 burgermenu_script.js
// Burger Menu Functionality with centralized menu from HTML file

// Fetch and inject menu HTML from separate file
function createMenu() {
  fetch('/main-menu.html')
    .then(response => response.text())
    .then(html => {
      const container = document.getElementById('menu-container');
      if (container) {
        container.innerHTML = html;
        initBurgerMenu();
      }
    })
    .catch(error => console.error('Error loading menu:', error));
}

// Initialize burger menu event listeners
function initBurgerMenu() {
  const burgerIcon = document.getElementById("burger-icon");
  const menuOverlay = document.getElementById("menu-overlay");
  const menuCloseIcon = document.getElementById("menu-close-icon");
  const menuCard = document.querySelector(".menu-card");

  if (!burgerIcon || !menuOverlay || !menuCloseIcon || !menuCard) return;

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
}

// Auto-load menu when DOM is ready
document.addEventListener("DOMContentLoaded", createMenu);
