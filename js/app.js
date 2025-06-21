import { generarPDF, armarDatosEmpresaParaPDF } from './pdf.js';

// ========== CONFIGURACIÓN DE TABS DINÁMICOS ==========
const tabFiles = {
    cliente: "pestañas/cliente/cliente.html",
    historial: "pestañas/historial/historial.html",
    materiales: "pestañas/materiales/materiales.html",
    calculadoras: "pestañas/calculadoras/calculadoras.html",
    configuracion: "pestañas/configuracion/configuracion.html",
    "panel-yeso": "pestañas/panel-yeso/panel-yeso.html",
};

async function loadTabContent(tabId) {
    const tabPane = document.getElementById(tabId);
    if (!tabPane) return;
    if (tabPane.dataset.loaded) return;

    const file = tabFiles[tabId];
    if (file) {
        const resp = await fetch(file);
        if (resp.ok) {
            tabPane.innerHTML = await resp.text();
            tabPane.dataset.loaded = true;

            if (tabId === "cliente") {
                const mod = await import('./cliente.js');
                mod.initClienteTab();
            }
            if (tabId === "cotizaciones") {
                inicializarCotizador();
            }
            if (tabId === "configuracion") {
                const mod = await import('./config.js');
                mod.initConfigTab();
            }
        } else {
            tabPane.innerHTML = "<div class='alert alert-danger'>No se pudo cargar el contenido.</div>";
        }
    }
}

document.querySelectorAll('.nav-link[data-bs-toggle="tab"]').forEach(btn => {
    btn.addEventListener('shown.bs.tab', function() {
        const target = btn.getAttribute('data-bs-target').replace('#', '');
        if (target === "cotizaciones") {
            actualizarSelectClientes();
        }
        loadTabContent(target);
    });
});
document.querySelector('button[data-bs-target="#historial"]')?.addEventListener('shown.bs.tab', mostrarHistorial);

document.addEventListener('DOMContentLoaded', () => {
    const activeTab = document.querySelector('.tab-pane.show.active');
    if (activeTab) {
        loadTabContent(activeTab.id);
    }
});

// ========== FUNCIONALIDAD DEL COTIZADOR PRINCIPAL (COTIZACIONES) ==========

function inicializarCotizador() {
    if(document.getElementById('fechaCotizacion')) {
        document.getElementById('fechaCotizacion').value = new Date().toISOString().split('T')[0];
    }
    if(document.getElementById('folioCotizacion')) {
        document.getElementById('folioCotizacion').textContent = generarFolioAutomatico();
    }
    if(document.getElementById('previewFolio') && document.getElementById('folioCotizacion')) {
        document.getElementById('previewFolio').textContent = 'Cotización ' + document.getElementById('folioCotizacion').textContent;
    }

    actualizarSelectClientes();

    if(document.getElementById('btnAgregarItem')) document.getElementById('btnAgregarItem').onclick = agregarItem;
    if(document.getElementById('aplicarDescuento')) document.getElementById('aplicarDescuento').onchange = toggleDescuento;
    if(document.getElementById('aplicarIVA')) document.getElementById('aplicarIVA').onchange = calcularTotales;
    if(document.getElementById('tipoDescuento')) document.getElementById('tipoDescuento').onchange = calcularTotales;
    if(document.getElementById('valorDescuento')) document.getElementById('valorDescuento').oninput = calcularTotales;
    if(document.getElementById('clienteSelect')) document.getElementById('clienteSelect').onchange = calcularTotales;
    if(document.getElementById('fechaCotizacion')) document.getElementById('fechaCotizacion').onchange = calcularTotales;
    if(document.getElementById('notasAdicionales')) document.getElementById('notasAdicionales').oninput = calcularTotales;

    if(document.getElementById('btnGuardarBorrador')) document.getElementById('btnGuardarBorrador').onclick = guardarBorrador;
    if(document.getElementById('btnAprobar')) document.getElementById('btnAprobar').onclick = aprobarCotizacion;

    if(document.getElementById('btnGenerarPDF')) {
        document.getElementById('btnGenerarPDF').onclick = async function() {
            const cotizacion = construirObjetoCotizacion();
            const empresa = await armarDatosEmpresaParaPDF();
            const datosPDF = {
                ...cotizacion,
                empresa
            };
            await generarPDF(datosPDF);
        };
    }

    if(document.getElementById('itemsContainer')) {
        document.getElementById('itemsContainer').innerHTML = '';
        agregarItem();
    }

    calcularTotales();
}

