const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api"

interface ApiOptions {
  token?: string
  headers?: Record<string, string>
}

class ApiClient {
  private getHeaders(options?: ApiOptions): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options?.headers,
    }

    if (options?.token) {
      headers["Authorization"] = `Bearer ${options.token}`
    }

    return headers
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = "An error occurred"

      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorMessage
      } catch (e) {
        // If parsing fails, use status text
        errorMessage = response.statusText || errorMessage
      }

      throw new Error(errorMessage)
    }

    return response.json() as Promise<T>
  }

  async get<T>(endpoint: string, options?: ApiOptions): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "GET",
      headers: this.getHeaders(options),
      credentials: "include",
    })

    return this.handleResponse<T>(response)
  }

  async post<T>(endpoint: string, data: any, options?: ApiOptions): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: this.getHeaders(options),
      body: JSON.stringify(data),
      credentials: "include",
    })

    return this.handleResponse<T>(response)
  }

  async put<T>(endpoint: string, data: any, options?: ApiOptions): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "PUT",
      headers: this.getHeaders(options),
      body: JSON.stringify(data),
      credentials: "include",
    })

    return this.handleResponse<T>(response)
  }

  async delete<T>(endpoint: string, options?: ApiOptions): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "DELETE",
      headers: this.getHeaders(options),
      credentials: "include",
    })

    return this.handleResponse<T>(response)
  }
}

export const apiClient = new ApiClient()

// Specialized API services
export const productsApi = {
  getAll: () => apiClient.get("/products"),
  getById: (id: number) => apiClient.get(`/products?id=${id}`),
  getByCategory: (category: string) => apiClient.get(`/products?category=${category}`),
  create: (product: any, token: string) => apiClient.post("/products", product, { token }),
  update: (id: number, product: any, token: string) => apiClient.put(`/products?id=${id}`, product, { token }),
  delete: (id: number, token: string) => apiClient.delete(`/products?id=${id}`, { token }),
}

export const customersApi = {
  getById: (id: number, token: string) => apiClient.get(`/customers?id=${id}`, { token }),
  getByEmail: (email: string, token: string) => apiClient.get(`/customers/${encodeURIComponent(email)}`, { token }),
  update: (id: number, customer: any, token: string) => apiClient.put(`/customers?id=${id}`, customer, { token }),
}

export const ordersApi = {
  getAll: (token: string) => apiClient.get("/orders", { token }),
  getById: (id: number, token: string) => apiClient.get(`/orders?id=${id}`, { token }),
  getByCustomerId: (customerId: number, token: string) => apiClient.get(`/orders?customerId=${customerId}`, { token }),
  create: (order: any, token: string) => apiClient.post("/orders", order, { token }),
  update: (id: number, order: any, token: string) => apiClient.put(`/orders?id=${id}`, order, { token }),
  delete: (id: number, token: string) => apiClient.delete(`/orders?id=${id}`, { token }),
}

export const authApi = {
  login: (email: string, password: string) => apiClient.post("/auth/login", { email, password }),
  register: (userData: any) => apiClient.post("/auth/register", userData),
  checkEmail: (email: string) => apiClient.get(`/customers/${encodeURIComponent(email)}`),
}

export const stripeApi = {
  createCheckoutSession: (orderId: number, lineItems: any[], token: string) =>
    apiClient.post("/stripe", { orderId, lineItems }, { token }),
}
