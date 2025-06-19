const { jsPDF } = window.jspdf;

// Utilidad para cargar imagen a base64 (para logos locales/remotos)
async function toBase64(url) {
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

export const generarPDF = async (datos) => {
    try {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'letter'
        });

        // --- Fecha y folio ---
        const fecha = datos.fecha
            ? (new Date(datos.fecha)).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
            : (new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }));

        // --- Logo de la empresa ---
        let logoY = 10;
        let logoHeight = 25;
        if (datos.empresa.logoBase64 || datos.empresa.logoURL) {
            let logo = datos.empresa.logoBase64 || datos.empresa.logoURL;
            try {
                logo = await toBase64(logo);
                doc.addImage(logo, 'PNG', 15, logoY, 25, logoHeight);
            } catch {
                // Si falla el logo, lo omite sin romper el PDF
            }
        }

        // --- Nombre e información de la empresa ---
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text(datos.empresa.nombre || 'NOMBRE EMPRESA', 105, 20, { align: 'center' });

        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text([
            datos.empresa.direccion || '',
            datos.empresa.telefono ? `Tel: ${datos.empresa.telefono}` : '',
            datos.empresa.email ? `Email: ${datos.empresa.email}` : '',
            datos.empresa.web ? `Web: ${datos.empresa.web}` : ''
        ], 105, 25, { align: 'center', lineHeightFactor: 1.5 });

        // --- Folio y Fecha ---
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text([
            `Cotización: ${datos.folio || ''}`,
            `Fecha: ${fecha}`
        ], 195, 15, { align: 'right' });

        // --- Línea divisoria ---
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(15, 45, 195, 45);

        // --- Información del Cliente ---
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text('CLIENTE', 15, 55);

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);

        const splitNombre = doc.splitTextToSize(`Nombre: ${datos.cliente.nombre || ''}`, 90);
        const splitDireccion = doc.splitTextToSize(`Dirección: ${datos.cliente.direccion || ''}`, 90);

        doc.text([
            ...splitNombre,
            ...splitDireccion,
            `Teléfono: ${datos.cliente.telefono || ''}`,
            `Email: ${datos.cliente.email || ''}`
        ], 15, 62, { lineHeightFactor: 1.3 });

        // --- Tabla de Conceptos ---
        doc.setFillColor(40, 40, 40);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.rect(15, 90, 180, 8, 'F');

        const headers = ['Concepto', 'Cant.', 'P.U.', 'Importe'];
        const headerWidths = [100, 20, 30, 30];
        let currentX = 20;

        headers.forEach((header, i) => {
            doc.text(header, currentX, 95);
            currentX += headerWidths[i];
        });

        // --- Contenido de la tabla ---
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        let y = 105;

        (datos.materiales || []).forEach((item, index) => {
            if (index % 2 === 0) {
                doc.setFillColor(240, 240, 240);
                doc.rect(15, y-5, 180, 7, 'F');
            }
            const descripcion = doc.splitTextToSize(item.nombre || '', 95);
            doc.text(descripcion, 20, y);
            doc.text((item.cantidad != null ? item.cantidad : '').toString(), 120, y);
            doc.text(`$${(item.precio != null ? item.precio : 0).toFixed(2)}`, 140, y);
            doc.text(`$${((item.cantidad || 0) * (item.precio || 0)).toFixed(2)}`, 190, y, { align: 'right' });
            y += (descripcion.length > 1 ? descripcion.length * 5 : 7);
        });

        // --- Totales ---
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(120, y+5, 195, y+5);

        doc.setFontSize(10);
        y += 15;

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
            doc.text(row[0], 150, y);
            doc.text(row[1], 190, y, { align: 'right' });
            y += 6;
        });

        // --- Condiciones de Pago ---
        y += 10;
        doc.setFont(undefined, 'bold');
        doc.text('Condiciones de Pago:', 15, y);
        doc.setFont(undefined, 'normal');
        doc.text(`Forma de Pago: ${datos.formaPago || ''}`, 15, y + 7);

        if (datos.notasPago) {
            const notasSplit = doc.splitTextToSize(`Notas: ${datos.notasPago}`, 180);
            doc.text(notasSplit, 15, y + 14);
        }

        // --- Firmas ---
        y = 240;
        doc.setDrawColor(100, 100, 100);
        doc.line(25, y, 85, y);
        doc.line(125, y, 185, y);

        doc.setFontSize(8);
        doc.text('Autoriza Cliente', 55, y + 5, { align: 'center' });
        doc.text(datos.cliente.nombre || '', 55, y + 10, { align: 'center' });

        doc.text('Por ' + (datos.empresa.nombre || 'Nombre Empresa'), 155, y + 5, { align: 'center' });
        doc.text(datos.empresa.nombre || '', 155, y + 10, { align: 'center' });

        // --- Footer ---
        doc.setFontSize(8);
        doc.setTextColor(130, 130, 130);
        doc.text('Esta cotización tiene una vigencia de 30 días naturales.', 105, 270, { align: 'center' });

        // Footer con datos actuales de empresa
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