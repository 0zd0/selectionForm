import { createContext, Dispatch, useContext } from "react"
import { FiltersAction } from "@/contexts/filters/reducers.ts"


type NestedObject = {
	[key: string]: string | number | NestedObject
}

export type FiltersContextType = {
	[key: string]: string | number | NestedObject
}

export const FiltersContext = createContext<{state: FiltersContextType, dispatch: Dispatch<FiltersAction>}>({
	state: {},
	dispatch: () => null
})

export const useFiltersState = () => useContext(FiltersContext)
