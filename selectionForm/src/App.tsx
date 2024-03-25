import './App.css'
import FormComponent from "@components/Form/Form.tsx"
import { ChakraProvider } from "@chakra-ui/react"

function App() {
	return (
		<>
			<ChakraProvider
				resetCSS={import.meta.env.DEV}
				disableGlobalStyle={import.meta.env.PROD}
			>
				<FormComponent/>
			</ChakraProvider>
		</>
	)
}

export default App
