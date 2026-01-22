import { Outlet } from 'react-router-dom';
import styled from 'styled-components';
import { Sidebar } from './Sidebar';

const LayoutWrapper = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: ${props => props.theme.colors.background};
`;

const MainContent = styled.main`
  flex: 1;
  margin-left: 260px; /* Mesma largura da Sidebar */
  padding: 32px;
  overflow-y: auto;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  color: ${props => props.theme.colors.text};
`;

export function DashboardLayout() {
  return (
    <LayoutWrapper>
      <Sidebar />
      <MainContent>
        {/* Header fixo de cada página ou global */}
        <Header>
          <Title>Visão Geral</Title>
          <div>
            {/* Aqui entra Avatar do Usuário / Notificações */}
            <span>Olá, Usuário</span> 
          </div>
        </Header>

        {/* Aqui é onde as rotas filhas são renderizadas */}
        <Outlet /> 
      </MainContent>
    </LayoutWrapper>
  );
}