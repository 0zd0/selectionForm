import { FiltersContext } from "@/contexts/filters/context.ts"
import { FC, PropsWithChildren, useReducer } from "react"
import filtersReducer from "@/contexts/filters/reducers.ts"


export const FiltersProvider: FC<PropsWithChildren> = ( {children} ) => {
	const [state, dispatch] = useReducer(filtersReducer, {})
	return (
		<FiltersContext.Provider value={{state, dispatch}}>
			{children}
		</FiltersContext.Provider>
	)
}