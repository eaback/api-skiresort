"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiClient = void 0;
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
exports.apiClient = {
    async get(endpoint, token) {
        const headers = {
            "Content-Type": "application/json",
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: "GET",
            headers,
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Something went wrong");
        }
        return response.json();
    },
    async post(endpoint, data, token) {
        const headers = {
            "Content-Type": "application/json",
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: "POST",
            headers,
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Something went wrong");
        }
        return response.json();
    },
    async put(endpoint, data, token) {
        const headers = {
            "Content-Type": "application/json",
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: "PUT",
            headers,
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Something went wrong");
        }
        return response.json();
    },
    async delete(endpoint, token) {
        const headers = {
            "Content-Type": "application/json",
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: "DELETE",
            headers,
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Something went wrong");
        }
        return response.json();
    },
};
