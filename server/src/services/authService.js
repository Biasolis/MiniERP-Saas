const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const { validateCPF, cleanCPF } = require('../utils/validators');

class AuthService {
    async register(userData) {
        const { name, email, password, cpf, financialGoal } = userData;

        // 1. Validações Básicas
        if (!name || !email || !password || !cpf) {
            throw new Error('Todos os campos são obrigatórios.');
        }

        // 2. Validação de CPF
        if (!validateCPF(cpf)) {
            throw new Error('CPF inválido.');
        }
        const cleanedCPF = cleanCPF(cpf);

        // 3. Verifica Duplicidade (Email ou CPF)
        const existingEmail = await userRepository.findByEmail(email);
        if (existingEmail) throw new Error('E-mail já cadastrado.');

        const existingCPF = await userRepository.findByCPF(cleanedCPF);
        if (existingCPF) throw new Error('CPF já cadastrado.');

        // 4. Hash da Senha
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 5. Persistência
        const newUser = await userRepository.create({
            name,
            email,
            passwordHash,
            cpf: cleanedCPF,
            financialGoal: financialGoal || 0
        });

        return newUser;
    }

    async login(email, password) {
        // 1. Busca Usuário
        const user = await userRepository.findByEmail(email);
        if (!user) {
            throw new Error('Credenciais inválidas.');
        }

        // 2. Verifica Senha
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            throw new Error('Credenciais inválidas.');
        }

        // 3. Gera Token JWT
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '8h' } // Token válido por um dia de trabalho
        );

        // Remove dados sensíveis do retorno
        delete user.password_hash;
        
        return { user, token };
    }
}

module.exports = new AuthService();