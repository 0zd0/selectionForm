import { Box, Button, Container, Heading, Link, NumberInput, NumberInputField, SimpleGrid } from '@chakra-ui/react'
import { Dispatch, PropsWithChildren, useEffect, useState } from "react"
import styled from '@emotion/styled'
import { CategoryApi, IWpCategory } from "@/api/wp/category"
import { HStack, VStack, Text, Select } from '@chakra-ui/react'
import {
	AcfApi,
	AcfSchemaFields,
	IAcfSchema,
	IAcfSchemaFieldGroup, IAcfSchemaFieldNumber,
	IAcfSchemaFieldSelect
} from "@/api/wp/acf"
import { FiltersContextType, useFiltersState } from "@/contexts/filters/context.ts"
import { FiltersAction } from "@/contexts/filters/reducers.ts"
import { IWpProduct, ProductApi } from "@/api/wp/product"

const Form = styled.form`
  width: 100%;
`

const findFieldKeysByKey = ( schema: { [key: string]: AcfSchemaFields }, key: string, filterKey: string = '' ): {
	fieldKey: string,
	filterKey: string
} | null => {
	for (const fieldKey in schema) {
		const field = schema[fieldKey]
		if (field.type === 'group') {
			const nestedKeys = findFieldKeysByKey(field.properties, key, filterKey !== '' ? `${filterKey}_${fieldKey}` : fieldKey)
			if (nestedKeys) {
				return nestedKeys
			}
		} else {
			if (schema[fieldKey].hasOwnProperty('key') && schema[fieldKey].key === key) {
				return {fieldKey, filterKey}
			}
		}
	}
	return null
}

const findFilterKeysDependingOnConditionalLogic = ( schema: { [key: string]: AcfSchemaFields }, key: string ): string[] => {
	const filterKeys: string[] = []
	for (const fieldKey in schema) {
		const field = schema[fieldKey]
		if (field.conditional_logic) {
			for (const or of field.conditional_logic) {
				for (const item of or) {
					if (item.field === key) {
						filterKeys.push(fieldKey)
					}
				}
			}
		}
	}
	return filterKeys
}

const clearFilterKeysDependingOnConditionalLogic = (schema: { [key: string]: AcfSchemaFields }, key: string, dispatch: Dispatch<FiltersAction>) => {
	const filterKeys = findFilterKeysDependingOnConditionalLogic(schema, key)
	for (const filterKey of filterKeys) {
		dispatch({
			type: 'DELETE_FILTER', payload: {
				key: filterKey,
				value: ''
			}
		})
	}
	console.log(filterKeys)
}

const getFieldComponent = ( field: AcfSchemaFields, key: string, schema: IAcfSchema, filters: FiltersContextType ) => {
	if (field.conditional_logic) {
		for (const or of field.conditional_logic) {
			for (const item of or) {
				const keys = findFieldKeysByKey(schema, item.field)
				if (!keys) return
				const {fieldKey} = keys
				if (!fieldKey || !(fieldKey in filters)) return
				if (item.operator === '==') {
					if (filters[fieldKey] !== item.value) return
				}
			}
		}
	}
	switch (field.type) {
		case "select":
			return <AcfFieldSelectComponent field={field} fieldKey={key} schema={schema}/>
		case "group":
			return <AcfFieldGroupComponent field={field} fieldKey={key} schema={schema}/>
		case "number":
			return <AcfFieldNumberComponent field={field} fieldKey={key} schema={schema}/>
		default:
			return
	}
}

interface AcfFieldDefaultProps {
	fieldKey: string
	schema: IAcfSchema
}

interface AcfFieldSelectProps extends PropsWithChildren, AcfFieldDefaultProps {
	field: IAcfSchemaFieldSelect
}

const changeFilter = ( value: string | number, fieldKey: string, dispatch: Dispatch<FiltersAction> ) => {
	if (value === '') {
		dispatch({
			type: 'DELETE_FILTER', payload: {
				key: fieldKey,
				value: value
			}
		})
	} else {
		dispatch({
			type: 'ADD_FILTER', payload: {
				key: fieldKey,
				value: value
			}
		})
	}
}

const AcfFieldSelectComponent = ( {field, fieldKey, schema}: AcfFieldSelectProps ) => {
	const {dispatch} = useFiltersState()
	const changeSelect = ( value: string ) => {
		clearFilterKeysDependingOnConditionalLogic(schema, field.key, dispatch)
		changeFilter(value, fieldKey, dispatch)
	}
	return (
		<>
			<Text fontSize='xs' m={0}>{field.label}</Text>
			<Select
				onChange={( e ) => changeSelect(e.target.value)}
				fontSize={'16px'}
			>
				<option value={''}>Не выбрано</option>
				{Object.keys(field.choices).map(key => {
					const choice = field.choices[key]
					return (
						<option value={key} key={key}>{choice}</option>
					)
				})}
			</Select>
		</>
	)
}

interface AcfFieldGroupProps extends PropsWithChildren, AcfFieldDefaultProps {
	field: IAcfSchemaFieldGroup
}

const AcfFieldGroupComponent = ( {field, fieldKey, schema}: AcfFieldGroupProps ) => {
	const {state: filters} = useFiltersState()
	const fields = field.properties
	return (
		<>
			<Text fontSize='sm' m={0}>{field.label}</Text>
			<HStack spacing={'10px 10px'} w={'100%'} wrap={'wrap'}>
				{Object.keys(fields).map(( childKey ) => {
					const field = fields[childKey]
					const FieldComponent = getFieldComponent(field, `${fieldKey}_${childKey}`, schema, filters)
					if (!FieldComponent) return;
					return (
						<div key={field.key}>
							{FieldComponent}
						</div>
					)
				})}
			</HStack>
		</>
	)
}

