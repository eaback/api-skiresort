"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeApi = exports.authApi = exports.ordersApi = exports.customersApi = exports.productsApi = exports.apiClient = void 0;
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
class ApiClient {
    getHeaders(options) {
        const headers = {
            "Content-Type": "application/json",
            ...options?.headers,
        };
        if (options?.token) {
            headers["Authorization"] = `Bearer ${options.token}`;
        }
        return headers;
    }
    async handleResponse(response) {
        if (!response.ok) {
            let errorMessage = "An error occurred";
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            }
            catch (e) {
                // If parsing fails, use status text
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        return response.json();
    }
    async get(endpoint, options) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: "GET",
            headers: this.getHeaders(options),
            credentials: "include",
        });
        return this.handleResponse(response);
    }
    async post(endpoint, data, options) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: "POST",
            headers: this.getHeaders(options),
            body: JSON.stringify(data),
            credentials: "include",
        });
        return this.handleResponse(response);
    }
    async put(endpoint, data, options) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: "PUT",
            headers: this.getHeaders(options),
            body: JSON.stringify(data),
            credentials: "include",
        });
        return this.handleResponse(response);
    }
    async delete(endpoint, options) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: "DELETE",
            headers: this.getHeaders(options),
            credentials: "include",
        });
        return this.handleResponse(response);
    }
}
exports.apiClient = new ApiClient();
// Specialized API services
exports.productsApi = {
    getAll: () => exports.apiClient.get("/products"),
    getById: (id) => exports.apiClient.get(`/products?id=${id}`),
    getByCategory: (category) => exports.apiClient.get(`/products?category=${category}`),
    create: (product, token) => exports.apiClient.post("/products", product, { token }),
    update: (id, product, token) => exports.apiClient.put(`/products?id=${id}`, product, { token }),
    delete: (id, token) => exports.apiClient.delete(`/products?id=${id}`, { token }),
};
exports.customersApi = {
    getById: (id, token) => exports.apiClient.get(`/customers?id=${id}`, { token }),
    getByEmail: (email, token) => exports.apiClient.get(`/customers/${encodeURIComponent(email)}`, { token }),
    update: (id, customer, token) => exports.apiClient.put(`/customers?id=${id}`, customer, { token }),
};
exports.ordersApi = {
    getAll: (token) => exports.apiClient.get("/orders", { token }),
    getById: (id, token) => exports.apiClient.get(`/orders?id=${id}`, { token }),
    getByCustomerId: (customerId, token) => exports.apiClient.get(`/orders?customerId=${customerId}`, { token }),
    create: (order, token) => exports.apiClient.post("/orders", order, { token }),
    update: (id, order, token) => exports.apiClient.put(`/orders?id=${id}`, order, { token }),
    delete: (id, token) => exports.apiClient.delete(`/orders?id=${id}`, { token }),
};
exports.authApi = {
    login: (email, password) => exports.apiClient.post("/auth/login", { email, password }),
    register: (userData) => exports.apiClient.post("/auth/register", userData),
    checkEmail: (email) => exports.apiClient.get(`/customers/${encodeURIComponent(email)}`),
};
exports.stripeApi = {
    createCheckoutSession: (orderId, lineItems, token) => exports.apiClient.post("/stripe", { orderId, lineItems }, { token }),
};
