# 🌿 GreenRoute - Your Sustainable Commute Planner

GreenRoute is a modern, full-stack web application built to help urban commuters make environmentally conscious travel decisions. It calculates and compares the carbon footprint of different travel modes using live data, all while offering a seamless and interactive user experience.

---

<img width="1919" height="935" alt="Screenshot 2025-08-14 145536" src="https://github.com/user-attachments/assets/fe47f2cb-9096-41fd-b419-d1f0c0b6be02" />
<img width="1919" height="933" alt="Screenshot 2025-08-14 145555" src="https://github.com/user-attachments/assets/8005b302-d020-4658-b66d-8a59d8b4fa91" />
<img width="1918" height="931" alt="Screenshot 2025-08-14 145607" src="https://github.com/user-attachments/assets/b20eeb8c-263d-4c71-a8b4-e0aa8815420f" />
<img width="1913" height="930" alt="Screenshot 2025-08-14 145629" src="https://github.com/user-attachments/assets/27a938a9-b56b-4df7-abd1-95eede041b64" />
<img width="1912" height="934" alt="Screenshot 2025-08-14 145637" src="https://github.com/user-attachments/assets/3a9ca4a7-d88c-458a-b805-3a8f1fd29840" />
<img width="1917" height="934" alt="Screenshot 2025-08-14 145647" src="https://github.com/user-attachments/assets/81627574-9e2b-497f-8299-51d11c20913c" />
<img width="1918" height="930" alt="Screenshot 2025-08-14 145659" src="https://github.com/user-attachments/assets/9d039e01-43f6-4bd3-81e1-7a4c17656995" />
<img width="1919" height="932" alt="Screenshot 2025-08-14 145715" src="https://github.com/user-attachments/assets/a7ebdf09-2318-4441-acf7-e906763cb5e6" />
<img width="1919" height="934" alt="Screenshot 2025-08-14 145730" src="https://github.com/user-attachments/assets/e90374b0-96e4-4365-9f04-ecf5224bac81" />
<img width="1919" height="936" alt="Screenshot 2025-08-14 145736" src="https://github.com/user-attachments/assets/af511616-949a-488d-b7b0-2ab5761195e2" />
<img width="1919" height="944" alt="Screenshot 2025-08-14 145746" src="https://github.com/user-attachments/assets/0c54670c-d375-4a1b-98c6-5482fe5c1b8a" />

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



