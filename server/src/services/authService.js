// server/src/services/authService.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db'); // Importa para acessar o pool
const userRepository = require('../repositories/userRepository');
const companyRepository = require('../repositories/companyRepository');
const { validateCPF, cleanCPF } = require('../utils/validators');

class AuthService {
    /**
     * Registra uma nova EMPRESA e o primeiro USUÁRIO (Admin)
     * Operação Atômica (Transaction)
     */
    async register(data) {
        const { 
            // Dados da Empresa
            tradeName, legalName, document, 
            // Dados do Usuário
            name, email, password, cpf 
        } = data;

        // 1. Validações Iniciais
        if (!tradeName || !document || !name || !email || !password || !cpf) {
            throw new Error('Todos os campos obrigatórios devem ser preenchidos.');
        }

        if (!validateCPF(cpf)) throw new Error('CPF do administrador inválido.');
        const cleanedCPF = cleanCPF(cpf);
        const cleanedCNPJ = document.replace(/\D/g, ''); // Limpa CNPJ

        // 2. Verificações de Duplicidade (Fail Fast)
        const existingEmail = await userRepository.findByEmail(email);
        if (existingEmail) throw new Error('E-mail já cadastrado no sistema.');

        const existingCompany = await companyRepository.findByDocument(cleanedCNPJ);
        if (existingCompany) throw new Error('Empresa (CNPJ) já cadastrada.');

        // 3. Início da Transação (Atomicidade)
        const client = await db.pool.connect();
        
        try {
            await client.query('BEGIN'); // Inicia transação

            // A. Cria a Empresa
            const newCompany = await companyRepository.create(client, {
                tradeName,
                legalName: legalName || tradeName,
                document: cleanedCNPJ
            });

            // B. Hash da Senha
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            // C. Cria o Usuário Admin vinculado à Empresa
            const newUser = await userRepository.create(client, {
                companyId: newCompany.id,
                name,
                email,
                passwordHash,
                cpf: cleanedCPF,
                role: 'ADMIN' // Primeiro usuário é sempre Admin
            });

            await client.query('COMMIT'); // Confirma transação

            return {
                company: newCompany,
                user: newUser
            };

        } catch (error) {
            await client.query('ROLLBACK'); // Desfaz tudo se der erro
            console.error('Erro no registro SaaS:', error);
            throw new Error('Falha ao criar conta corporativa: ' + error.message);
        } finally {
            client.release(); // Libera conexão
        }
    }

    async login(email, password) {
        // 1. Busca Usuário e Dados da Empresa (via Join)
        const user = await userRepository.findByEmail(email);
        
        if (!user) {
            throw new Error('Credenciais inválidas.');
        }

        // 2. Verifica Status da Conta e Empresa
        if (!user.is_active) throw new Error('Usuário desativado.');
        if (!user.company_active) throw new Error('Acesso da empresa suspenso. Contate o suporte.');

        // 3. Verifica Senha
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            throw new Error('Credenciais inválidas.');
        }

        // 4. Gera Token JWT com Payload SaaS
        // Payload enriquecido para evitar queries desnecessárias
        const tokenPayload = {
            id: user.id,
            email: user.email,
            companyId: user.company_id, // CRÍTICO: Tenant ID
            role: user.role             // Controle de Acesso
        };

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        return {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                companyId: user.company_id
            }
        };
    }
}

module.exports = new AuthService();