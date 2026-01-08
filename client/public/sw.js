// Service Worker Básico
const CACHE_NAME = 'finance-pwa-v1';

self.addEventListener('install', (event) => {
    console.log('👷 Service Worker: Instalado');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('👷 Service Worker: Ativo');
});

self.addEventListener('fetch', (event) => {
    // Por enquanto, apenas repassa a requisição para a rede
    // Futuramente implementaremos cache offline aqui
    event.respondWith(fetch(event.request));
});