interface AcfFieldNumberProps extends PropsWithChildren, AcfFieldDefaultProps {
	field: IAcfSchemaFieldNumber
}

const AcfFieldNumberComponent = ( {field, fieldKey}: AcfFieldNumberProps ) => {
	const {dispatch} = useFiltersState()
	const changeInput = ( value: string ) => {
		changeFilter(Number(value) || '', fieldKey, dispatch)
	}
	const min = 0
	return (
		<>
			<Text fontSize='xs' m={0}>{field.label}</Text>
			<NumberInput
				size={'sm'}
				inputMode={'numeric'}
				min={min} isValidCharacter={(value => /^[0-9]+$/.test(value))}
				onChange={( value ) => changeInput(value)}
			>
				<NumberInputField/>
			</NumberInput>
		</>
	)
}

const FormComponent = () => {
	const [parentCategories, setParentCategories] = useState<IWpCategory[]>([])
	const [childCategories, setChildCategories] = useState<IWpCategory[]>([])
	const [selectedParentCategory, setSelectedParentCategory] = useState<null | number>(null)
	const [selectedChildCategory, setSelectedChildCategory] = useState<null | number>(null)
	const [acfSchema, setAcfSchema] = useState<IAcfSchema | null>(null)
	const [products, setProducts] = useState<IWpProduct[] | null>(null)
	const {state: filters} = useFiltersState()

	useEffect(() => {
		const fetchData = async () => {
			const categories = await CategoryApi.get()
			setParentCategories(categories)
		}
		fetchData().catch(console.error)
	}, [])

	const changeParentCategory = async ( rawValue: string ) => {
		if (rawValue === '') return setSelectedParentCategory(null)
		const value = Number(rawValue)
		setSelectedParentCategory(value)
		setAcfSchema(null)
		setSelectedChildCategory(null)
		setChildCategories([])

		const schema = await AcfApi.getSchema(value)
		setAcfSchema(schema)

		const childCategories = await CategoryApi.get(value)
		setChildCategories(childCategories)
	}

	const changeChildCategory = async ( rawValue: string ) => {
		setAcfSchema(null)
		let category: number | null = Number(rawValue)
		if (rawValue === '') {
			setSelectedChildCategory(null)
			category = selectedParentCategory
		} else {
			setSelectedChildCategory(category)
		}

		if (!category) return
		const schema = await AcfApi.getSchema(category)
		setAcfSchema(schema)
	}

	const getProducts = async () => {
		setProducts(null)
		console.log(filters)
		const category = selectedChildCategory || selectedParentCategory
		const products = await ProductApi.get(category, filters)
		setProducts(products)
	}

	return (
		<>
			<Container maxW='900px'>
				<Form>
					<VStack
						spacing={4}
						alignItems={'flex-start'}
					>
						<Heading as='h2' size='lg'>
							Выберите тип станков, а так же характеристики требуемого оборудования:
						</Heading>
						<HStack spacing='24px' w={'100%'}>
							{parentCategories.length > 0 &&
                                <VStack alignItems={'flex-start'}>
                                    <Text fontSize='sm' m={0}>Категория</Text>
                                    <Select
                                        onChange={( e ) => changeParentCategory(e.target.value)}
                                        value={selectedParentCategory ? selectedParentCategory : ''}
                                        fontSize={'16px'}

                                    >
                                        <option value={''}>Не выбрано</option>
										{parentCategories.map(category => (
											<option value={category.id} key={category.id}>{category.name}</option>
										))}
                                    </Select>
                                </VStack>
							}
							{childCategories.length > 0 &&
                                <VStack alignItems={'flex-start'}>
                                    <Text fontSize='sm' m={0}>Подкатегория</Text>
                                    <Select
                                        onChange={( e ) => changeChildCategory(e.target.value)}
                                        value={selectedChildCategory ? selectedChildCategory : ''}
                                        fontSize={'16px'}

                                    >
                                        <option value={''}>Не выбрано</option>
										{childCategories.map(category => (
											<option value={category.id} key={category.id}>{category.name}</option>
										))}
                                    </Select>
                                </VStack>
							}
						</HStack>
						<HStack spacing={'10px 24px'} w={'100%'} wrap={'wrap'}>
							{acfSchema && Object.keys(acfSchema).map(( key ) => {
								const field = acfSchema[key]
								const FieldComponent = getFieldComponent(field, key, acfSchema, filters)
								if (!FieldComponent) return;
								return (
									<div key={field.key}>
										{FieldComponent}
									</div>
								)
							})}
						</HStack>
						<Button
							onClick={() => getProducts()}
						>Подобрать</Button>
					</VStack>
				</Form>
				{products?.length === 0 && <Text fontSize='sm' marginY={10}>Таких товаров нет</Text>}
				{products && products.length > 0 &&
                    <SimpleGrid columns={4} spacing={'20px'} marginY={10}>
						{products.map(( product, index ) => {
							return (
								<>
									<Link target={'_blank'} href={product.post_link}>
										<Box bg={'#EDF2F7'} p={2} key={index}>
											<Text fontSize='lg' m={0}>{product.post_title}</Text>
											<Text fontSize='sm' dangerouslySetInnerHTML={{__html: product.post_content}} m={0}></Text>
										</Box>
									</Link>
								</>
							)
						})}
                    </SimpleGrid>
				}
			</Container>
		</>
	)
}

export default FormComponent