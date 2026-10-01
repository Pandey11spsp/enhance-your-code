const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("access_token");

  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  const contentType = response.headers.get("content-type");

  const data = contentType?.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new Error(
      data?.detail || "Something went wrong."
    );
  }

  return data as T;
}

export const api = {
  get<T>(endpoint: string) {
    return apiRequest<T>(endpoint, {
      method: "GET",
    });
  },

  post<T>(endpoint: string, body?: unknown) {
    return apiRequest<T>(endpoint, {
      method: "POST",
      body: body === undefined
        ? undefined
        : JSON.stringify(body),
    });
  },

  put<T>(endpoint: string, body?: unknown) {
    return apiRequest<T>(endpoint, {
      method: "PUT",
      body: body === undefined
        ? undefined
        : JSON.stringify(body),
    });
  },

  delete<T>(endpoint: string) {
    return apiRequest<T>(endpoint, {
      method: "DELETE",
    });
  },
};

export { API_BASE_URL };