document.addEventListener('DOMContentLoaded', function() {
    const activeTab = document.querySelector('.tab-pane.show.active');
    if (activeTab && activeTab.id === 'cotizaciones') {
        inicializarCotizador();
    }
});

// ========== CLIENTES: ACTUALIZAR SELECT ==========
function actualizarSelectClientes() {
    const select = document.getElementById('clienteSelect');
    if (!select || typeof window.obtenerClientes !== 'function') return;
    const clientesArr = window.obtenerClientes();
    select.innerHTML = '<option value="">Seleccionar cliente...</option>';
    clientesArr.forEach(cliente => {
        const texto = `${cliente.nombre} - ${cliente.tipo || '-'}`;
        select.innerHTML += `<option value="${cliente.id}">${texto}</option>`;
    });
}
window.actualizarSelectClientes = actualizarSelectClientes;

// ========== FUNCIONES DEL COTIZADOR ==========

function construirObjetoCotizacion() {
    const idSelected = document.getElementById('clienteSelect')?.value;
    let clienteObj = {nombre: '', direccion: '', telefono: '', email: '', tipo: '', id: ''};
    if (idSelected && typeof window.gestorClientes === 'object') {
        const cli = window.gestorClientes.obtenerPorId(idSelected);
        if (cli) clienteObj = {...cli};
    }
    return {
        id: document.getElementById('folioCotizacion')?.textContent || 'COT-2025-0001',
        folio: document.getElementById('folioCotizacion')?.textContent || 'COT-2025-0001',
        cliente: clienteObj,
        clienteId: idSelected,
        fecha: document.getElementById('fechaCotizacion')?.value || '',
        materiales: [...document.querySelectorAll('.item-row')].map(row => ({
            nombre: row.querySelector('.descripcion-input')?.value || '',
            cantidad: parseFloat(row.querySelector('.cantidad-input')?.value) || 0,
            precio: parseFloat(row.querySelector('.precio-input')?.value) || 0
        })),
        totales: {
            subtotal: parseFloat(document.getElementById('previewSubtotal')?.textContent.replace('$','')) || 0,
            descuento: parseFloat(document.getElementById('previewDescuento')?.textContent.replace('$','')) || 0,
            iva: parseFloat(document.getElementById('previewIVA')?.textContent.replace('$','')) || 0,
            total: parseFloat(document.getElementById('previewTotal')?.textContent.replace('$','')) || 0
        },
        descuento: parseFloat(document.getElementById('previewDescuento')?.textContent.replace('$','')) || 0,
        ivaPorcentaje: 16,
        aplicarIVA: !!document.getElementById('aplicarIVA')?.checked,
        aplicarDescuento: !!document.getElementById('aplicarDescuento')?.checked,
        tipoDescuento: document.getElementById('tipoDescuento')?.value || 'porcentaje',
        valorDescuento: parseFloat(document.getElementById('valorDescuento')?.value) || 0,
        anticipo: 0,
        formaPago: 'Transferencia',
        notasPago: document.getElementById('notasAdicionales')?.value || '',
        estado: document.getElementById('estadoCotizacion')?.textContent?.toLowerCase() || 'borrador'
    };
}

