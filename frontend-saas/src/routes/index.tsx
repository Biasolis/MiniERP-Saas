import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';

// Placeholders para as páginas (vamos criar depois)
const DashboardPage = () => <div><h2>Gráficos e Indicadores</h2></div>;
const FinancePage = () => <div><h2>Extrato e Transações</h2></div>;
const LoginPage = () => <div style={{display:'flex', justifyContent:'center', marginTop: 100}}><h1>Tela de Login</h1></div>;

export default function Router() {
  const isAuthenticated = true; // Simulação: depois virá do Zustand

  return (
    <Routes>
      {/* Rota Pública */}
      <Route path="/login" element={<LoginPage />} />

      {/* Rotas Protegidas (SaaS) */}
      <Route path="/app" element={isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" />}>
        {/* O "index" renderiza quando acessa /app/ */}
        <Route index element={<Navigate to="dashboard" />} /> 
        
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="financeiro" element={<FinancePage />} />
        {/* Adicionar mais rotas aqui conforme o sistema cresce */}
      </Route>

      {/* Redirecionamento padrão da raiz */}
      <Route path="*" element={<Navigate to="/app/dashboard" />} />
    </Routes>
  );
}