import { ThemeProvider } from 'styled-components';
import { BrowserRouter } from 'react-router-dom';
import { useThemeStore } from './store/useThemeStore';
import { GlobalStyles } from './styles/GlobalStyles'; // Seu Reset CSS
import Router from './routes'; // Suas rotas

function App() {
  const { currentTheme } = useThemeStore();

  return (
    <ThemeProvider theme={currentTheme}>
      <GlobalStyles />
      <BrowserRouter>
        <Router />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;