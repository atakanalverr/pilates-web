document.getElementById("year").textContent = new Date().getFullYear();

// Mobile nav toggle
const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");

navToggle.addEventListener("click", () => {
  nav.classList.toggle("nav-open");
});

// Üyeler dropdown (Güray / Nuray)
const uyelerDropdown = document.getElementById("uyelerDropdown");
const uyelerTrigger = document.getElementById("uyelerTrigger");

if (uyelerDropdown && uyelerTrigger) {
  uyelerTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    uyelerDropdown.classList.toggle("is-open");
  });

  document.addEventListener("click", (e) => {
    if (!uyelerDropdown.contains(e.target)) {
      uyelerDropdown.classList.remove("is-open");
    }
  });
}
