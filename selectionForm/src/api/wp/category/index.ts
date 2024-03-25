import { DefaultAPIInstance } from "@/api/wp"


export interface IWpCategory {
	id: number
	count: number
	name: string
	slug: string
	parent: number
	link: string
	taxonomy: string
}

export type CategoryGetResponse = IWpCategory[]


export const CategoryApi = {
	async get(parent: number = 0, perPage: number = 100): Promise<CategoryGetResponse> {
		const url = `wp-json/wp/v2/product_cat?per_page=${perPage}&parent=${parent}`
		const response = await DefaultAPIInstance.get(url)
		return response.data
	},
}