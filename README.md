# Weather Forecast Application

A lightweight, modern, client-only single-page web application that allows users to search for cities using a responsive autocomplete search box and view an accurate 5-day weather forecast.

---

## Table of Contents

- [Application Description](#application-description)
- [Technology Stack](#technology-stack)
- [Programming Paradigm & Architecture](#programming-paradigm--architecture)
- [Prerequisites](#prerequisites)
- [Installation & Running](#installation--running)
- [Production Build](#production-build)
- [OpenWeather City Data](#openweather-city-data)
- [Forecast Processing](#forecast-processing)
- [Representative Weather of the Day](#representative-weather-of-the-day)
- [Localization & Timezones](#localization--timezones)
- [Supported Browsers](#supported-browsers)
- [API Key Limitation](#api-key-limitation)
- [Project Structure](#project-structure)

---

## Application Description

This single-page application provides a clean and responsive user interface for checking 5-day weather forecasts across cities worldwide. Users can search for cities with instant local autocomplete (with full keyboard navigation support) and view aggregated daily minimum and maximum temperatures, weather conditions, and icons.

Key characteristics:

- **No external UI frameworks** (Vanilla JavaScript, ES Modules, native Fetch & Intl APIs).
- **Single HTML page** without heavy routing abstractions.
- **Race condition prevention** using `AbortController` and geolocation request tokens when switching between cities rapidly.
- **Accessible UI** conforming to WAI-ARIA combobox and listbox patterns with efficient event delegation.
- **🌐 Dual-language Dynamic Localization (CZ/EN)**: Live language switching with client-side RFC 4180 CSV parser (`translations.csv`).
- **📍 Geolocation Support**: Instant 1-click weather detection for user's physical coordinates via native `navigator.geolocation`.
- **📈 Interactive Temperature Chart**: Visual 5-day temperature curve using Chart.js with seamless Table/Chart toggle and memory leak prevention.

---

## Technology Stack

- **Vanilla JavaScript** (Modern ECMAScript / ES2022+)
- **ES Modules**
- **HTML5 & CSS3** (Semantic markup, CSS custom properties, responsive flexbox/table layout)
- **Vite** (Modern development server and production bundler)
- **Native Fetch API** (HTTP communication and local data loading)
- **Native Geolocation API** (`navigator.geolocation` for location detection)
- **Native Intl API** (`Intl.DateTimeFormat` and `Intl.NumberFormat` for browser-aware localization)
- **Chart.js** (Lightweight canvas charting for temperature evolution curves)
- **OpenWeather 5 Day / 3 Hour Forecast API**

---

## Programming Paradigm & Architecture

The application is architected strictly following an **Object-Oriented Programming (OOP)** approach, emphasizing encapsulation of behavior, separation of concerns, and composition over inheritance:

1. **Clear Encapsulation & Separation of Concerns**:
    - **`WeatherApplication`**: Orchestrates application lifecycle, handles dynamic language switching, and coordinates subsystems without directly touching low-level DOM or REST APIs.
    - **`CityRepository`**: Dedicated solely to dataset management and accent/case-insensitive text search. Independent of DOM.
    - **`CityAutocomplete`**: Manages interactive input, ARIA combobox state, keyboard navigation, debounced querying, and container-level event delegation.
    - **`OpenWeatherApiClient`**: Handles HTTP communication with OpenWeather REST endpoints, in-memory TTL caching (10 min), request cancellation signals, and HTTP status verification.
    - **`ForecastService`**: Transforms raw 3-hour data into daily aggregates based on the city's local timezone. Free of DOM.
    - **`ForecastView`**: Renders DOM structures for initial, loading, error, and forecast table states with XSS escaping.
    - **`ForecastChartView`**: Manages Chart.js lifecycle, canvas resize hooks, and clean instance teardown on DOM replacement.
    - **`TranslationService`**: Loads and parses localized CSV dictionaries (`translations.csv`) and manages active UI language dictionary.
    - **`LocaleFormatter`**: Handles cultural date and number formatting using the browser's native `Intl` facilities (with negative zero `-0 °C` prevention).
    - **Constants Modules (`src/constants/`)**: Centralized single source of truth for DOM selectors, translation keys, API endpoints, and app configuration values.

2. **Plain JavaScript Objects for Data Models**:
   Data representations (e.g. city records, daily forecast items) are stored as plain JavaScript objects rather than class hierarchies, avoiding unnecessary boilerplate and artificial inheritance trees.

3. **No Overengineering**:
   There are no redundant factories, service registries, or DI containers. Dependencies are passed directly via constructor parameters (composition).

---

## Prerequisites

- **Node.js**: LTS version (Node.js 18+ or 20+ recommended)
- **npm**: version 8+ (bundled with Node.js)
- **OpenWeather Account & API Key**: Free API key from [OpenWeatherMap](https://openweathermap.org/api)

---

## Installation & Running

1. Clone or navigate to the project directory:

    ```bash
    cd "Weather Forecast APP"
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Create the local environment configuration from `.env.example`:

    ```bash
    cp .env.example .env.local
    ```

    _(On Windows PowerShell: `Copy-Item .env.example .env.local`)_

4. Add your OpenWeather API key to `.env.local`:

    ```env
    VITE_OPENWEATHER_API_KEY=your_actual_api_key_here
    ```

5. Start the local development server:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

---

## Production Build

To build optimized production assets:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

---

## OpenWeather City Data

- **Source**: Sourced from the official OpenWeather `city.list.json` specification.
- **Location**: Stored locally in `public/data/city.list.json`.
- **Why local?**: The application performs instant, offline-capable autocomplete filtering without querying third-party geocoding APIs.
- **Coordinates for Forecast**: Each city entry contains `coord.lat` (latitude) and `coord.lon` (longitude). The application queries OpenWeather forecast endpoints using these exact coordinates rather than ambiguous city name strings.

---

## Forecast Processing

The OpenWeather API returns forecast entries in 3-hour intervals across 5 days (up to 40 data points). The application transforms these raw entries into clean, aggregated daily forecasts:

1. **City Timezone Grouping**: Each 3-hour timestamp (`dt`) is converted into the city's local time using `city.timezone` (shift in seconds from UTC). Points are grouped into calendar days according to the city's local date.
2. **Temperature Extremes**: For each local calendar day, the daily minimum temperature is calculated as the minimum of all `main.temp` values of that day, and the maximum temperature is calculated as the maximum of all `main.temp` values of that day.
3. **Limit**: Up to 5 consecutive daily summaries are produced.

---

## Representative Weather of the Day

To provide an accurate and consistent weather condition label and icon for each day:

- The application evaluates all 3-hour forecast points within each local calendar day and selects the point **closest to local solar noon (12:00 local city time)**.
- Midday weather conditions provide the most representative representation of daylight weather and daytime conditions for end users.

---

## Localization & Timezones

The application strictly differentiates between **time calculation**, **translation**, and **presentation**:

- **City Timezone (`city.timezone`)**: Determines the local calendar day each 3-hour slot belongs to, ensuring midnight transitions in foreign timezones do not corrupt day boundaries.
- **Dynamic Translation (`TranslationService`)**: Translates weather condition strings (e.g. `Clear` -> `Jasno`) and UI labels based on the selected language in real time without page reload.
- **Browser/Language Locale (`LocaleFormatter` / `Intl.DateTimeFormat`)**: Determines how dates and day names are presented to the user (e.g. `pondělí 21. září` for Czech locales, `Monday, Sep 21` for English locales).

---

## Supported Browsers

- **Google Chrome** (latest versions)
- **Mozilla Firefox** (latest versions)
- **Microsoft Edge** (latest versions)
- **Apple Safari** (latest versions)

---

## API Key Limitation

> [!NOTE]
> This is a **client-only single-page application**. In any client-only architecture where API calls originate from the user's browser, environment variables (e.g. `VITE_OPENWEATHER_API_KEY`) bundled into client JavaScript can be inspected by end users via browser DevTools.
>
> In a commercial production environment, API requests should be routed through a backend server or proxy that securely stores the API key on the server side and applies authentication, caching, and rate limiting. A backend proxy is intentionally omitted here to fulfill the strict client-only specification.

---

## Project Structure

```
Weather Forecast APP/
├── index.html                  # Single semantic HTML entry point
├── package.json                # Project dependencies and Vite build scripts
├── vite.config.js              # Vite server and build configuration
├── README.md                   # Project documentation and architecture guide
├── .gitignore                  # Git ignore rules (excluding dist, node_modules, .env.local)
├── .env.example                # Example environment file template
│
├── public/
│   └── data/
│       ├── city.list.json      # Local OpenWeather city database (Czech & World cities)
│       └── translations.csv    # Localized CSV dictionary (RFC 4180 format)
│
└── src/
    ├── main.js                 # App bootstrap script
    │
    ├── app/
    │   └── WeatherApplication.js   # Application coordinator & event wiring
    │
    ├── cities/
    │   ├── CityRepository.js       # City dataset loader and search engine
    │   └── CityAutocomplete.js     # Accessible combobox UI component (Event delegation)
    │
    ├── constants/
    │   ├── ApiEndpoints.js         # REST endpoints & static dataset paths
    │   ├── AppConfig.js            # Timers, debounce delays, cache TTL
    │   ├── DomSelectors.js         # DOM IDs, classes, and query selectors
    │   └── TranslationKeys.js      # Type-safe translation key constants
    │
    ├── geolocation/
    │   └── GeolocationService.js   # Native browser Geolocation API client
    │
    ├── weather/
    │   ├── OpenWeatherApiClient.js # OpenWeather REST API client (Fetch & AbortController)
    │   ├── ForecastService.js      # 3-hour to 5-day timezone-aware data transformer
    │   ├── ForecastView.js         # DOM renderer for forecast tables and state alerts
    │   └── ForecastChartView.js    # Chart.js temperature evolution curve renderer
    │
    ├── localization/
    │   ├── TranslationService.js   # RFC 4180 CSV translation dictionary loader
    │   └── LocaleFormatter.js      # Intl date and temperature formatter
    │
    └── styles/
        └── main.css                # CSS styles (responsive layout, states, typography, charts)
```
