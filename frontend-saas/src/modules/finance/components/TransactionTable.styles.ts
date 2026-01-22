import styled from 'styled-components';

export const TableContainer = styled.div`
  width: 100%;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden; /* Para as bordas arredondadas funcionarem */
  border: 1px solid #e1e4e8;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
`;

export const Thead = styled.thead`
  background-color: #f8fafc;
  border-bottom: 2px solid #e1e4e8;
`;

export const Th = styled.th<{ align?: 'left' | 'right' | 'center' }>`
  padding: 16px;
  text-align: ${props => props.align || 'left'};
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
`;

export const Tr = styled.tr`
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.2s;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: ${props => props.theme.colors.primary}08; /* 8% de opacidade da cor da empresa */
  }
`;

export const Td = styled.td<{ align?: 'left' | 'right' | 'center'; type?: 'INCOME' | 'EXPENSE' }>`
  padding: 16px;
  text-align: ${props => props.align || 'left'};
  color: #334155;

  /* Lógica para colorir o valor financeiro */
  ${props => props.type === 'INCOME' && `
    color: ${props.theme.colors.success};
    font-weight: 600;
  `}
  
  ${props => props.type === 'EXPENSE' && `
    color: ${props.theme.colors.danger};
    font-weight: 600;
  `}
`;

// Badge para o Status (Pendente/Pago)
export const StatusBadge = styled.span<{ status: 'COMPLETED' | 'PENDING' | 'CANCELLED' }>`
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  
  ${props => props.status === 'COMPLETED' && `
    background-color: #dcfce7;
    color: #166534;
  `}
  
  ${props => props.status === 'PENDING' && `
    background-color: #fef9c3;
    color: #854d0e;
  `}

  ${props => props.status === 'CANCELLED' && `
    background-color: #fee2e2;
    color: #991b1b;
  `}
`;