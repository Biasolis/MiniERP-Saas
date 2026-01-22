import styled from 'styled-components';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet, Users, Settings, LogOut } from 'lucide-react';

const SidebarContainer = styled.aside`
  width: 260px;
  height: 100vh;
  background-color: #fff;
  border-right: 1px solid #e1e4e8;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 10;
`;

const LogoArea = styled.div`
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  font-weight: bold;
  font-size: 1.2rem;
  color: ${props => props.theme.colors.primary};
  border-bottom: 1px solid #f0f0f0;
`;

const Nav = styled.nav`
  flex: 1;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

// Estilizando o NavLink do React Router
const StyledLink = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  text-decoration: none;
  color: #64748b; // Cor neutra para inativo
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background-color: #f8fafc;
    color: ${props => props.theme.colors.primary};
  }

  /* Classe automática do React Router quando a rota está ativa */
  &.active {
    background-color: ${props => props.theme.colors.primary}15; /* 15% opacidade */
    color: ${props => props.theme.colors.primary};
  }
`;

export function Sidebar() {
  return (
    <SidebarContainer>
      <LogoArea>Finance SaaS</LogoArea> {/* Aqui viria a Logo do Cliente (Whitelabel) */}
      
      <Nav>
        <StyledLink to="/app/dashboard">
          <LayoutDashboard size={20} />
          Dashboard
        </StyledLink>
        
        <StyledLink to="/app/financeiro">
          <Wallet size={20} />
          Financeiro
        </StyledLink>

        <StyledLink to="/app/clientes">
          <Users size={20} />
          Clientes & Fornecedores
        </StyledLink>

        <StyledLink to="/app/configuracoes">
          <Settings size={20} />
          Configurações
        </StyledLink>
      </Nav>

      <div style={{ padding: 16 }}>
        <StyledLink to="/login" as="div" style={{ cursor: 'pointer', color: '#dc3545' }}>
          <LogOut size={20} />
          Sair
        </StyledLink>
      </div>
    </SidebarContainer>
  );
}