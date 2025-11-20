const jwt = require('jsonwebtoken');
const token = jwt.sign({ service: 'service-a' }, 'MINHA_CHAVE_DE_ASSINATURA', { expiresIn: '1h' });
console.log(token);