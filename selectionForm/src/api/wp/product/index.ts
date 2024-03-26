import { DefaultAPIInstance } from "@/api/wp"


export interface IWpProduct {
	id: number
	post_title: string
	post_content: string
	post_link: string
	post_image: string
}

export type ProductsGetResponse = IWpProduct[]


export const ProductApi = {
	async get(category_id: number | null, filters: object = {}): Promise<ProductsGetResponse> {
		const url = `wp-json/selection-form/v1/selection-form/products`
		const data = {
			category_id,
			filters
		}
		const response = await DefaultAPIInstance.post(url, data)
		return response.data
	},
}