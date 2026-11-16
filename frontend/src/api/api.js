import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    const skip = ["/auth/login", "/auth/refresh"];
    const isAuthRoute = skip.some((p) => original.url.startsWith(p));
    if (status === 401 && !original._retried && !isAuthRoute) {
      original._retried = true;
      try {
        refreshing = refreshing || api.post("/auth/refresh");
        await refreshing;
        return api(original); // retry the original request
      } catch {
        window.location.href = "/login/";
      } finally {
        refreshing = null;
      }
    }
    return Promise.reject(error);
  },
);

export default api;
