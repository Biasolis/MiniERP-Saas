import { masks } from '../utils/masks.js';

export class Modal {
    static _createModalBase(title, bodyContent, buttons) {
        return new Promise((resolve) => {
            const existingModal = document.querySelector('.modal-overlay');
            if (existingModal) existingModal.remove();

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';

            const box = document.createElement('div');
            box.className = 'modal-box';

            const header = document.createElement('div');
            header.className = 'modal-header';
            header.innerHTML = `<h3>${title}</h3>`;

            const body = document.createElement('div');
            body.className = 'modal-body';
            
            if (typeof bodyContent === 'string') {
                body.innerHTML = `<p>${bodyContent}</p>`;
            } else {
                body.appendChild(bodyContent);
            }

            const footer = document.createElement('div');
            footer.className = 'modal-footer';

            buttons.forEach(btnConfig => {
                const btn = document.createElement('button');
                btn.className = `btn-modal ${btnConfig.class}`;
                btn.textContent = btnConfig.text;
                btn.onclick = () => {
                    overlay.remove();
                    resolve(btnConfig.value);
                };
                footer.appendChild(btn);
            });

            box.appendChild(header);
            box.appendChild(body);
            box.appendChild(footer);
            overlay.appendChild(box);
            document.body.appendChild(overlay);

            const input = body.querySelector('input');
            if (input) input.focus();
        });
    }

    static async alert(title, message) {
        return this._createModalBase(title, message, [
            { text: 'OK', class: 'btn-modal-confirm', value: true }
        ]);
    }

    static async confirm(title, message, confirmText = 'Confirmar', danger = false) {
        return this._createModalBase(title, message, [
            { text: 'Cancelar', class: 'btn-modal-cancel', value: false },
            { text: confirmText, class: danger ? 'btn-modal-danger' : 'btn-modal-confirm', value: true }
        ]);
    }

    static async prompt(title, label, defaultValue = '', maskType = null) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `<label style="display:block; margin-bottom:0.5rem; font-size:0.9rem; color:#4b5563;">${label}</label>`;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = defaultValue;
        input.className = 'form-control'; // <--- CLASSE ADICIONADA AQUI

        if (maskType === 'currency') {
            input.addEventListener('input', (e) => {
                e.target.value = masks.currencyInput(e.target.value);
            });
        }

        wrapper.appendChild(input);

        return new Promise((resolve) => {
            this._createModalBase(title, wrapper, [
                { text: 'Cancelar', class: 'btn-modal-cancel', value: null },
                { text: 'Salvar', class: 'btn-modal-confirm', value: 'CONFIRM_FLAG' }
            ]).then(result => {
                if (result === 'CONFIRM_FLAG') {
                    resolve(input.value);
                } else {
                    resolve(null);
                }
            });

            input.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    document.querySelector('.btn-modal-confirm').click();
                }
            });
        });
    }
}