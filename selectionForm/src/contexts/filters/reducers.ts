import { FiltersContextType } from "@/contexts/filters/context.ts"

type Filter = {
	key: string
	value: string | number | Filter
}

export type FiltersAction = {
	type: 'ADD_FILTER' | 'DELETE_FILTER'
	payload: Filter
}

export const filtersReducer = (state: FiltersContextType, action: FiltersAction): FiltersContextType => {
	switch (action.type) {
		case 'ADD_FILTER':
			console.log(action.payload)
			return {
				...state,
				[action.payload.key]: action.payload.value
			}
		case 'DELETE_FILTER':
			const newState = { ...state }
			delete newState[action.payload.key]
			return newState
		default:
			return state
	}
}

export default filtersReducer
