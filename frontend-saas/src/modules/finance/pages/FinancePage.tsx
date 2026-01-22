import { useState } from 'react';
import styled from 'styled-components';
import { TransactionTable } from '../components/TransactionTable';
import { NewTransactionModal } from '../components/NewTransactionModal';
import { Transaction } from '../../../types/Transaction';

// =========================================================
// ESTILOS DA PÁGINA (LOCAL STYLES)
// =========================================================

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h2`
  font-size: 1.75rem;
  color: ${props => props.theme.colors.text};
  font-weight: 700;
`;

const AddButton = styled.button`
  background-color: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    opacity: 0.9;
  }
`;

// =========================================================
// DADOS MOCKADOS (SIMULAÇÃO DO BANCO DE DADOS)
// =========================================================

const MOCK_DATA: Transaction[] = [
  {
    id: '1',
    description: 'Desenvolvimento de Site',
    amount: 5000.00,
    type: 'INCOME',
    status: 'COMPLETED',
    date: '2025-10-27T10:00:00.000Z',
    category: 'Vendas de Serviço',
    account: 'Banco Inter'
  },
  {
    id: '2',
    description: 'Servidor AWS',
    amount: 150.50,
    type: 'EXPENSE',
    status: 'PENDING',
    date: '2025-11-05T14:30:00.000Z',
    category: 'Infraestrutura',
    account: 'Cartão Nubank'
  },
  {
    id: '3',
    description: 'Café da Equipe',
    amount: 45.90,
    type: 'EXPENSE',
    status: 'COMPLETED',
    date: '2025-11-02T09:15:00.000Z',
    category: 'Alimentação',
    account: 'Caixa Pequeno'
  },
  {
    id: '4',
    description: 'Licença Software ERP',
    amount: 299.90,
    type: 'EXPENSE',
    status: 'COMPLETED',
    date: '2025-11-01T08:00:00.000Z',
    category: 'Software',
    account: 'Banco Inter'
  },
  {
    id: '5',
    description: 'Consultoria Financeira',
    amount: 2500.00,
    type: 'INCOME',
    status: 'PENDING',
    date: '2025-11-10T16:00:00.000Z',
    category: 'Consultoria',
    account: 'Banco Inter'
  }
];

// =========================================================
// COMPONENTE DA PÁGINA
// =========================================================

export function FinancePage() {
  // Estado para controlar a abertura/fechamento do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estado para armazenar a lista de transações (Inicializado com o Mock)
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_DATA);

  // Funções de Controle do Modal
  function handleOpenModal() {
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
  }

  // Função chamada quando o usuário clica em "Salvar" no Modal
  function handleNewTransaction(transactionInput: Omit<Transaction, 'id' | 'status'>) {
    // Cria um objeto de transação completo
    const newTransaction: Transaction = {
      id: Math.random().toString(), // Gera um ID temporário
      status: 'PENDING', // Status padrão
      ...transactionInput,
      // Garante que a data seja string ISO caso venha como objeto Date
      date: typeof transactionInput.date === 'string' 
        ? transactionInput.date 
        : new Date().toISOString()
    };

    // Atualiza a lista adicionando o novo item no topo
    setTransactions(oldTransactions => [newTransaction, ...oldTransactions]);
  }

  // Handlers para os botões de ação da tabela (apenas logs por enquanto)
  function handleEdit(id: string) {
    console.log(`Editando transação ID: ${id}`);
    // Futuro: Abrir modal com os dados preenchidos
  }

  function handleDelete(id: string) {
    console.log(`Deletando transação ID: ${id}`);
    if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
        setTransactions(old => old.filter(t => t.id !== id));
    }
  }

  return (
    <Container>
      {/* Cabeçalho da Página */}
      <PageHeader>
        <Title>Transações Financeiras</Title>
        <AddButton onClick={handleOpenModal}>
          + Nova Transação
        </AddButton>
      </PageHeader>

      {/* Tabela de Listagem */}
      <TransactionTable 
        data={transactions}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Modal de Cadastro (Fica oculto até isModalOpen ser true) */}
      <NewTransactionModal 
        isOpen={isModalOpen}
        onRequestClose={handleCloseModal}
        onSave={handleNewTransaction}
      />
    </Container>
  );
}