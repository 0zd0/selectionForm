import { DefaultAPIInstance } from "@/api/wp"


export type AcfFieldTypes = 'group' | 'number' | 'select'


export type AcfConditionalLogicItem = {
	field: string
	operator: string
	value: string
}

export type IAcfConditionalLogicOr = AcfConditionalLogicItem[]

export type AcfConditionalLogic = IAcfConditionalLogicOr[]

export interface IAcfSchemaField {
	type: AcfFieldTypes
	required: boolean
	key: string
	label: string
	conditional_logic?: AcfConditionalLogic
}

export interface IAcfSchemaFieldNumber extends IAcfSchemaField {
	type: 'number'
}

export type AcfSchemaFieldSelectChoices = {
	[key: string]: string
}

export interface IAcfSchemaFieldSelect extends IAcfSchemaField {
	type: 'select'
	choices: AcfSchemaFieldSelectChoices
}

export interface IAcfSchemaFieldGroup extends IAcfSchemaField {
	type: 'group'
	properties: {
		[key: string]: AcfSchemaFields
	}
}

export type AcfSchemaFields = IAcfSchemaFieldNumber | IAcfSchemaFieldSelect | IAcfSchemaFieldGroup


export interface IAcfSchema {
	[key: string]: AcfSchemaFields
}

export interface IAcfSchemaError {
	code: 'no_group' | 'no_term'
	message: string
	data: {
		status: number
	}
}

export type AcfGetSchemaResponse = IAcfSchemaError | IAcfSchema


export const AcfApi = {
	async getSchema(category_id: number): Promise<IAcfSchema | null> {
		const url = `wp-json/selection-form/v1/selection-form/acf-schema?category_id=${category_id}`
		try {
			const response = await DefaultAPIInstance.get<AcfGetSchemaResponse>(url)
			const data = response.data
			return 'code' in data ? null : data
		}
		catch (e) {
			console.error(e)
			return null
		}
	},
}