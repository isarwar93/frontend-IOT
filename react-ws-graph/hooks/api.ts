import axios from "axios";
import { useUIStore } from "@/store/useUIStore";


// Backend base URL (adjust if needed)

const BASE_URL = import.meta.env.VITE_API_BASE_URL;  // Change to your backend's IP/Port

export async function login(username: string, password: string): Promise<boolean> {
    try {
        const body = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
        const response = await axios.post(`${BASE_URL}/login`, body, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

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
