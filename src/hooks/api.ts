import axios from "axios";
import { useUIStore } from "@/store/useUIStore";


// Backend base URL 
const BASE_URL = import.meta.env.VITE_API_BASE_URL;  

export async function login(username: string, password: string): Promise<boolean> {
    try {
        const body = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
        console.log("trying");
        const response = await axios.post(`${BASE_URL}/login`, body, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        
        console.log("tried");
        if (response.status === 200) {
          useUIStore.getState().setUsername(username); // Store globally
          return true;
        }
        return false;
    } 
    catch (error) {
        console.error("Login failed:", error);
        return false;
    }
}



export async function apiGet<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status} ${res.statusText}`);
  return res.json();
}

export async function apiPost<T = unknown, B = unknown>(path: string, body?: B, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  });
  if (!res.ok) throw new Error(`POST ${path} -> ${res.status} ${res.statusText}`);
  return res.json();
}
