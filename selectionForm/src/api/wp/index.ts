import axios from "axios"

export const DefaultConfig = {
	baseURL: import.meta.env.VITE_BASE_API_URL,
	headers: {
		'Content-Type': 'application/json',
	}
}

export const DefaultAPIInstance = axios.create(DefaultConfig)
