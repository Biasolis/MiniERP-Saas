const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

class GeminiService {
    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            console.error("ERRO: GEMINI_API_KEY não encontrada no .env");
        }
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // MUDANÇA AQUI: Usando 'gemini-pro' (versão 1.0 estável) para garantir compatibilidade
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    }

    async generateFinancialAdvice(financialData) {
        try {
            const prompt = `
                Atue como um consultor financeiro pessoal experiente. Analise os dados financeiros abaixo e forneça 3 conselhos curtos, práticos e diretos em formato HTML simples (sem tags <html> ou <body>, apenas <p>, <strong>, <ul>, <li>).
                
                DADOS DO USUÁRIO:
                - Meta Financeira: R$ ${financialData.financialGoal}
                - Receitas (Mês): R$ ${financialData.income}
                - Despesas (Mês): R$ ${financialData.expense}
                - Saldo Atual: R$ ${financialData.balance}
                - Total Investido: R$ ${financialData.totalInvested}
                
                TOP GASTOS (Categorias):
                ${financialData.topExpenses && financialData.topExpenses.length > 0 
                    ? financialData.topExpenses.map(e => `- ${e.category}: R$ ${e.total}`).join('\n') 
                    : '- Nenhuma despesa registrada ainda.'}

                DIRETRIZES:
                1. Seja encorajador mas realista.
                2. Se o saldo for negativo, foque em redução de danos.
                3. Se sobrar dinheiro, sugira onde investir baseado no perfil conservador.
                4. Compare o progresso atual com a meta financeira.
                5. Use emojis moderadamente.
                6. Responda em Português do Brasil.
            `;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            return text;
        } catch (error) {
            console.error("Erro detalhado do Gemini:", error);
            // Fallback para não travar o frontend se a IA falhar
            return "<p>O consultor virtual está indisponível no momento. Por favor, verifique sua conexão ou tente novamente mais tarde.</p>";
        }
    }
}

module.exports = new GeminiService();