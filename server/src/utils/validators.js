// Remove caracteres não numéricos
const cleanCPF = (cpf) => cpf.replace(/[^\d]+/g, '');

const validateCPF = (cpf) => {
    if (!cpf) return false;
    const clean = cleanCPF(cpf);

    if (clean.length !== 11 || !!clean.match(/(\d)\1{10}/)) return false;

    const cpfArray = clean.split('').map(el => +el);
    
    const rest = (count) => (cpfArray.slice(0, count - 12)
        .reduce((soma, el, index) => (soma + el * (count - index)), 0) * 10) % 11 % 10;

    return rest(10) === cpfArray[9] && rest(11) === cpfArray[10];
};

module.exports = {
    validateCPF,
    cleanCPF
};