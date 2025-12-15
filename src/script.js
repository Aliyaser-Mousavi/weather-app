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

///////////////////////////////
document.addEventListener("DOMContentLoaded", () => {
  const unitsButton = document.getElementById("units-button");
  const unitsMenu = document.getElementById("units-dropdown-menu");
  const unitsContainer = document.getElementById("units-menu-container");
  unitsButton.addEventListener("click", () => {
    const isExpanded = unitsButton.getAttribute("aria-expanded") === "true";

    if (isExpanded) {
      unitsMenu.classList.add("hidden");
      unitsButton.setAttribute("aria-expanded", "false");
    } else {
      unitsMenu.classList.remove("hidden");
      unitsButton.setAttribute("aria-expanded", "true");
    }
  });

  document.addEventListener("click", (event) => {
    if (!unitsContainer.contains(event.target)) {
      if (unitsButton.getAttribute("aria-expanded") === "true") {
        unitsMenu.classList.add("hidden");
        unitsButton.setAttribute("aria-expanded", "false");
      }
    }
  });
  const unitOptions = unitsMenu.querySelectorAll(".cursor-pointer");
  const selectedClass = "bg-[#302F49]";
  const selectedTextColor = "text-white";
  const defaultTextColor = "text-white/75";

  unitOptions.forEach((option) => {
    option.addEventListener("click", (e) => {
      const currentTarget = e.currentTarget;
      const parentGroup = currentTarget.closest('div[class*="space-y"]');

      if (parentGroup) {
        parentGroup.querySelectorAll(".cursor-pointer").forEach((sibling) => {
          sibling.querySelector("svg")?.remove();
          sibling.classList.remove(selectedClass);
          sibling.classList.remove(selectedTextColor);
          sibling.classList.add(defaultTextColor);
        });
        currentTarget.classList.add(selectedClass);
        currentTarget.classList.remove(defaultTextColor);
        currentTarget.classList.add(selectedTextColor);
        if (currentTarget.querySelector("svg") === null) {
          const checkmark = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
          );
          checkmark.setAttribute("class", "w-5 h-5 text-white");
          checkmark.setAttribute("fill", "none");
          checkmark.setAttribute("stroke", "currentColor");
          checkmark.setAttribute("viewBox", "0 0 24 24");
          checkmark.innerHTML =
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>';

          currentTarget.appendChild(checkmark);
        }
      }
    });
  });
});
/////////////////////////////////
