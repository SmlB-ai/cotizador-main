// cliente.js: Clase ClienteManager para gestión de clientes con localStorage

export class ClienteManager {
    constructor() {
        this.storageKey = 'cotizador_clientes';
        this.clientesCache = null;
        this.inicializarDB();
    }

    inicializarDB() {
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, JSON.stringify([]));
        }
    }

    refrescarCache() {
        this.clientesCache = null;
        return this.obtenerTodos();
    }

    obtenerTodos() {
        if (!this.clientesCache) {
            const clientes = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
            clientes.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
            this.clientesCache = clientes;
        }
        return this.clientesCache;
    }

    buscar(termino) {
        const terminoLower = (termino || '').toLowerCase();
        return this.obtenerTodos().filter(cliente =>
            (cliente.nombre && cliente.nombre.toLowerCase().includes(terminoLower)) ||
            (cliente.email && cliente.email.toLowerCase().includes(terminoLower))
        );
    }

    guardar(cliente) {
        const validacion = this.validarCliente(cliente);
        if (!validacion.esValido) {
            throw new Error(validacion.errores.join('\n'));
        }

        cliente.nombre = cliente.nombre?.trim();
        cliente.email = cliente.email?.trim() || '';
        cliente.telefono = cliente.telefono?.trim() || '';
        cliente.direccion = cliente.direccion?.trim() || '';
        cliente.tipo = cliente.tipo?.trim() || '';

        let clientes = this.obtenerTodos();

        const indiceExistente = clientes.findIndex(c =>
            (cliente.id && c.id === cliente.id) ||
            (cliente.email && c.email === cliente.email) ||
            (cliente.nombre && c.nombre === cliente.nombre && cliente.telefono && c.telefono === cliente.telefono)
        );

        const ahora = new Date().toISOString();

        if (indiceExistente >= 0) {
            clientes[indiceExistente] = {
                ...clientes[indiceExistente],
                ...cliente,
                actualizado: ahora
            };
        } else {
            clientes.push({
                id: this.generarId(),
                ...cliente,
                creado: ahora,
                actualizado: ahora
            });
        }

        this.guardarEnStorage(clientes);
        this.refrescarCache();
        return cliente;
    }

    eliminar(id) {
        let clientes = this.obtenerTodos();
        const indice = clientes.findIndex(c => c.id === id);

        if (indice >= 0) {
            clientes.splice(indice, 1);
            this.guardarEnStorage(clientes);
            this.refrescarCache();
            return true;
        }
        return false;
    }

    obtenerPorId(id) {
        return this.obtenerTodos().find(c => c.id === id) || null;
    }

    exportarCSV() {
        const clientes = this.obtenerTodos();
        const campos = ['nombre', 'tipo', 'direccion', 'telefono', 'email', 'creado', 'actualizado'];
        const csvContent = [
            campos.join(','), // Encabezados
            ...clientes.map(cliente =>
                campos.map(campo =>
                    `"${(cliente[campo] || '').toString().replace(/"/g, '""')}"`
                ).join(',')
            )
        ].join('\n');
        return csvContent;
    }

    importarCSV(csvContent) {
        const contenidoNormalizado = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const lineas = contenidoNormalizado.split('\n').filter(linea => linea.trim() !== '');

        if (lineas.length === 0) {
            throw new Error('El archivo está vacío');
        }

        const encabezados = lineas[0].split(',').map(e => e.trim());
        const resultado = {
            exitosos: 0,
            fallidos: 0,
            errores: []
        };

        for (let i = 1; i < lineas.length; i++) {
            try {
                const valores = this.parsearCSVLinea(lineas[i]);
                if (valores.length !== encabezados.length) continue;

                const cliente = {};
                encabezados.forEach((campo, index) => {
                    cliente[campo] = valores[index]?.trim() || '';
                });

                this.guardar(cliente);
                resultado.exitosos++;
            } catch (error) {
                resultado.fallidos++;
                resultado.errores.push(`Línea ${i + 1}: ${error.message}`);
            }
        }

        this.refrescarCache();
        return resultado;
    }

    validarCliente(cliente) {
        const errores = [];
        if (!cliente.nombre || cliente.nombre.trim().length < 2) {
            errores.push('El nombre debe tener al menos 2 caracteres');
        }
        if (cliente.email && !this.validarEmail(cliente.email)) {
            errores.push('El email no es válido');
        }
        if (cliente.telefono && !this.validarTelefono(cliente.telefono)) {
            errores.push('El teléfono no es válido');
        }
        return {
            esValido: errores.length === 0,
            errores
        };
    }

    guardarEnStorage(clientes) {
        localStorage.setItem(this.storageKey, JSON.stringify(clientes));
        this.clientesCache = clientes;
    }

    generarId() {
        return 'cli_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    validarEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    validarTelefono(telefono) {
        const re = /^[\d\s\-()]+$/;
        return re.test(telefono) && telefono.replace(/[^\d]/g, '').length >= 8;
    }

    parsearCSVLinea(linea) {
        const valores = [];
        let valor = '';
        let dentroDeCampo = false;

        for (let i = 0; i < linea.length; i++) {
            const char = linea[i];
            if (char === '"') {
                if (dentroDeCampo && linea[i + 1] === '"') {
                    valor += '"';
                    i++;
                } else {
                    dentroDeCampo = !dentroDeCampo;
                }
            } else if (char === ',' && !dentroDeCampo) {
                valores.push(valor);
                valor = '';
            } else {
                valor += char;
            }
        }
        valores.push(valor);
        return valores;
    }
}