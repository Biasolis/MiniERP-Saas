const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'a70f5d165c27a64834c0ccf3f9a659be';

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

const generateToken = (user) => {
  // Garante que o payload tenha dados compatíveis para Admin e Colaborador
  const payload = {
    id: user.id,
    // Normaliza para tenantId (padrão novo) mas mantemos tenant_id no middleware
    tenantId: user.tenant_id || user.tenantId, 
    role: user.role || 'agent', // Se não tiver role (admin antigo), assume agent
    name: user.name
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken
};