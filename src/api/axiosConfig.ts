import axios, { AxiosInstance } from "axios";
import { setSession, getStoredTokens, logout } from "@/api/authService";

const API_ENDPOINT_URL = import.meta.env.VITE_APP_BACKEND_IP;
const BASE_URL = `http://${API_ENDPOINT_URL}`;

const axiosInstance: AxiosInstance = axios.create({
	baseURL: BASE_URL,
	headers: {
		"Content-Type": "application/json",
	},
});

axiosInstance.interceptors.request.use(
	(request) => {
		const [accessToken, refreshToken] = getStoredTokens();
		if (accessToken) {
			request.headers.Authorization = `Bearer ${accessToken}`;
			setSession(accessToken, refreshToken);
		}
		return request;
	},
	(error) => {
		return Promise.reject(error);
	},
);

axiosInstance.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;
		if (
			error.response.status === 401 ||
			(error.response.status === 500 && !originalRequest._retry)
		) {
			originalRequest._retry = true;
			try {
				const refreshToken = localStorage.getItem("refresh_token");

				const response = await axios.post(`http://${API_ENDPOINT_URL}/api/auth/refresh`, {
					refreshToken,
				});

				const { access_token, refresh_token: newRefreshToken } = response.data;

				localStorage.setItem("access_token", access_token);
				localStorage.setItem("refresh_token", newRefreshToken);

				axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
				return axiosInstance(originalRequest);
			} catch (refreshError) {
				console.error("Falha ao utilizar refreshtoken:", refreshError);
				logout();
				window.location.href = "/login";
				return Promise.reject(refreshError);
			}
		}
		return Promise.reject(error);
	},
);

export default axiosInstance;
