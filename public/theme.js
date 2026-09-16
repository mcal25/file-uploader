const root = document.documentElement;
const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {
  root.dataset.theme = "dark";
}

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".theme-toggle");
  if (!toggle) return;

  const updateToggle = () => {
    const isDark = root.dataset.theme === "dark";
    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    toggle.title = isDark ? "Switch to light mode" : "Switch to dark mode";
  };

  toggle.addEventListener("click", () => {
    const isDark = root.dataset.theme === "dark";
    root.dataset.theme = isDark ? "light" : "dark";
    localStorage.setItem("theme", root.dataset.theme);
    updateToggle();
  });

  updateToggle();
});