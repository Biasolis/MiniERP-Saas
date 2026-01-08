/**
 * Finance PWA - Entry Point
 * Responsável pela inicialização da aplicação, estilos globais e Service Worker.
 */

// Importa os estilos globais
import './style.css';

// Importa o Roteador (que gerencia a navegação e o DOMContentLoaded)
import { router } from './src/router.js';

// Inicialização
console.log('🚀 Finance PWA Initializing...');

/**
 * Registro do Service Worker (PWA)
 * Isso permite que o app funcione offline e seja instalável.
 * O arquivo sw.js deve estar na pasta public/ ou raiz do build.
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            // No Vite, em dev, o sw.js pode não existir ainda, mas em prod sim.
            // O registro é feito apontando para a raiz do servidor web.
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('✅ ServiceWorker registrado com sucesso:', registration.scope);
        } catch (error) {
            console.error('❌ Falha ao registrar ServiceWorker:', error);
        }
    });
}

// Tratamento global de erros não capturados (Segurança/Log)
window.addEventListener('error', (event) => {
    console.error('⚠️ Erro Global não tratado:', event.message);
    // Aqui poderíamos enviar o erro para um serviço de log remoto
});

// Tratamento de Rejeições de Promessas não tratadas
window.addEventListener('unhandledrejection', (event) => {
    console.error('⚠️ Promise rejeitada não tratada:', event.reason);
});