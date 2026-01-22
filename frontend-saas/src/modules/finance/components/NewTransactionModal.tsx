import { useState, FormEvent } from 'react';
import { X, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useThemeStore } from '../../../store/useThemeStore'; // Para pegar as cores do tema
import { Overlay, ModalContainer, ModalHeader, FormGroup, TransactionTypeContainer, RadioBox } from '../../../components/ui/Modal.styles';
import { Button } from '../../../components/ui/Button'; // Aquele botão que criamos antes

interface NewTransactionModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSave: (data: any) => void;
}

export function NewTransactionModal({ isOpen, onRequestClose, onSave }: NewTransactionModalProps) {
  const { currentTheme } = useThemeStore();
  
  // Estado do Formulário
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE'); // Padrão é despesa (mais comum)
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Outros'); // Isso viria do backend
  const [account, setAccount] = useState('Conta Principal'); // Isso viria do backend

  if (!isOpen) return null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    
    // Convertendo string "R$ 1.200,50" para number 1200.50
    const numericAmount = Number(amount) || 0; 

    onSave({
      description,
      amount: numericAmount,
      type,
      category,
      account,
      date: new Date().toISOString(),
      status: 'PENDING' // Padrão
    });

    // Resetar campos
    setDescription('');
    setAmount('');
    onRequestClose();
  }

  return (
    <Overlay>
      <ModalContainer>
        <ModalHeader>
          <h2>Nova Transação</h2>
          <button onClick={onRequestClose}><X size={24} /></button>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          {/* 1. Toggle de Tipo */}
          <TransactionTypeContainer>
            <RadioBox
              type="button"
              isActive={type === 'INCOME'}
              activeColor={currentTheme.colors.success}
              onClick={() => setType('INCOME')}
            >
              <ArrowUpCircle size={20} color={currentTheme.colors.success} />
              <span>Entrada</span>
            </RadioBox>

            <RadioBox
              type="button"
              isActive={type === 'EXPENSE'}
              activeColor={currentTheme.colors.danger}
              onClick={() => setType('EXPENSE')}
            >
              <ArrowDownCircle size={20} color={currentTheme.colors.danger} />
              <span>Saída</span>
            </RadioBox>
          </TransactionTypeContainer>

          {/* 2. Descrição */}
          <FormGroup>
            <label>Descrição</label>
            <input 
              placeholder="Ex: Pagamento AWS" 
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
            />
          </FormGroup>

          {/* 3. Valor */}
          <FormGroup>
            <label>Valor</label>
            <input 
              type="number" 
              placeholder="0.00" 
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />
          </FormGroup>

          {/* 4. Grid de Categoria e Conta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormGroup>
              <label>Categoria</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option value="Infraestrutura">Infraestrutura</option>
                <option value="Pessoal">Pessoal</option>
                <option value="Vendas">Vendas</option>
              </select>
            </FormGroup>

            <FormGroup>
              <label>Conta / Cartão</label>
              <select value={account} onChange={e => setAccount(e.target.value)}>
                <option value="Nubank">Nubank</option>
                <option value="Inter">Inter</option>
                <option value="Caixa">Caixa</option>
              </select>
            </FormGroup>
          </div>

          <Button type="submit" style={{ width: '100%', marginTop: 16 }}>
            Confirmar Lançamento
          </Button>

        </form>
      </ModalContainer>
    </Overlay>
  );
}