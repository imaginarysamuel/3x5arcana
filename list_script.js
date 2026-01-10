// 📌 script.js
// PDF printing function
function printPDF() {
    const iframe = document.getElementById("character-sheet-pdf");
    if (iframe) {
        iframe.contentWindow.print();
    } else {
        alert("Error: PDF not found.");
    }
}

// 📌 Function to add the License card wherever you drop <div id="license-container"></div>
function loadLicenseCard() {
  const container = document.getElementById('license-container');
  if (!container) return;
  
  fetch('/license_card.html')
    .then(response => response.text())
    .then(html => {
      container.innerHTML = html;
    })
    .catch(error => console.error('Error loading license card:', error));
}

// Auto-load license card on page load
document.addEventListener("DOMContentLoaded", loadLicenseCard);
