"use strict";
const btn = document.getElementById("dropdownBtn");
const menu = document.getElementById("dropdownMenu");
const selectedDay = document.getElementById("selectedDay");
const arrow = document.getElementById("arrow");

btn.addEventListener("click", () => {
  menu.classList.toggle("hidden");
  arrow.classList.toggle("rotate-180");
});

menu.querySelectorAll("li").forEach((item) => {
  item.addEventListener("click", () => {
    selectedDay.textContent = item.textContent;
    menu.classList.add("hidden");
    arrow.classList.remove("rotate-180");
  });
});

// close when clicking outside
document.addEventListener("click", (e) => {
  if (!btn.contains(e.target) && !menu.contains(e.target)) {
    menu.classList.add("hidden");
    arrow.classList.remove("rotate-180");
  }
});
