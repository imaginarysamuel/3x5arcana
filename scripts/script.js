// 📌 script.js
// Global utilities only — card expansion is handled by list_script.js

// 📌 Print embedded character sheet PDF
function printPDF() {
  const iframe = document.getElementById("character-sheet-pdf");
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.print();
  } else {
    alert("Error: PDF not found.");
  }
}

// 📌 Load the License card wherever <div id="license-container"></div> exists
function loadLicenseCard() {
  const container = document.getElementById("license-container");
  if (!container) return;

  fetch("/license_card.html")
    .then(response => response.text())
    .then(html => {
      container.innerHTML = html;
      // Re-init static cards to bind the newly injected license cards
      if (typeof window.initStaticCards === 'function') {
        window.initStaticCards();
      }
    })
    .catch(err => console.error("Error loading license card:", err));
}

// 📌 Auto-load license card on page load
document.addEventListener("DOMContentLoaded", loadLicenseCard);
