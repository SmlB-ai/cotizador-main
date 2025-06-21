import { Config } from './config.js';

const { jsPDF } = window.jspdf;

// Utilidad para cargar imagen a base64 (para logos locales/remotos)
async function toBase64(url) {
    if (!url) return null;
    if (/^data:image/.test(url)) return url; // Ya es base64
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.onload = function () {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = url;
    });
}

/**
 * Este método ENSAMBLA los datos de la empresa leyendo SIEMPRE de la configuración guardada.
 * Se debe usar siempre antes de llamar a generarPDF.
 */
export async function armarDatosEmpresaParaPDF() {
    const config = new Config();
    const empresaConfig = config.cargarConfig();
    return {
        nombre: empresaConfig.nombre || '',
        direccion: empresaConfig.direccion || '',
        telefono: empresaConfig.telefono || '',
        email: empresaConfig.email || '',
        web: empresaConfig.web || '',
        logoBase64: empresaConfig.logo || ''
    };
}

/**
 * datos debe tener:
 *  - empresa (objeto de arriba)
 *  - cliente: {nombre, direccion, telefono, email}
 *  - materiales: array
 *  - totales, ivaPorcentaje, descuento, anticipo, folio, fecha, formaPago, notasPago
 */
export const generarPDF = async (datos) => {
    try {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'letter'
        });

        // --- Logo de la empresa en ESQUINA SUPERIOR IZQUIERDA (más espacio) ---
        let logoY = 15; // MÁS MARGEN ARRIBA
        let logoX = 15; // MÁS MARGEN IZQUIERDA
        let logoHeight = 28;
        let logoWidth = 48;
        if (datos.empresa.logoBase64) {
            try {
                const logo = await toBase64(datos.empresa.logoBase64);
                doc.addImage(logo, 'PNG', logoX, logoY, logoWidth, logoHeight);
            } catch {
                // Si falla, omite el logo
            }
        }

        // --- Nombre e información de la empresa (centrado arriba) ---
        const topBlockY = logoY + 5;
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text(datos.empresa.nombre || 'NOMBRE EMPRESA', 120, topBlockY + 6, { align: 'center' });

        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text([
            datos.empresa.direccion || '',
            datos.empresa.telefono ? `Tel: ${datos.empresa.telefono}` : '',
            datos.empresa.email ? `Email: ${datos.empresa.email}` : '',
            datos.empresa.web ? `Web: ${datos.empresa.web}` : ''
        ], 120, topBlockY + 13, { align: 'center', lineHeightFactor: 1.5 });

        // --- Folio y Fecha (esquina superior derecha) ---
        const fecha = datos.fecha
            ? (new Date(datos.fecha)).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
            : (new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }));

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text([
            `Cotización: ${datos.folio || ''}`,
            `Fecha: ${fecha}`
        ], 195, 18, { align: 'right' });

        // --- Línea divisoria ---
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(15, logoY + logoHeight + 8, 195, logoY + logoHeight + 8);

        // Ajuste de Y para las siguientes secciones
        let ySeccion = logoY + logoHeight + 16;

        // --- Información del Cliente ---
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text('CLIENTE', 15, ySeccion);

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);

        const splitNombre = doc.splitTextToSize(`Nombre: ${datos.cliente.nombre || ''}`, 90);
        const splitDireccion = doc.splitTextToSize(`Dirección: ${datos.cliente.direccion || ''}`, 90);
        doc.text([
            ...splitNombre,
            ...splitDireccion,
            `Teléfono: ${datos.cliente.telefono || ''}`,
            `Email: ${datos.cliente.email || ''}`
        ], 15, ySeccion + 7, { lineHeightFactor: 1.3 });

        // --- Tabla de Conceptos ---
        let y = ySeccion + 35;
        doc.setFillColor(40, 40, 40);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.rect(15, y, 180, 8, 'F');

        const headers = ['Concepto', 'Cant.', 'P.U.', 'Importe'];
        const headerWidths = [100, 20, 30, 30];
        let currentX = 20;
        headers.forEach((header, i) => {
            doc.text(header, currentX, y + 5);
            currentX += headerWidths[i];
        });

        // --- Contenido de la tabla ---
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        let yConcepto = y + 13;

        (datos.materiales || []).forEach((item, index) => {
            if (index % 2 === 0) {
                doc.setFillColor(240, 240, 240);
                doc.rect(15, yConcepto - 5, 180, 7, 'F');
            }
            const descripcion = doc.splitTextToSize(item.nombre || '', 95);
            doc.text(descripcion, 20, yConcepto);
            doc.text((item.cantidad != null ? item.cantidad : '').toString(), 120, yConcepto);
            doc.text(`$${(item.precio != null ? item.precio : 0).toFixed(2)}`, 140, yConcepto);
            doc.text(`$${((item.cantidad || 0) * (item.precio || 0)).toFixed(2)}`, 190, yConcepto, { align: 'right' });
            yConcepto += (descripcion.length > 1 ? descripcion.length * 5 : 7);
        });

        // --- Totales ---
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(120, yConcepto + 5, 195, yConcepto + 5);

        doc.setFontSize(10);
        let yTotales = yConcepto + 15;

        const totalesTable = [
            ['Subtotal:', `$${(datos.totales?.subtotal ?? 0).toFixed(2)}`],
            ['Descuento:', `$${(datos.descuento ?? 0).toFixed(2)}`],
            [`IVA (${datos.ivaPorcentaje ?? 16}%):`, `$${(datos.totales?.iva ?? 0).toFixed(2)}`],
            ['Total:', `$${(datos.totales?.total ?? 0).toFixed(2)}`],
            ['Anticipo:', `$${(datos.anticipo ?? 0).toFixed(2)}`],
            ['Pendiente:', `$${((datos.totales?.total ?? 0)-(datos.anticipo ?? 0)).toFixed(2)}`]
        ];

        totalesTable.forEach((row, index) => {
            doc.setFont(undefined, index === 3 || index === 5 ? 'bold' : 'normal');
            doc.text(row[0], 150, yTotales);
            doc.text(row[1], 190, yTotales, { align: 'right' });
            yTotales += 6;
        });

        // --- Condiciones de Pago ---
        yTotales += 10;
        doc.setFont(undefined, 'bold');
        doc.text('Condiciones de Pago:', 15, yTotales);
        doc.setFont(undefined, 'normal');
        doc.text(`Forma de Pago: ${datos.formaPago || ''}`, 15, yTotales + 7);

        if (datos.notasPago) {
            const notasSplit = doc.splitTextToSize(`Notas: ${datos.notasPago}`, 180);
            doc.text(notasSplit, 15, yTotales + 14);
        }

        // --- Firmas ---
        let yFirmas = 240;
        doc.setDrawColor(100, 100, 100);
        doc.line(25, yFirmas, 85, yFirmas);
        doc.line(125, yFirmas, 185, yFirmas);

        doc.setFontSize(8);
        // Cliente
        doc.text('Autoriza Cliente', 55, yFirmas + 5, { align: 'center' });
        doc.text(datos.cliente.nombre || '', 55, yFirmas + 10, { align: 'center' });

        // Empresa: SOLO mostrar "Por NombreEmpresa" arriba y vacío debajo
        doc.text('Por ' + (datos.empresa.nombre || ''), 155, yFirmas + 5, { align: 'center' });
        // doc.text('', 155, yFirmas + 10, { align: 'center' }); // Línea opcional, puedes dejarla comentada

        // --- Footer ---
        doc.setFontSize(8);
        doc.setTextColor(130, 130, 130);
        doc.text('Esta cotización tiene una vigencia de 30 días naturales.', 105, 270, { align: 'center' });

        const footerLine = [
            datos.empresa.web || '',
            datos.empresa.email || '',
            datos.empresa.telefono || ''
        ].filter(Boolean).join(' | ');
        if (footerLine) {
            doc.text(footerLine, 105, 275, { align: 'center' });
        }

        // Guardar PDF
        const nombreEmpresa = (datos.empresa.nombre || 'Empresa').replace(/\s+/g, '_');
        doc.save(`Cotizacion_${nombreEmpresa}_${datos.folio || ''}.pdf`);

    } catch (error) {
        console.error('Error al generar PDF:', error);
        alert('Error al generar PDF.');
        throw error;
    }
};