function agregarItem() {
    const itemId = Date.now();
    const itemHtml = `
        <div class="item-row" id="item-${itemId}">
            <div class="row">
                <div class="col-md-4">
                    <input type="text" class="form-control descripcion-input" placeholder="Descripción del trabajo">
                </div>
                <div class="col-md-2">
                    <input type="number" class="form-control cantidad-input" placeholder="Cantidad" min="0" step="0.01">
                </div>
                <div class="col-md-2">
                    <input type="number" class="form-control precio-input" placeholder="Precio" min="0" step="0.01">
                </div>
                <div class="col-md-2">
                    <input type="text" class="form-control subtotal-display" placeholder="$0.00" readonly>
                </div>
                <div class="col-md-2">
                    <button class="btn btn-danger btn-sm" onclick="eliminarItem(${itemId})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('itemsContainer').insertAdjacentHTML('beforeend', itemHtml);

    const row = document.getElementById(`item-${itemId}`);
    if(row) {
        row.querySelector('.descripcion-input').oninput =
        row.querySelector('.cantidad-input').oninput =
        row.querySelector('.precio-input').oninput = calcularTotales;
    }
    calcularTotales();
}

window.eliminarItem = function(itemId) {
    const itemElement = document.getElementById(`item-${itemId}`);
    if (itemElement) {
        itemElement.remove();
        calcularTotales();
    }
}

function toggleDescuento() {
    const checkbox = document.getElementById('aplicarDescuento');
    const descuentoSection = document.getElementById('descuentoSection');
    if (checkbox?.checked) {
        descuentoSection?.classList.remove('hidden');
    } else {
        descuentoSection?.classList.add('hidden');
        if(document.getElementById('valorDescuento')) document.getElementById('valorDescuento').value = '';
    }
    calcularTotales();
}

function calcularTotales() {
    let subtotal = 0;
    const itemRows = document.querySelectorAll('.item-row');
    itemRows.forEach(row => {
        const cantidad = parseFloat(row.querySelector('.cantidad-input').value) || 0;
        const precio = parseFloat(row.querySelector('.precio-input').value) || 0;
        const itemSubtotal = cantidad * precio;
        row.querySelector('.subtotal-display').value = `$${itemSubtotal.toFixed(2)}`;
        subtotal += itemSubtotal;
    });

    let descuento = 0;
    if (document.getElementById('aplicarDescuento')?.checked) {
        const tipoDescuento = document.getElementById('tipoDescuento').value;
        const valorDescuento = parseFloat(document.getElementById('valorDescuento').value) || 0;
        if (tipoDescuento === 'porcentaje') {
            descuento = subtotal * (valorDescuento / 100);
        } else {
            descuento = valorDescuento;
        }
    }

    let iva = 0;
    if (document.getElementById('aplicarIVA')?.checked) {
        iva = (subtotal - descuento) * 0.16;
    }
    const total = subtotal - descuento + iva;

    updatePreview(subtotal, descuento, iva, total);
}

function updatePreview(subtotal, descuento, iva, total) {
    if(document.getElementById('previewSubtotal')) document.getElementById('previewSubtotal').textContent = `$${subtotal.toFixed(2)}`;
    if(document.getElementById('previewIVA')) document.getElementById('previewIVA').textContent = `$${iva.toFixed(2)}`;
    if(document.getElementById('previewTotal')) document.getElementById('previewTotal').textContent = `$${total.toFixed(2)}`;

    const descuentoRow = document.getElementById('previewDescuentoRow');
    if (descuentoRow) {
        if (descuento > 0) {
            descuentoRow.style.display = 'flex';
            if(document.getElementById('previewDescuento')) document.getElementById('previewDescuento').textContent = `-$${descuento.toFixed(2)}`;
        } else {
            descuentoRow.style.display = 'none';
        }
    }
    const ivaRow = document.getElementById('previewIVARow');
    if (ivaRow) ivaRow.style.display = document.getElementById('aplicarIVA')?.checked ? 'flex' : 'none';

    updateItemsPreview();
}

function updateItemsPreview() {
    const previewItems = document.getElementById('previewItems');
    const itemRows = document.querySelectorAll('.item-row');
    if (!previewItems) return;
    if (itemRows.length === 0) {
        previewItems.innerHTML = '<p class="text-muted text-center">Agrega items para ver la vista previa</p>';
        return;
    }
    let itemsHtml = '';
    itemRows.forEach(row => {
        const descripcion = row.querySelector('.descripcion-input').value;
        const cantidad = row.querySelector('.cantidad-input').value;
        const precio = row.querySelector('.precio-input').value;
        if (descripcion || cantidad || precio) {
            itemsHtml += `
                <div class="d-flex justify-content-between mb-2">
                    <div>
                        <strong>${descripcion || 'Sin descripción'}</strong><br>
                        <small class="text-muted">${cantidad || 0} x $${precio || 0}</small>
                    </div>
                    <div class="text-end">
                        <strong>$${((cantidad || 0) * (precio || 0)).toFixed(2)}</strong>
                    </div>
                </div>
            `;
        }
    });
    previewItems.innerHTML = itemsHtml || '<p class="text-muted text-center">Agrega items para ver la vista previa</p>';
}

function guardarBorrador() {
    const cotizacion = construirObjetoCotizacion();
    cotizacion.estado = "borrador";
    guardarCotizacion(cotizacion);
    if(document.getElementById('estadoCotizacion')) {
        document.getElementById('estadoCotizacion').className = 'badge bg-warning status-badge';
        document.getElementById('estadoCotizacion').textContent = 'Borrador';
    }
    alert('Cotización guardada como borrador. Folio: ' + cotizacion.id);
    limpiarFormularioCotizacion();
}

function aprobarCotizacion() {
    const cotizacion = construirObjetoCotizacion();
    cotizacion.estado = "aprobada";
    guardarCotizacion(cotizacion);
    if(document.getElementById('estadoCotizacion')) {
        document.getElementById('estadoCotizacion').className = 'badge bg-success status-badge';
        document.getElementById('estadoCotizacion').textContent = 'Aprobada';
    }
    alert('Cotización aprobada. Folio: ' + cotizacion.id);
    limpiarFormularioCotizacion();
}

function generarFolioAutomatico() {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const todas = JSON.parse(localStorage.getItem('COTIZACIONES_PRO')) || [];
    let max = 0;
    todas.forEach(c => {
        const match = c.id && c.id.match(/COT-(\d{6})-(\d+)/);
        if(match && match[1] === `${año}${mes}`) {
            const num = parseInt(match[2], 10);
            if(num > max) max = num;
        }
    });
    const nuevoNumero = (max + 1).toString().padStart(3, '0');
    return `COT-${año}${mes}-${nuevoNumero}`;
}

function limpiarFormularioCotizacion() {
    const nuevoFolio = generarFolioAutomatico();
    if(document.getElementById('folioCotizacion')) {
        document.getElementById('folioCotizacion').textContent = nuevoFolio;
    }
    if(document.getElementById('previewFolio')) {
        document.getElementById('previewFolio').textContent = 'Cotización ' + nuevoFolio;
    }
    if(document.getElementById('estadoCotizacion')) {
        document.getElementById('estadoCotizacion').className = 'badge bg-warning status-badge';
        document.getElementById('estadoCotizacion').textContent = 'Borrador';
    }
    if(document.getElementById('clienteSelect')) document.getElementById('clienteSelect').selectedIndex = 0;
    if(document.getElementById('fechaCotizacion')) document.getElementById('fechaCotizacion').value = new Date().toISOString().split('T')[0];
    if(document.getElementById('itemsContainer')) {
        document.getElementById('itemsContainer').innerHTML = '';
        agregarItem();
    }
    if(document.getElementById('notasAdicionales')) document.getElementById('notasAdicionales').value = '';
    if(document.getElementById('aplicarIVA')) document.getElementById('aplicarIVA').checked = true;
    if(document.getElementById('aplicarDescuento')) document.getElementById('aplicarDescuento').checked = false;
    if(document.getElementById('descuentoSection')) document.getElementById('descuentoSection').classList.add('hidden');
    if(document.getElementById('valorDescuento')) document.getElementById('valorDescuento').value = '';
    calcularTotales();
}

// ========== FUNCIONES DE PERSISTENCIA CON LOCALSTORAGE E HISTORIAL ==========

function guardarCotizacion(cotizacion) {
    let todas = JSON.parse(localStorage.getItem('COTIZACIONES_PRO')) || [];
    const idx = todas.findIndex(c => c.id === cotizacion.id);
    if (idx >= 0) {
        todas[idx] = cotizacion;
    } else {
        todas.push(cotizacion);
    }
    localStorage.setItem('COTIZACIONES_PRO', JSON.stringify(todas));
}

function mostrarHistorial() {
    const todas = JSON.parse(localStorage.getItem('COTIZACIONES_PRO')) || [];
    const contenedor = document.getElementById('historialListado');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    if (todas.length === 0) {
        contenedor.innerHTML = '<p class="text-muted">No hay cotizaciones guardadas.</p>';
        return;
    }
    todas.forEach(cot => {
        contenedor.innerHTML += `
            <div class="card mb-2">
                <div class="card-body d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${cot.id}</strong> 
                        <span class="badge ${cot.estado === 'aprobada' ? 'bg-success' : 'bg-warning'}">${cot.estado}</span>
                        <br>
                        <small>Cliente: ${cot.cliente.nombre || ''} | Fecha: ${cot.fecha}</small>
                    </div>
                    <div>
                        <button class="btn btn-primary btn-sm" onclick="cargarCotizacion('${cot.id}')">Cargar</button>
                        <button class="btn btn-danger btn-sm" onclick="eliminarCotizacion('${cot.id}')">Eliminar</button>
                    </div>
                </div>
            </div>
        `;
    });
}

function eliminarCotizacion(id) {
    let todas = JSON.parse(localStorage.getItem('COTIZACIONES_PRO')) || [];
    todas = todas.filter(c => c.id !== id);
    localStorage.setItem('COTIZACIONES_PRO', JSON.stringify(todas));
    mostrarHistorial();
}

function cargarCotizacion(id) {
    const todas = JSON.parse(localStorage.getItem('COTIZACIONES_PRO')) || [];
    const cot = todas.find(c => c.id === id);
    if (!cot) return;

    if(document.getElementById('folioCotizacion')) document.getElementById('folioCotizacion').textContent = cot.id;
    if(document.getElementById('fechaCotizacion')) document.getElementById('fechaCotizacion').value = cot.fecha;
    if(document.getElementById('itemsContainer')) document.getElementById('itemsContainer').innerHTML = '';
    cot.materiales.forEach(item => {
        agregarItem();
        const items = document.querySelectorAll('.item-row');
        const row = items[items.length - 1];
        row.querySelector('.descripcion-input').value = item.nombre;
        row.querySelector('.cantidad-input').value = item.cantidad;
        row.querySelector('.precio-input').value = item.precio;
    });

    if(document.getElementById('clienteSelect')) {
        let nombreCliente = '';
        if (cot.clienteId) {
            document.getElementById('clienteSelect').value = cot.clienteId;
            if(window.obtenerClientes) {
                const cliente = window.obtenerClientes().find(c => c.id == cot.clienteId);
                if (cliente) nombreCliente = cliente.nombre;
            }
        } else if (cot.cliente && cot.cliente.id) {
            document.getElementById('clienteSelect').value = cot.cliente.id;
            nombreCliente = cot.cliente.nombre || '';
        } else {
            document.getElementById('clienteSelect').selectedIndex = 0;
        }
        if (cot.cliente && cot.cliente.nombre) nombreCliente = cot.cliente.nombre;
        if (document.getElementById('clienteNombreInput')) {
            document.getElementById('clienteNombreInput').value = nombreCliente || '';
        }
    }

    if (document.getElementById('aplicarDescuento')) {
        document.getElementById('aplicarDescuento').checked = !!cot.aplicarDescuento;
    }
    if (document.getElementById('descuentoSection')) {
        if (cot.aplicarDescuento) {
            document.getElementById('descuentoSection').classList.remove('hidden');
        } else {
            document.getElementById('descuentoSection').classList.add('hidden');
        }
    }
    if (document.getElementById('tipoDescuento')) {
        document.getElementById('tipoDescuento').value = cot.tipoDescuento || 'porcentaje';
    }
    if (document.getElementById('valorDescuento')) {
        document.getElementById('valorDescuento').value = cot.valorDescuento || '';
    }

    if (document.getElementById('aplicarIVA')) {
        document.getElementById('aplicarIVA').checked = !!cot.aplicarIVA;
    }

    if (document.getElementById('notasAdicionales')) {
        document.getElementById('notasAdicionales').value = cot.notasPago || '';
    }

    if(document.getElementById('estadoCotizacion')) {
        if (cot.estado === 'aprobada') {
            document.getElementById('estadoCotizacion').className = 'badge bg-success status-badge';
            document.getElementById('estadoCotizacion').textContent = 'Aprobada';
        } else {
            document.getElementById('estadoCotizacion').className = 'badge bg-warning status-badge';
            document.getElementById('estadoCotizacion').textContent = 'Borrador';
        }
    }

    calcularTotales();
}

window.cargarCotizacion = cargarCotizacion;
window.eliminarCotizacion = eliminarCotizacion;
window.actualizarSelectClientes = actualizarSelectClientes;