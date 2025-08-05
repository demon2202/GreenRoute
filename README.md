# 🌿 GreenRoute - Your Sustainable Commute Planner

GreenRoute is a modern, full-stack web application built to help urban commuters make environmentally conscious travel decisions. It calculates and compares the carbon footprint of different travel modes using live data, all while offering a seamless and interactive user experience.

![GreenRoute Demo](demo-video-link-placeholder)

---

## ✨ Features

- **🔐 Dual Authentication**
  - Secure Sign Up/Login using Email & Password (with bcrypt hashing)
  - Google OAuth 2.0 integration via Passport.js

- **🗺️ Interactive Route Planner**
  - Map-based interface with **Mapbox GL JS**
  - Search using **Mapbox Geocoding API**
  - Live route generation for driving, cycling, and walking

- **♻️ Carbon Footprint Analysis**
  - Calculates and displays CO₂ saved compared to a standard car route

- **📊 Live Data Widgets**
  - Weather information from **OpenWeatherMap API**
  - Daily & Monthly carbon savings tracker

- **📜 Persistent Trip History**
  - Save completed trips to user profile
  - View past trips and carbon savings

- **⚙️ User Settings & Preferences**
  - Edit profile details
  - Set transportation preferences and sustainability goals

- **📱 Responsive Design**
  - Fully responsive UI for desktop and mobile
  - Hoverable sidebar on desktop, slide-out menu on mobile

---

## 🛠️ Tech Stack

| Category         | Technology                                                                 |
|------------------|-----------------------------------------------------------------------------|
| **Frontend**     | React, React Router, Context API, Axios, Mapbox GL JS                      |
| **Backend**      | Node.js, Express.js                                                        |
| **Database**     | MongoDB, Mongoose                                                          |
| **Authentication** | Passport.js (Google OAuth 2.0 & Local), bcrypt.js, Express Sessions      |
| **APIs**         | Mapbox API (Geocoding & Directions), OpenWeatherMap API                    |
| **Security**     | Helmet, express-rate-limit, express-mongo-sanitize                         |

---

## 🚀 Local Setup & Installation

### 📋 Prerequisites

- Node.js (v16 or higher)
- npm
- MongoDB (Local or MongoDB Atlas)

---

### 🧩 1. Clone the Repository

```bash
git clone <your-repository-url>
cd greenroute
