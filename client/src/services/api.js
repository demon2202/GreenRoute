import axios from 'axios';

// This ensures cookies are sent with every request from the client
axios.defaults.withCredentials = true;

// Define the base URL for your backend API
const API_URL = 'http://localhost:5000/api';

// --- AUTHENTICATION SERVICE ---
export const fetchCurrentUser = () => axios.get(`${API_URL}/auth/current_user`);
export const loginWithEmail = (credentials) => axios.post(`${API_URL}/auth/login`, credentials);
export const registerWithEmail = (userData) => axios.post(`${API_URL}/auth/register`, userData);

// --- PREFERENCES SERVICE ---
export const fetchPreferences = () => axios.get(`${API_URL}/preferences`);
export const savePreferences = (prefs) => axios.post(`${API_URL}/preferences`, prefs);

// --- THEME SERVICE ---
export const saveTheme = (theme) => axios.post(`${API_URL}/theme`, { theme });

// --- ROUTE PLANNING SERVICE ---
export const planRoute = (origin, destination) => axios.post(`${API_URL}/route`, { origin, destination });

// --- WEATHER SERVICE ---
export const fetchWeather = (lat, lon) => axios.get(`${API_URL}/weather?lat=${lat}&lon=${lon}`);

// --- TRIP HISTORY SERVICE ---
export const fetchTripHistory = () => axios.get(`${API_URL}/history`);
export const saveTrip = (tripData) => axios.post(`${API_URL}/history`, tripData);