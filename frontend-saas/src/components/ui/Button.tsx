import styled from 'styled-components';

interface ButtonProps {
  variant?: 'primary' | 'danger' | 'success';
}

export const Button = styled.button<ButtonProps>`
  /* Acessando as props do tema dinâmico */
  background-color: ${(props) => 
    props.variant === 'danger' ? props.theme.colors.danger :
    props.variant === 'success' ? props.theme.colors.success :
    props.theme.colors.primary};
  
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }
`;