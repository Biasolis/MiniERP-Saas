import Dashboard from './views/Dashboard.js';
import Investments from './views/Investments.js';
import Settings from './views/Settings.js'; // <--- NOVO
import Login from './views/Login.js';
import Register from './views/Register.js';
import { auth } from './utils/auth.js';

const routes = {
    '/': Dashboard,
    '/investments': Investments,
    '/settings': Settings, // <--- NOVO
    '/login': Login,
    '/register': Register
};

export const router = async () => {
    const app = document.getElementById('app');
    
    let path = window.location.pathname;
    
    const publicRoutes = ['/login', '/register'];
    const isPublic = publicRoutes.includes(path);

    if (!auth.isAuthenticated() && !isPublic) {
        path = '/login';
        window.history.replaceState(null, null, path);
    } else if (auth.isAuthenticated() && isPublic) {
        path = '/';
        window.history.replaceState(null, null, path);
    }

    const ViewClass = routes[path] || (auth.isAuthenticated() ? Dashboard : Login);
    const view = new ViewClass();

    app.innerHTML = await view.getHtml();
    
    if (view.execute) {
        await view.execute();
    }
};

export const navigateTo = (url) => {
    window.history.pushState(null, null, url);
    router();
};

window.addEventListener('popstate', router);

document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', e => {
        if (e.target.matches('[data-link]')) {
            e.preventDefault();
            navigateTo(e.target.getAttribute('href'));
        }
    });
    
    window.addEventListener('navigate', (e) => {
        navigateTo(e.detail);
    });

    router();
});