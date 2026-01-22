import styled from 'styled-components';

export const Overlay = styled.div`
  background: rgba(0, 0, 0, 0.5); /* Fundo escurecido */
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
  backdrop-filter: blur(2px); /* Efeito "vidro" moderno */
`;

export const ModalContainer = styled.div`
  background: white;
  width: 100%;
  max-width: 500px; /* Largura ideal para formulários médios */
  padding: 32px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  position: relative;
`;

export const ModalHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  h2 {
    font-size: 1.25rem;
    color: ${props => props.theme.colors.text};
  }

  button {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    color: #64748b;
    cursor: pointer;
    
    &:hover { color: #333; }
  }
`;

export const FormGroup = styled.div`
  margin-bottom: 16px;
  
  label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #64748b;
    margin-bottom: 8px;
  }

  input, select {
    width: 100%;
    padding: 12px;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    font-size: 1rem;
    background: #f8fafc;
    transition: border-color 0.2s;

    &:focus {
      outline: none;
      border-color: ${props => props.theme.colors.primary};
      background: #fff;
    }
  }
`;

// Botão de Radio customizado para "Receita vs Despesa"
export const TransactionTypeContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 24px;
`;

interface RadioBoxProps {
  isActive: boolean;
  activeColor: string;
}

export const RadioBox = styled.button<RadioBoxProps>`
  height: 48px;
  border: 1px solid #d7d7d7;
  border-radius: 6px;
  background: ${(props) => props.isActive ? props.activeColor + '15' : 'transparent'}; /* 15% opacidade no fundo */
  border-color: ${(props) => props.isActive ? props.activeColor : '#d7d7d7'};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;

  span {
    font-weight: 600;
    color: ${(props) => props.isActive ? props.activeColor : '#363f5f'};
  }
`;