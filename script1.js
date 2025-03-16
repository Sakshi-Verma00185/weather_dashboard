const apiBaseUrl = "https://api.open-meteo.com/v1/forecast";
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const unitToggle = document.getElementById("unit-toggle");
const weatherInfo = document.querySelector(".weather-info");
const loadingSpinner = document.getElementById("loading-spinner");
const forecastSection = document.querySelector(".forecast");
const forecastCards = document.getElementById("forecast-cards");
const hourlySection = document.querySelector(".hourly-forecast");
const hourlyCards = document.getElementById("hourly-cards");
const alertsSection = document.getElementById("alerts-section");
const alerts = document.getElementById("alerts");
const mapSection = document.getElementById("map-section");
let isCelsius = true;

searchBtn.addEventListener("click", fetchWeather);
unitToggle.addEventListener("click", toggleUnit);

async function fetchWeather() {
  const city = cityInput.value.trim();
  if (!city) {
    alert("Please enter a city name.");
    return;
  }

  try {
    showLoading();
    const geocodeResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${city}`
    );
    
    if (!geocodeResponse.ok) {
      throw new Error('Failed to fetch city coordinates');
    }

    const geocodeData = await geocodeResponse.json();

    if (!geocodeData.results || geocodeData.results.length === 0) {
      alert("City not found. Please try again.");
      return;
    }

    const { latitude, longitude, timezone } = geocodeData.results[0];

    const weatherResponse = await fetch(
      `${apiBaseUrl}?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,weathercode&hourly=temperature_2m,weathercode,visibility,windspeed_10m&timezone=${timezone}`
    );

    if (!weatherResponse.ok) {
      throw new Error('Failed to fetch weather data');
    }

    const weatherData = await weatherResponse.json();

    updateWeather(weatherData, geocodeData.results[0]);
    updateForecast(weatherData);
    updateHourlyForecast(weatherData);
    updateMap(latitude, longitude);
    updateAlerts(weatherData);
  } catch (error) {
    console.error(error);
    alert("Unable to fetch weather data. Please try again.");
  } finally {
    hideLoading();
  }
}

function updateWeather(data, location) {
  const { current_weather, daily } = data;

  document.getElementById("city-name").textContent = location.name;
  document.getElementById("temp").textContent = `${convertTemp(current_weather.temperature)}°${isCelsius ? "C" : "F"}`;
  document.getElementById("feels-like").textContent = `Feels Like: ${convertTemp(current_weather.temperature)}°${isCelsius ? "C" : "F"}`;
  document.getElementById("condition").textContent = getWeatherCondition(current_weather.weathercode);
  document.getElementById("humidity").textContent = "--%";
  document.getElementById("wind-speed").textContent = `${current_weather.windspeed} km/h`;
  document.getElementById("pressure").textContent = "--";
  document.getElementById("visibility").textContent = `${data.hourly.visibility[0] / 1000} km`;
  document.getElementById("sunrise").textContent = new Date(daily.sunrise[0]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  document.getElementById("sunset").textContent = new Date(daily.sunset[0]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  document.getElementById("uv-index").textContent = daily.uv_index_max[0];

  weatherInfo.classList.remove("hidden");
}

function updateForecast(data) {
  const { daily } = data;

  forecastCards.innerHTML = "";
  daily.time.forEach((date, index) => {
    const formattedDate = new Date(date).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const maxTemp = convertTemp(daily.temperature_2m_max[index]);
    const minTemp = convertTemp(daily.temperature_2m_min[index]);
    const weatherCode = daily.weathercode[index];

    const card = document.createElement("div");
    card.className = "forecast-card";
    card.innerHTML = `
      <p>${formattedDate}</p>
      <i class="fas ${getWeatherIcon(weatherCode)}"></i>
      <p>${maxTemp}°/${minTemp}° ${isCelsius ? "C" : "F"}</p>
      <p>${getWeatherCondition(weatherCode)}</p>
      <p>Humidity: --%</p>
      <p>Wind: -- km/h</p>
    `;
    forecastCards.appendChild(card);
  });

  forecastSection.classList.remove("hidden");
}

function updateHourlyForecast(data) {
  const { hourly } = data;

  hourlyCards.innerHTML = "";
  hourly.time.slice(0, 12).forEach((time, index) => {
    const formattedTime = new Date(time).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const temp = convertTemp(hourly.temperature_2m[index]);
    const weatherCode = hourly.weathercode[index];

    const card = document.createElement("div");
    card.className = "hourly-card";
    card.innerHTML = `
      <p>${formattedTime}</p>
      <i class="fas ${getWeatherIcon(weatherCode)}"></i>
      <p>${temp}° ${isCelsius ? "C" : "F"}</p>
    `;
    hourlyCards.appendChild(card);
  });

  hourlySection.classList.remove("hidden");
}

function updateAlerts(data) {
  const alertsData = data.alerts;
  if (alertsData && alertsData.length > 0) {
    alerts.innerHTML = alertsData
      .map((alert) => `<p>${alert.description}</p>`)
      .join("");
  } else {
    alerts.innerHTML = "<p>No alerts for this location.</p>";
  }
  alertsSection.classList.remove("hidden");
}

function updateMap(latitude, longitude) {
  const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}&z=10&output=embed`;
  mapSection.innerHTML = `<iframe src="${mapUrl}" width="100%" height="300" style="border:0;"></iframe>`;
  mapSection.classList.remove("hidden");
}

function toggleUnit() {
  isCelsius = !isCelsius;
  fetchWeather();
}

function convertTemp(tempC) {
  return isCelsius ? tempC : (tempC * 9) / 5 + 32;
}

function getWeatherCondition(weatherCode) {
  const conditionMap = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing Rime Fog",
    51: "Light Drizzle",
    61: "Light Rain",
    80: "Rain Showers",
    95: "Thunderstorm",
  };
  return conditionMap[weatherCode] || "Unknown";
}

function getWeatherIcon(weatherCode) {
  const iconMap = {
    0: "fa-sun",
    1: "fa-cloud",
    2: "fa-cloud",
    3: "fa-cloud",
    45: "fa-smog",
    48: "fa-smog",
    51: "fa-cloud-rain",
    61: "fa-cloud-showers-heavy",
    80: "fa-cloud-showers-heavy",
    95: "fa-bolt",
  };
  return iconMap[weatherCode] || "fa-question";
}

function showLoading() {
  loadingSpinner.classList.remove("hidden");
  weatherInfo.classList.add("hidden");
  forecastSection.classList.add("hidden");
  hourlySection.classList.add("hidden");
}

function hideLoading() {
  loadingSpinner.classList.add("hidden");
}


