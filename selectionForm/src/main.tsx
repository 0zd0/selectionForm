import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { FiltersProvider } from "@/contexts/filters/provider.tsx"

document.querySelectorAll('.selection-form').forEach(el => {
	ReactDOM.createRoot(el!).render(
		<React.StrictMode>
			<FiltersProvider>
				<App/>
			</FiltersProvider>
		</React.StrictMode>,
	)
})
