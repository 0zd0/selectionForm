import {
	Box,
	Button,
	Container,
	css, Divider,
	Grid, GridItem,
	Heading,
	Link,
	NumberInput,
	NumberInputField,
} from '@chakra-ui/react'
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
  margin-bottom: 30px;
  width: 100%;
`

const DefaultSelect = styled(Select)(props => (
	css({
		bg: '#fff',
		color: '#000',
		fontSize: '16px',
		paddingY: '0 !important',
		borderRadius: '0 !important'
	})(props.theme)
))

DefaultSelect.defaultProps = {
	iconColor: '#000',
}

const DefaultGridItem = styled(GridItem)(props => (
	css({
		w: '100%',
		display: 'flex',
		alignItems: 'flex-end'
	})(props.theme)
))

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

const findFilterKeysDependingOnConditionalLogic = ( schema: {
	[key: string]: AcfSchemaFields
}, key: string ): string[] => {
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

const clearFilterKeysDependingOnConditionalLogic = ( schema: {
	[key: string]: AcfSchemaFields
}, key: string, dispatch: Dispatch<FiltersAction> ) => {
	const filterKeys = findFilterKeysDependingOnConditionalLogic(schema, key)
	for (const filterKey of filterKeys) {
		dispatch({
			type: 'DELETE_FILTER', payload: {
				key: filterKey,
				value: ''
			}
		})
	}
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
			<VStack
				alignItems={'flex-start'}
				w={'100%'}
			>
				<Text 
					fontSize='sm' 
					m={0}
					color={'#fff'}
				>{field.label}</Text>
				<DefaultSelect
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
				</DefaultSelect>
			</VStack>
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
			<HStack
				justifyContent={'space-between'}
				w={'100%'}
			>
				<Text
					fontSize='sm'
					m={0}
					color={'#fff'}
				>{field.label}</Text>
				<HStack
					spacing={'10px 10px'}
					w={'50%'}
					flex={'0 0 auto'}
					h={'100%'}
					// wrap={'wrap'}
				>
					{Object.keys(fields).map(( childKey ) => {
						const field = fields[childKey]
						const FieldComponent = getFieldComponent(field, `${fieldKey}_${childKey}`, schema, filters)
						if (!FieldComponent) return;
						return (
							<HStack
								key={field.key}
								h={'100%'}
							>
								{FieldComponent}
							</HStack>
						)
					})}
				</HStack>
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
			{/*<Text fontSize='xs' m={0}>{field.label}</Text>*/}
			<NumberInput
				size={'sm'}
				inputMode={'numeric'}
				min={min} isValidCharacter={(value => /^[0-9]+$/.test(value))}
				onChange={( value ) => changeInput(value)}
				h={'100%'}
			>
				<NumberInputField
					placeholder={field.label}
					p={'5px 5px'}
					bg={'#fff'}
					color={'#000'}
					borderRadius={'0'}
					minH={'40px'}
				/>
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
			<Container
				maxW='1440px'
			>
				<Form
				>
					<Box
						alignItems={'flex-start'}
					>
						<Heading
							as='h2'
							size='lg'
							textAlign={'center'}
							fontWeight={400}
							w={'100%'}
							textTransform={'uppercase'}
							m={'0 !important'}
							color={'#fff'}
						>
							Выберите тип станка и необходимые характеристики
						</Heading>
						<VStack
							w={'100%'}
							mb={'60px'}
							mt={'26px'}
						>
							<Divider
								w={'80%'}
								borderWidth={'1px'}
								opacity={1}
							/>
						</VStack>
						<Grid templateColumns={{base: 'repeat(1, 1fr)', md: 'repeat(3, 1fr)'}} gap={'30px 60px'} w={'100%'}>
							{parentCategories.length > 0 &&
                                <DefaultGridItem>
                                    <VStack
                                        alignItems={'flex-start'}
                                        w={'100%'}
                                    >
                                        <Text
											fontSize='sm'
											m={0}
                                            color={'#fff'}
										>Категория</Text>
                                        <DefaultSelect
                                            onChange={( e ) => changeParentCategory(e.target.value)}
                                            value={selectedParentCategory ? selectedParentCategory : ''}
                                        >
                                            <option value={''}>Не выбрано</option>
											{parentCategories.map(category => (
												<option value={category.id} key={category.id}>{category.name}</option>
											))}
                                        </DefaultSelect>
                                    </VStack>
                                </DefaultGridItem>
							}
							{childCategories.length > 0 &&
                                <DefaultGridItem>
                                    <VStack
                                        alignItems={'flex-start'}
                                        w={'100%'}
                                    >
                                        <Text
											fontSize='sm'
											m={0}
                                            color={'#fff'}
										>Подкатегория</Text>
                                        <DefaultSelect
                                            onChange={( e ) => changeChildCategory(e.target.value)}
                                            value={selectedChildCategory ? selectedChildCategory : ''}
                                            fontSize={'16px'}

                                        >
                                            <option value={''}>Не выбрано</option>
											{childCategories.map(category => (
												<option value={category.id} key={category.id}>{category.name}</option>
											))}
                                        </DefaultSelect>
                                    </VStack>
                                </DefaultGridItem>
							}
							{acfSchema && Object.keys(acfSchema).map(( key ) => {
								const field = acfSchema[key]
								const FieldComponent = getFieldComponent(field, key, acfSchema, filters)
								if (!FieldComponent) return;
								return (
									<DefaultGridItem
										key={field.key}
									>
										{FieldComponent}
									</DefaultGridItem>
								)
							})}
						</Grid>
						<HStack
							marginTop={'80px'}
							justifyContent={'center'}
							spacing={'96px'}
						>
							<Button
								onClick={() => getProducts()}
								borderRadius={0}
								className={'selection-form__button'}
								textTransform={'uppercase'}
							>Подобрать</Button>
							<Link
								className={'selection-form__button--gray'}
								href={'#'}
								textTransform={'uppercase'}
							>Заказать консультацию</Link>
						</HStack>

					</Box>
				</Form>
				{products?.length === 0 && <Text
					fontSize='sm'
					marginY={10}
                    color={'#fff'}
				>Не найдено</Text>}
				{products && products.length > 0 &&
                    <>
                        <ul className="products columns-1">
							{products.map(( product, index ) => {
								return (
									<>
										<li
											key={index}
											className="ast-grid-common-col ast-full-width ast-article-post remove-featured-img-padding desktop-align-left tablet-align-left mobile-align-left product type-product post-814 status-publish first instock product_cat-29 has-post-thumbnail shipping-taxable product-type-simple">
											<div className="astra-shop-thumbnail-wrap"><a
												href={product.post_link}
												className="woocommerce-LoopProduct-link woocommerce-loop-product__link"></a>
											</div>
											<div className="product-item__box">
												<div className="product-item__info">
													<a href={product.post_link}
													   className="ast-loop-product__link"><h2
														className="woocommerce-loop-product__title">{product.post_title}</h2>
													</a>
													<div className="ast-woo-shop-product-description"
														 dangerouslySetInnerHTML={{__html: product.post_content}}>
													</div>
												</div>
												<div className="product-item__right">
													<div className="product-item__img">
														<img
															src={product.post_image}
															className="attachment-woocommerce_thumbnail size-woocommerce_thumbnail"
															alt="" decoding="async"
														/></div>
													<div className="product-item__btns">
														<a href="#" className="btn--primary">УЗНАТЬ ЦЕНУ</a>
														<a href={product.post_link}
														   className="btn--gray">ПОДРОБНЕЕ</a>
													</div>
												</div>
											</div>
										</li>
									</>
								)
							})}
                        </ul>
                    </>
				}
			</Container>
		</>
	)
}

export default FormComponent