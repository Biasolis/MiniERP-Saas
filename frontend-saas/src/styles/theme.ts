// Define a interface do que é configurável
export interface ThemeType {
  colors: {
    primary: string;    // Vem do banco (theme_config.primaryColor)
    secondary: string;
    background: string;
    text: string;
    success: string;    // Verde financeiro
    danger: string;     // Vermelho financeiro
  };
}

// Tema Padrão (Fallback caso o banco falhe ou seja o primeiro load)
export const defaultTheme: ThemeType = {
  colors: {
    primary: '#0056b3', // Azul padrão
    secondary: '#6c757d',
    background: '#f4f6f9', // Cinza bem claro (estilo ERP)
    text: '#333333',
    success: '#28a745',
    danger: '#dc3545',
  },
};