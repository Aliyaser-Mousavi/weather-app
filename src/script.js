"use strict";
const btn = document.getElementById("dropdownBtn");
const menu = document.getElementById("dropdownMenu");
const selectedDay = document.getElementById("selectedDay");
const arrow = document.getElementById("arrow");
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const currentCityEl = document.getElementById("current-city");
const currentDateEl = document.getElementById("current-date");
const currentTempEl = document.getElementById("current-temperature");
const currentIconEl = document.getElementById("current-weather-icon");
const feelsLikeEl = document.getElementById("feels-like");
const humidityEl = document.getElementById("humidity");
const windSpeedEl = document.getElementById("wind-speed");
const precipitationEl = document.getElementById("precipitation");
const dailyContainer = document.getElementById("daily-forecast-container");
const hourlyContainer = document.getElementById("hourly-forecast-container");
const errorContainer = document.getElementById("error-state-container");
const retryButton = document.getElementById("error-retry-btn");
const noResultsMessage = document.getElementById("no-results-message");
const mainContentContainer = document.getElementById("main-weather-content");
const searchStatusBox = document.getElementById("search-status-box");
const loadingSvg = document.getElementById("loading-svg");
const suggestionsList = document.getElementById("suggestions-list");
//////////////////////////////
let lastWeatherData = null;
let lastLocation = null;
let lastCityName = "";
let focusedIndex = -1;
let currentSuggestions = [];
/////////////////////
function isDayByTime(timeStr, sunrise, sunset) {
  const time = new Date(timeStr).getTime();
  return time >= sunrise && time < sunset;
}
////////////////////////////
///////////////////////////
function setCurrentDayName() {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const today = new Date();
  const dayName = days[today.getDay()];
  const selectedDayEl = document.getElementById("selectedDay");
  if (selectedDayEl) {
    selectedDayEl.textContent = dayName;
  }
}
//////////////////////////////
btn.addEventListener("click", (e) => {
  e.stopPropagation();
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
document.addEventListener("click", (e) => {
  if (!btn.contains(e.target) && !menu.contains(e.target)) {
    menu.classList.add("hidden");
    arrow.classList.remove("rotate-180");
  }
});
///////////////////////////////
function updateDayDropdown(data) {
  menu.innerHTML = "";
  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  selectedDay.textContent = todayName;
  data.daily.time.forEach((dayStr, index) => {
    const dateObj = new Date(dayStr);
    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
    const isToday = dayName === todayName;
    const li = document.createElement("li");
    li.className =
      "px-4 py-2 hover:bg-[#302F49] cursor-pointer text-white text-sm border-b border-white/5 last:border-0";
    li.textContent = isToday ? `${dayName} (Today)` : dayName;
    li.addEventListener("click", () => {
      selectedDay.textContent = dayName;
      menu.classList.add("hidden");
      arrow.classList.remove("rotate-180");
      renderHourlyForecast(data, index);
    });
    menu.appendChild(li);
    if (isToday) {
      renderHourlyForecast(data, index);
    }
  });
}
/////////////////////////////////
/////////////////////////////
////////////////////////////////////
function isDayByHour(hourISO, sunriseISO, sunsetISO) {
  const hourTime = new Date(hourISO).getTime();
  const sunrise = new Date(sunriseISO).getTime();
  const sunset = new Date(sunsetISO).getTime();
  return hourTime >= sunrise && hourTime < sunset;
}
function getWeatherIcon({ weathercode, isDay, precipitation }) {
  const code = Number(weathercode);
  const prec = Number(precipitation || 0);
  if (code === 0) {
    return isDay
      ? "./images/icon-sunny.webp"
      : "./images/icon-clear-night.webp";
  }
  if (code === 1 || code === 2) {
    return isDay
      ? "./images/icon-partly-cloudy.webp"
      : "./images/icon-partly-cloudy-night.webp";
  }
  if (code === 3) return "./images/icon-overcast.webp";
  if (code === 45 || code === 48) return "./images/icon-fog.webp";
  if ([51, 53, 55, 56, 57].includes(code)) return "./images/icon-drizzle.webp";
  if ([61, 63, 65, 80, 81, 82].includes(code)) {
    if (prec >= 5 || [65, 82].includes(code))
      return "./images/icon-heavy-rain.webp";
    return "./images/icon-rain.webp";
  }
  if (code === 66 || code === 67) return "./images/icon-snow.webp";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "./images/icon-snow.webp";
  if ([95, 96, 99].includes(code)) return "./images/icon-thunderstorm.webp";
  return "./images/icon-overcast.webp";
}
async function getCityCoords(city) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      city,
    )}&count=1&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Server error");
    const data = await res.json();
    if (!data.results || data.results.length === 0) return null;
    const place = data.results[0];
    return {
      name: place.name,
      country: place.country,
      lat: place.latitude,
      lon: place.longitude,
    };
  } catch (error) {
    console.error("Geocoding Error:", error);
    throw new Error("Network issues or Proxy blocked.");
  }
}
function getMondayOfCurrentWeek() {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - (day === 0 ? 6 : day - 1);
  const monday = new Date(today.setDate(diff));
  return monday.toISOString().split("T")[0];
}
function getSundayOfCurrentWeek() {
  const monday = new Date(getMondayOfCurrentWeek());
  const sunday = new Date(monday.setDate(monday.getDate() + 6));
  return sunday.toISOString().split("T")[0];
}
async function getWeather(lat, lon) {
  try {
    const startDate = getMondayOfCurrentWeek();
    const endDate = getSundayOfCurrentWeek();
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weathercode&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&timezone=auto&start_date=${startDate}&end_date=${endDate}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather service unreachable");
    return await res.json();
  } catch (error) {
    console.error("Weather Fetch Error:", error);
    throw error;
  }
}
function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function updateCurrentWeather(city, country, data) {
  currentCityEl.textContent = `${city}, ${country}`;
  currentDateEl.textContent = formatDate(new Date());

  currentTempEl.textContent =
    convertTemperature(data.current_weather.temperature) +
    "°" +
    units.temperature;

  windSpeedEl.textContent =
    convertWindSpeed(data.current_weather.windspeed) +
    " " +
    (units.wind === "mph" ? "mph" : "km/h");

  const currentHourIndex = getCurrentHourIndex(data);

  const precipitationForIcon = Number(
    data.hourly?.precipitation?.[currentHourIndex] ?? 0,
  );

  const iconPath = getWeatherIcon({
    weathercode: data.current_weather.weathercode,
    isDay: data.current_weather.is_day,
    precipitation: precipitationForIcon,
  });

  currentIconEl.src = iconPath;
}
function updateDetails(data) {
  const currentHourIndex = getCurrentHourIndex(data);
  let feelsLike = null;
  let humidity = null;
  let precipitationToday = 0;
  if (currentHourIndex !== -1 && data?.hourly) {
    feelsLike = data.hourly.apparent_temperature?.[currentHourIndex];
    humidity = data.hourly.relative_humidity_2m?.[currentHourIndex];
  }
  if (data?.daily?.precipitation_sum?.length) {
    precipitationToday = Number(data.daily.precipitation_sum[0] ?? 0);
  }
  feelsLikeEl.textContent =
    typeof feelsLike === "number"
      ? convertTemperature(feelsLike) + "°" + units.temperature
      : "—";
  humidityEl.textContent = typeof humidity === "number" ? humidity + "%" : "—";
  precipitationEl.textContent =
    convertPrecipitation(precipitationToday) + " " + units.precipitation;
}
function getCurrentHourIndex(data) {
  if (!Array.isArray(data?.hourly?.time)) return -1;
  const baseTime = data.current_weather?.time
    ? new Date(data.current_weather.time)
    : new Date();
  const hourKey = baseTime.toISOString().slice(0, 13);
  let idx = data.hourly.time.findIndex((t) => t.startsWith(hourKey));
  if (idx !== -1) return idx;
  let best = 0,
    min = Infinity;
  data.hourly.time.forEach((t, i) => {
    const diff = Math.abs(new Date(t) - baseTime);
    if (diff < min) {
      min = diff;
      best = i;
    }
  });
  return best;
}
function renderDailyForecast(data) {
  dailyContainer.innerHTML = "";

  data.daily.time.forEach((day, i) => {
    const sunrise = new Date(data.daily.sunrise[i]).getTime();
    const sunset = new Date(data.daily.sunset[i]).getTime();
    const noon = new Date(day);
    noon.setHours(12, 0, 0, 0);
    const isDay = isDayByTime(noon, sunrise, sunset);
    const iconPath = getWeatherIcon({
      weathercode: data.daily.weathercode[i],
      isDay,
      precipitation: data.daily.precipitation_sum?.[i] ?? 0,
    });
    const card = `
      <div class="border border-[#343155] bg-[#25253F] rounded-xl py-4">
        <p class="text-white text-center font-medium">
          ${new Date(day).toLocaleDateString("en-US", { weekday: "short" })}
        </p>

        <img src="${iconPath}" class="w-20 mx-auto" alt="weather icon" />

        <div class="flex items-center justify-between px-3">
          <p class="text-white">
            ${convertTemperature(data.daily.temperature_2m_max[i])}°${
              units.temperature
            }
          </p>
          <p class="text-gray-400">
            ${convertTemperature(data.daily.temperature_2m_min[i])}°${
              units.temperature
            }
          </p>
        </div>
      </div>
    `;

    dailyContainer.insertAdjacentHTML("beforeend", card);
  });
}
function renderHourlyForecast(data, dayIndex = 0) {
  hourlyContainer.innerHTML = "";
  const startIndex = dayIndex * 24;
  const endIndex = startIndex + 24;
  const hourlySlice = data.hourly.time.slice(startIndex, endIndex);

  hourlySlice.forEach((time, i) => {
    const actualIndex = startIndex + i;
    const date = new Date(time);
    const hourStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: true,
    });

    const sunrise = new Date(data.daily.sunrise[dayIndex]).getTime();
    const sunset = new Date(data.daily.sunset[dayIndex]).getTime();
    const isDay = date.getTime() >= sunrise && date.getTime() < sunset;

    const weatherCode = data.hourly.weathercode?.[actualIndex] ?? 0;
    const precipitation = Number(data.hourly.precipitation?.[actualIndex] ?? 0);
    const iconPath = getWeatherIcon({
      weathercode: weatherCode,
      isDay,
      precipitation,
    });
    const item = `
      <div class="bg-[#302F49] flex items-center justify-between border border-[#433f6e] rounded-md p-2 sm:p-2.5">
        <div class="flex items-center gap-2">
          <img src="${iconPath}" class="w-6 sm:w-8 h-auto object-contain" alt="weather icon"/>
          <span class="text-white text-sm sm:text-base">${hourStr}</span>
        </div>
        <div>
          <span class="text-white text-sm sm:text-base">
            ${convertTemperature(data.hourly.temperature_2m[actualIndex])}°${
              units.temperature
            }
          </span>
        </div>
      </div>
    `;
    hourlyContainer.insertAdjacentHTML("beforeend", item);
  });
}
////////////////////////////////
////////////////////////////////
function showContent() {
  errorContainer.classList.add("hidden");
}
async function handleSearch(city) {
  suggestionsList.classList.add("hidden");
  if (!city.trim()) return;
  lastCityName = city;
  const cityToSearch = city.trim();
  if (!cityToSearch) return;
  searchStatusBox.classList.remove("hidden");
  searchBtn.disabled = true;
  cityInput.disabled = true;
  clearMessages();
  try {
    const location = await getCityCoords(cityToSearch);
    if (!location) {
      showNoResults();
      searchStatusBox.classList.add("hidden");
      return;
    }
    const weather = await getWeather(location.lat, location.lon);
    lastWeatherData = weather;
    lastLocation = location;
    mainContentContainer.classList.remove("hidden");
    updateCurrentWeather(location.name, location.country, weather);
    updateDetails(weather);
    renderDailyForecast(weather);
    updateDayDropdown(weather);
    cityInput.value = "";
  } catch (error) {
    console.error("API Fetch Error:", error);
    showErrorState();
  } finally {
    searchStatusBox.classList.add("hidden");
    searchBtn.disabled = false;
    cityInput.disabled = false;
  }
}
cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    handleSearch(cityInput.value);
  }
});
searchBtn.addEventListener("click", () => {
  handleSearch(cityInput.value);
});
retryButton.addEventListener("click", (e) => {
  e.preventDefault();
  if (loadingSvg.classList.contains("animate-spin")) return;
  loadingSvg.classList.add("animate-spin");
  setTimeout(() => {
    loadingSvg.classList.remove("animate-spin");
  }, 1000);
  handleSearch(lastCityName);
});
function clearMessages() {
  errorContainer.classList.add("hidden");
  noResultsMessage.classList.add("hidden");
  mainContentContainer.classList.remove("hidden");
}
function showNoResults() {
  clearMessages();
  noResultsMessage.classList.remove("hidden");
  mainContentContainer.classList.add("hidden");
}
function showErrorState() {
  clearMessages();
  mainContentContainer.classList.add("hidden");
  errorContainer.classList.remove("hidden");
}
/////////////////////////////////////////
const units = {
  temperature: "C",
  wind: "kmh",
  precipitation: "mm",
};
const savedUnits = localStorage.getItem("weatherUnits");
if (savedUnits) {
  Object.assign(units, JSON.parse(savedUnits));
}
function convertTemperature(celsius) {
  if (units.temperature === "F") {
    return Math.round((celsius * 9) / 5 + 32);
  }
  return Math.round(celsius);
}
function convertWindSpeed(kmh) {
  if (units.wind === "mph") {
    return Math.round(kmh / 1.609);
  }
  return Math.round(kmh);
}
function convertPrecipitation(mm) {
  const val = Number(mm ?? 0);
  if (units.precipitation === "in") {
    return (val / 25.4).toFixed(2);
  }
  return val.toFixed(1);
}
function saveUnits() {
  localStorage.setItem("weatherUnits", JSON.stringify(units));
}
function rerenderWeather() {
  if (!lastWeatherData || !lastLocation) return;

  updateCurrentWeather(
    lastLocation.name,
    lastLocation.country,
    lastWeatherData,
  );
  updateDetails(lastWeatherData);
  renderDailyForecast(lastWeatherData);
  const todayStr = new Date().toISOString().split("T")[0];
  const todayIndex = lastWeatherData.daily.time.indexOf(todayStr);
  renderHourlyForecast(lastWeatherData, todayIndex !== -1 ? todayIndex : 0);
}
function getUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        try {
          const weather = await getWeather(lat, lon);
          lastWeatherData = weather;
          const cityRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
          );
          const cityData = await cityRes.json();
          const cityName =
            cityData.address.city ||
            cityData.address.town ||
            "Current Location";
          const countryName = cityData.address.country || "";
          lastLocation = { name: cityName, country: countryName, lat, lon };
          mainContentContainer.classList.remove("hidden");
          updateCurrentWeather(cityName, countryName, weather);
          updateDetails(weather);
          renderDailyForecast(weather);
          updateDayDropdown(weather);
        } catch (error) {
          console.error("Error fetching initial weather:", error);
          handleSearch("Berlin");
        }
      },
      (error) => {
        console.warn("Location access denied by user.", error);
        handleSearch("Berlin");
      },
    );
  } else {
    handleSearch("Berlin");
  }
}
document.addEventListener("DOMContentLoaded", () => {
  setCurrentDayName();
  getUserLocation();
  const unitsButton = document.getElementById("units-button");
  const unitsMenu = document.getElementById("units-dropdown-menu");
  const unitsContainer = document.getElementById("units-menu-container");
  function syncUnitsUI() {
    const unitOptions = unitsMenu.querySelectorAll(".cursor-pointer");
    const selectedClass = "bg-[#302F49]";
    const selectedTextColor = "text-white";
    const defaultTextColor = "text-white/75";
    unitOptions.forEach((option) => {
      const type = option.dataset.type;
      const value = option.dataset.value;
      option.classList.remove(selectedClass, selectedTextColor);
      option.classList.add(defaultTextColor);
      option.querySelector("svg")?.remove();
      if (units[type] === value) {
        option.classList.add(selectedClass, selectedTextColor);
        option.classList.remove(defaultTextColor);
        const checkmark = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg",
        );
        checkmark.setAttribute("class", "w-5 h-5 text-white");
        checkmark.setAttribute("fill", "none");
        checkmark.setAttribute("stroke", "currentColor");
        checkmark.setAttribute("viewBox", "0 0 24 24");
        checkmark.innerHTML =
          '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>';
        option.appendChild(checkmark);
      }
    });
  }
  syncUnitsUI();
  unitsButton.addEventListener("click", () => {
    const isExpanded = unitsButton.getAttribute("aria-expanded") === "true";
    unitsMenu.classList.toggle("hidden");
    unitsButton.setAttribute("aria-expanded", !isExpanded);
  });
  document.addEventListener("click", (event) => {
    if (!unitsContainer.contains(event.target)) {
      unitsMenu.classList.add("hidden");
      unitsButton.setAttribute("aria-expanded", "false");
    }
  });
  unitsMenu.querySelectorAll(".cursor-pointer").forEach((option) => {
    option.addEventListener("click", (e) => {
      const type = e.currentTarget.dataset.type;
      const value = e.currentTarget.dataset.value;
      if (type && value) {
        units[type] = value;
        saveUnits();
        syncUnitsUI();
        rerenderWeather();
      }
    });
  });
  if (lastWeatherData) rerenderWeather();
});
////////////////////////////
async function getSuggestions(query) {
  if (query.length < 1) {
    suggestionsList.classList.add("hidden");
    focusedIndex = -1;
    return;
  }
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      query,
    )}&count=5&language=en&format=json`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      currentSuggestions = data.results;
      renderSuggestions(data.results);
    } else {
      suggestionsList.classList.add("hidden");
      currentSuggestions = [];
    }
  } catch (error) {
    console.error("Suggestions error:", error);
  }
}
function renderSuggestions(results) {
  suggestionsList.innerHTML = "";
  suggestionsList.classList.remove("hidden");
  searchStatusBox.classList.add("hidden");
  focusedIndex = -1;

  results.forEach((place) => {
    const li = document.createElement("li");
    li.className =
      "suggestion-item px-4 py-3 hover:bg-[#302F49] cursor-pointer text-white border-b border-white/5 last:border-0 flex flex-col";
    li.innerHTML = `
            <span class="text-sm font-medium">${place.name}</span>
            <span class="text-[10px] text-gray-400">${
              place.admin1 ? place.admin1 + ", " : ""
            }${place.country}</span>
        `;
    li.addEventListener("click", () => {
      selectLocation(place);
    });
    suggestionsList.appendChild(li);
  });
}
function selectSuggestion(cityName) {
  cityInput.value = cityName;
  suggestionsList.classList.add("hidden");
  handleSearch(cityName);
}
async function selectLocation(place) {
  cityInput.value = place.name;
  suggestionsList.classList.add("hidden");
  searchStatusBox.classList.remove("hidden");
  clearMessages();
  try {
    const weather = await getWeather(place.latitude, place.longitude);
    lastWeatherData = weather;
    lastLocation = {
      name: place.name,
      country: place.country,
      lat: place.latitude,
      lon: place.longitude,
    };
    mainContentContainer.classList.remove("hidden");
    updateCurrentWeather(place.name, place.country, weather);
    updateDetails(weather);
    renderDailyForecast(weather);
    updateDayDropdown(weather);

    cityInput.value = "";
  } catch (error) {
    console.error("Error loading selected location:", error);
    showErrorState();
  } finally {
    searchStatusBox.classList.add("hidden");
  }
}
cityInput.addEventListener("keydown", (e) => {
  const items = suggestionsList.querySelectorAll(".suggestion-item");
  if (e.key === "Enter") {
    e.preventDefault();
    if (!suggestionsList.classList.contains("hidden") && focusedIndex > -1) {
      const selectedPlace = currentSuggestions[focusedIndex];
      selectLocation(selectedPlace);
    } else {
      handleSearch(cityInput.value);
    }
    return;
  }
  if (suggestionsList.classList.contains("hidden") || items.length === 0)
    return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    focusedIndex = (focusedIndex + 1) % items.length;
    updateFocus(items);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    focusedIndex = (focusedIndex - 1 + items.length) % items.length;
    updateFocus(items);
  }
});
function updateFocus(items) {
  items.forEach((item, index) => {
    if (index === focusedIndex) {
      item.classList.add("bg-[#302F49]");
      item.scrollIntoView({ block: "nearest" });
    } else {
      item.classList.remove("bg-[#302F49]");
    }
  });
}
cityInput.addEventListener("input", (e) => {
  getSuggestions(e.target.value.trim());
});
document.addEventListener("click", (e) => {
  if (!cityInput.contains(e.target) && !suggestionsList.contains(e.target)) {
    suggestionsList.classList.add("hidden");
  }
});
// ////////////////////////////
///////////////////////////////
