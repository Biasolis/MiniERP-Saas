export const masks = {
    // MÁSCARA DE INPUT (Para digitação: transforma 1600 em R$ 16,00 visualmente)
    cpf(value) {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    },

    currencyInput(value) {
        // Limpa tudo que não é dígito para calcular
        const cleanValue = value.replace(/\D/g, '');
        
        // Evita NaN se estiver vazio
        if (!cleanValue) return '';

        const numberValue = (Number(cleanValue) / 100);
        
        return numberValue.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    },

    // FORMATAÇÃO DE EXIBIÇÃO (Para valores vindos do Banco)
    formatCurrency(value) {
        if (value === null || value === undefined) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },
    
    // LIMPEZA CRÍTICA (Prepara para enviar ao Banco)
    // Transforma "R$ 1.600,00" ou "1.600,00" em "1600.00"
    cleanCurrency(value) {
        if (!value) return 0;
        
        // 1. Converte para string caso não seja
        const strValue = String(value);

        // 2. Remove TUDO que não for dígito (0-9), hífen (-) ou vírgula (,)
        // Isso elimina "R$", pontos de milhar, espaços e caracteres invisíveis
        const onlyNumbersAndComma = strValue.replace(/[^\d,-]/g, '');

        // 3. Troca a vírgula decimal por ponto (padrão Americano/SQL)
        // Ex: "1600,00" vira "1600.00"
        return onlyNumbersAndComma.replace(',', '.');
    }
};