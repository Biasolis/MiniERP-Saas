import { Edit2, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Transaction } from '../../../types/Transaction';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { 
  TableContainer, Table, Thead, Tr, Th, Td, StatusBadge 
} from './TransactionTable.styles';

interface Props {
  data: Transaction[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TransactionTable({ data, onEdit, onDelete }: Props) {
  return (
    <TableContainer>
      <Table>
        <Thead>
          <tr>
            <Th>Descrição</Th>
            <Th>Categoria</Th>
            <Th>Data</Th>
            <Th>Status</Th>
            <Th align="right">Valor</Th>
            <Th align="right">Ações</Th>
          </tr>
        </Thead>
        <tbody>
          {data.map((item) => (
            <Tr key={item.id}>
              <Td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Ícone visual ajuda a escanear a lista rápido */}
                    {item.type === 'INCOME' 
                      ? <ArrowUpCircle size={18} color="#28a745" /> 
                      : <ArrowDownCircle size={18} color="#dc3545" />
                    }
                    <strong>{item.description}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.account}</div>
                </div>
              </Td>
              
              <Td>{item.category}</Td>
              
              <Td>{formatDate(item.date)}</Td>
              
              <Td>
                <StatusBadge status={item.status}>
                  {item.status === 'COMPLETED' ? 'Pago' : item.status === 'PENDING' ? 'Pendente' : 'Cancelado'}
                </StatusBadge>
              </Td>
              
              <Td align="right" type={item.type}>
                {item.type === 'EXPENSE' ? '- ' : '+ '}
                {formatCurrency(item.amount)}
              </Td>
              
              <Td align="right">
                <button 
                  onClick={() => onEdit(item.id)} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: 8, color: '#64748b' }}
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => onDelete(item.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}
                >
                  <Trash2 size={16} />
                </button>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </TableContainer>
  );
}