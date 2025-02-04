document.addEventListener("DOMContentLoaded", function () {
  function toggleStaticCard(id) {
    const mainBody = document.getElementById(id);
    if (!mainBody) return;

    const card = mainBody.closest(".monster-card");
    const isExpanded = card.classList.contains("expanded");

    if (isExpanded) {
      mainBody.style.maxHeight = null;
      card.classList.remove("expanded");
    } else {
      mainBody.style.maxHeight = mainBody.scrollHeight + "px";
      card.classList.add("expanded");
    }
  }

  // Attach event listeners to static cards
  document.querySelectorAll(".static-card").forEach(card => {
    card.addEventListener("click", function () {
      const bodyId = this.getAttribute("data-body-id");
      toggleStaticCard(bodyId);
    });
  });
});
