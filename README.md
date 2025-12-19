
# 🌿 GreenRoute - Eco-Friendly Route Planner

![GreenRoute Banner](https://socialify.git.ci/demon2202/GreenRoute/image?description=1&font=Inter&forks=1&issues=1&language=1&name=1&owner=1&pulls=1&stargazers=1&theme=Light)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.2-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-4.0-purple)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-cyan)](https://tailwindcss.com/)
[![Mapbox](https://img.shields.io/badge/Mapbox-GL%20JS-black)](https://www.mapbox.com/)
[![Netlify Status](https://api.netlify.com/api/v1/badges/your-badge-id/deploy-status)](https://app.netlify.com/sites/greenroute-demo/deploys)

**GreenRoute** is a modern, sustainable navigation web application designed to help users reduce their carbon footprint. Unlike traditional navigation apps that prioritize speed above all else, GreenRoute calculates and suggests the most **environmentally friendly routes** between two locations.

> "The greatest threat to our planet is the belief that someone else will save it." – Robert Swan

---

## 📖 Table of Contents

- [🌍 The "Why" - A Deeper Look](#-the-why---a-deeper-look)
- [🏗️ System Architecture](#%EF%B8%8F-system-architecture)
- [📖 Comprehensive User Guide](#-comprehensive-user-guide)
- [💻 Code Deep Dive & Pattern Analysis](#-code-deep-dive--pattern-analysis)
- [✨ Key Features](#-key-features)
- [📸 Screenshots](#-screenshots)
- [🛠 Tech Stack](#-tech-stack)
- [🚀 Getting Started](#-getting-started)
- [📂 Folder Structure](#-folder-structure)
- [🚢 Deployment](#-deployment)
- [🔮 Roadmap](#-roadmap)
- [🔧 Troubleshooting](#-troubleshooting)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 🌍 The "Why" - A Deeper Look

### The Invisible Cost of Speed
Modern navigation algorithms (Google Maps, Waze) are optimized for one single metric: **Time**. They will happily route you 5 miles further to save 1 minute of travel time. 

However, **Distance ≠ Emissions**.
- Stop-and-go traffic emits **2-3x more CO₂** than highway driving.
- A slightly longer route at a steady speed is often greener than a shorter, congested one.
- Taking a bus instead of a car reduces emissions by **~66%**.

### The Impact
Transportation accounts for **24% of direct CO₂ emissions** from fuel combustion.
GreenRoute empowers users to visualize this impact.

| Mode of Transport | CO₂ per Mile (Avg) | Impact Level |
|:---:|:---:|:---:|
| 🚗 **SUV / Truck** | 360g | 🔴 High |
| 🚗 **Sedan** | 192g | 🟠 Medium |
| 🚌 **Public Transit** | 64g | 🟡 Low |
| 🚲 **Cycling** | 0g | 🟢 Zero |
| 🚶 **Walking** | 0g | 🟢 Zero |

---

## 🏗️ System Architecture

GreenRoute follows a **Client-Side Rendering (CSR)** architecture powered by React and APIs.

```mermaid
graph TD
    A[User Interaction] -->|Inputs Locations| B(React Frontend)
    B -->|Geocoding Request| C[Mapbox Geocoding API]
    C -->|Coordinates| B
    B -->|Directions Request| D[Mapbox Directions API]
    D -->|Route Data (GeoJSON)| B
    B -->|Calculate Emissions| E[Utility Logic]
    E -->|Green Score| F[Zustand State Store]
    F -->|Update UI| G[Map & Info Cards]
```

1.  **Input Layer:** Users interact with the search bar using `Mapbox Geocoder`.
2.  **Data Layer:** We fetch routes for multiple profiles (`driving`, `cycling`, `walking`).
3.  **Logic Layer:** Raw distance/duration data is passed to `emissions.ts` to append carbon data.
4.  **Presentation Layer:** Mapbox GL JS renders the lines; React renders the UI overlay.

---

## 📖 Comprehensive User Guide

### 1. The Interface
The UI is split into two main layers:
-   **Background:** The interactive 3D map.
-   **Foreground:** The glass-morphism control panel (Desktop: Top-Left, Mobile: Bottom-Sheet).

### 2. How to Plan a "Green Trip"
1.  **Grant Permissions:** Allow Geolocation for the best experience.
2.  **Set Origin:** Defaults to your location. Click the "Current Location" icon to reset.
3.  **Set Destination:** Use the search bar. It supports "Fuzzy Search" (e.g., typing "coffee near me").
4.  **Analyze Routes:**
    *   **The Leaf Icon 🍃:** Indicates the most eco-friendly route, even if it's not the fastest.
    *   **The Flame Icon 🔥:** Indicates high fuel consumption (avoid if possible).

### 3. Understanding the "Green Score"
The Green Score (0-100) is our proprietary efficiency rating.
*   **90-100:** Excellent (Walking/Biking or very efficient driving).
*   **70-89:** Good (Standard transit or direct driving).
*   **< 50:** Poor (Inefficient route, heavy traffic, or high-emission vehicle).

### 4. Offline Mode
The app caches the core assets using a Service Worker (via Vite PWA plugin). If you lose internet, you can still view the map tiles that were previously loaded, though routing APIs will be unavailable.

---

## 💻 Code Deep Dive & Pattern Analysis

### 1. State Management (Zustand)
We use `zustand` for global state to avoid "Prop Drilling".

**File:** `src/store/useRouteStore.ts`
```typescript
import create from 'zustand';

interface RouteState {
  origin: Coordinates | null;
  destination: Coordinates | null;
  routes: RouteData[];
  setRoutes: (routes: RouteData[]) => void;
}

export const useRouteStore = create<RouteState>((set) => ({
  origin: null,
  destination: null,
  routes: [],
  setRoutes: (routes) => set({ routes }),
}));
```

### 2. Custom Hook for Map Logic
To keep components clean, map logic is extracted into hooks.

**File:** `src/hooks/useMapbox.ts`
```typescript
export const useMapbox = (containerRef: RefObject<HTMLDivElement>) => {
  useEffect(() => {
    if (!containerRef.current) return;
    
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-74.5, 40],
      zoom: 9
    });

    return () => map.remove();
  }, []);
};
```

### 3. The Emission Algorithm
We calculate CO2 based on distance *and* estimated traffic drag (duration vs distance ratio).

**File:** `src/utils/emissions.ts`
```typescript
export const calculateCO2 = (distance: number, duration: number, mode: string) => {
  const BASE_EMISSION = 120; // g/km for cars
  const TRAFFIC_PENALTY = 10; // g/min of delay

  let totalCO2 = (distance / 1000) * BASE_EMISSION;

  // If speed is below 20km/h (traffic), add penalty
  const speed = (distance / 1000) / (duration / 3600);
  if (mode === 'driving' && speed < 20) {
    totalCO2 += (duration / 60) * TRAFFIC_PENALTY;
  }

  return Math.round(totalCO2);
};
```

---

## ✨ Key Features

| Feature | Description | Status |
|:---|:---|:---|
| **🌱 Eco-Routing** | Prioritizes lower emissions using our custom algorithm. | ✅ Live |
| **🚲 Multi-Mode** | Compare Car, Bus, Bike, and Walking in one view. | ✅ Live |
| **📊 Green Score** | Visual 0-100 efficiency rating. | ✅ Live |
| **🌙 Dark Mode** | Auto-adapts to system preferences. | ✅ Live |
| **🔐 Auth & Cloud** | Save routes and history via Firebase. | ✅ Live |
| **💾 PWA** | Installable on iOS/Android. | 🚧 Beta |
| **🔌 EV Stations** | Find charging spots along the route. | 🔜 Coming Soon |

---

## 📸 Screenshots

| Landing Page | Route Calculation | Dark Mode |
|:---:|:---:|:---:|
| ![Landing](https://via.placeholder.com/300x600?text=Landing+Page) | ![Route](https://via.placeholder.com/300x600?text=Route+Calculation) | ![Dark Mode](https://via.placeholder.com/300x600?text=Dark+Mode) |

---

## 🛠 Tech Stack

### Frontend
- **Framework:** React 18 (TypeScript)
- **Build Tool:** Vite (Fast HMR)
- **Styling:** Tailwind CSS + Headless UI (Accessible components)
- **Icons:** Heroicons / Phosphor Icons

### Maps & Data
- **Core Map:** Mapbox GL JS
- **Routing:** Mapbox Directions API
- **Geocoding:** Mapbox Geocoding API

### Backend (Serverless)
- **Auth:** Firebase Authentication (Google/Email)
- **Database:** Cloud Firestore (NoSQL)
- **Hosting:** Netlify / Vercel

---

## 🚀 Getting Started

### Prerequisites
- Node.js v16+
- Mapbox Account (for API Token)

### Installation

1.  **Clone & Install**
    ```bash
    git clone https://github.com/demon2202/GreenRoute.git
    cd GreenRoute
    npm install
    ```

2.  **Configure Environment**
    Create a `.env.local` file in the root:
    ```env
    VITE_MAPBOX_TOKEN=pk.eyJ1IjoiZ... (Your token here)
    VITE_FIREBASE_API_KEY=AIzaSy...
    VITE_FIREBASE_AUTH_DOMAIN=greenroute.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=greenroute
    ```

3.  **Run Development Server**
    ```bash
    npm run dev
    ```
    Visit `http://localhost:5173`.

---

## 📂 Folder Structure

```text
GreenRoute/
├── src/
│   ├── assets/          # Static images/fonts
│   ├── components/
│   │   ├── layout/      # Header, Sidebar, Footer
│   │   ├── map/         # MapCanvas, Markers, Popups
│   │   ├── routing/     # RouteCard, TransportSelector
│   │   └── ui/          # Buttons, Inputs, Modals
│   ├── context/         # React Context providers
│   ├── hooks/           # Custom hooks (useAuth, useGeo)
│   ├── pages/           # Dashboard, Login, Settings
│   ├── services/        # API wrapper functions
│   ├── styles/          # Global CSS/Tailwind directives
│   ├── utils/           # Helpers (formatters, calculators)
│   └── App.tsx
└── ...config files
```

---

## 🚢 Deployment

### Vercel (Recommended)
1.  Install Vercel CLI: `npm i -g vercel`
2.  Run `vercel`
3.  Set your Environment Variables in the Vercel Dashboard.

### Netlify
1.  Drag and drop the `dist` folder (created after `npm run build`) to Netlify Drop.
2.  Or connect GitHub repo for auto-deploys.

---

## 🔮 Roadmap

- [x] Basic Eco-Routing
- [x] User Authentication
- [ ] **Gamification:** Leaderboards for CO2 saved.
- [ ] **EV Support:** Show charging stations.
- [ ] **Carpooling:** Match with users on similar routes.
- [ ] **Weather:** Alert if rain affects cycling routes.

---

## 🔧 Troubleshooting

**Map is black/blank:**
- Check if your Mapbox Token is valid.
- Ensure the `style` URL in `MapCanvas.tsx` is correct.

**"Process is not defined":**
- Since we use Vite, use `import.meta.env.VITE_VAR` instead of `process.env.REACT_APP_VAR`.

---

## 🤝 Contributing

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Made with 💚 by <a href="https://github.com/demon2202">demon2202</a>
</p>
