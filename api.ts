// api.ts
import axios from "axios";
import { AuthStore } from "./stores/AuthStore";

export const createApi = (authStore: AuthStore) => {
  const api = axios.create({
    baseURL: "https://api.koleso.app/api",
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Добавляем интерсептор для авторизации
  api.interceptors.request.use((config) => {
    const token = authStore.token;
    console.log('token '+ token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (authStore.oneSignalId) {
        config.headers['X-OneSignal-Id'] = authStore.oneSignalId;
      }
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        authStore.logout();
      }
      return Promise.reject(error);
    }
  );

  return api;
};

// Тип для нашего API
export type ApiInstance = ReturnType<typeof createApi>;