const { jsPDF } = window.jspdf;

// Utilidad para cargar imagen a base64 de manera asíncrona
async function toBase64(url) {
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

// Función principal para generar un PDF de factura profesional
export const generarPDF = async (datos) => {
    try {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'letter'
        });

        // Configuración de fecha y datos generales
        const fecha = datos.fecha || (new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }));

        // -- ENCABEZADO CON LOGO Y DATOS DE EMPRESA --
        let logoY = 10;
        if (datos.empresa.logoBase64 || datos.empresa.logoURL) {
            let logoBase64 = datos.empresa.logoBase64;
            if (!logoBase64 && datos.empresa.logoURL) {
                logoBase64 = await toBase64(datos.empresa.logoURL);
            }
            if (logoBase64) {
                doc.addImage(logoBase64, 'PNG', 15, logoY, 25, 25);
            }
        }

        // Nombre de la empresa
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text(datos.empresa.nombre || 'STABLEBUILDS', 105, logoY + 10, { align: 'center' });

        // Información de la empresa
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text([
            datos.empresa.direccion || '',
            `Tel: ${datos.empresa.telefono || ''}`,
            `Email: ${datos.empresa.email || ''}`,
            `Web: ${datos.empresa.web || ''}`
        ], 105, logoY + 15, { align: 'center', lineHeightFactor: 1.5 });

        // Folio y Fecha
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text([
            `Cotización: ${datos.folio || ''}`,
            `Fecha: ${fecha}`
        ], 195, logoY + 5, { align: 'right' });

        // Línea divisoria
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(15, 45, 195, 45);

        // -- INFORMACIÓN DEL CLIENTE --
        let y = 55;
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text('DATOS DEL CLIENTE', 15, y);

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        y += 7;

        const splitNombre = doc.splitTextToSize(`Nombre: ${datos.cliente.nombre || ''}`, 90);
        const splitDireccion = doc.splitTextToSize(`Dirección: ${datos.cliente.direccion || ''}`, 90);
        doc.text([
            ...splitNombre,
            ...splitDireccion,
            `Teléfono: ${datos.cliente.telefono || ''}`,
            `Email: ${datos.cliente.email || ''}`
        ], 15, y, { lineHeightFactor: 1.3 });

        // -- TABLA DE CONCEPTOS --
        y = 90;
        doc.setFillColor(52, 152, 219);
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

        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        let yConcepto = y + 15;

        (datos.materiales || []).forEach((item, index) => {
            // Alternar color de fondo
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

        // -- SECCIÓN DE TOTALES --
        let yTotales = Math.max(yConcepto + 10, 140);
        doc.setFontSize(10);
        doc.setDrawColor(200, 200, 200);
        doc.line(120, yTotales - 5, 195, yTotales - 5);

        // Tabla de totales alineada a la derecha
        const totalesTable = [
            ['Subtotal:', `$${(datos.totales?.subtotal ?? 0).toFixed(2)}`],
            ['Descuento:', `$${(datos.descuento ?? 0).toFixed(2)}`],
            [`IVA (${datos.ivaPorcentaje ?? 16}%):`, `$${(datos.totales?.iva ?? 0).toFixed(2)}`],
            ['Total:', `$${(datos.totales?.total ?? 0).toFixed(2)}`],
            ['Anticipo:', `$${(datos.anticipo ?? 0).toFixed(2)}`],
            ['Pendiente:', `$${((datos.totales?.total ?? 0) - (datos.anticipo ?? 0)).toFixed(2)}`]
        ];
        totalesTable.forEach((row, index) => {
            doc.setFont(undefined, index === 3 || index === 5 ? 'bold' : 'normal');
            doc.text(row[0], 150, yTotales);
            doc.text(row[1], 190, yTotales, { align: 'right' });
            yTotales += 6;
        });

        // -- CONDICIONES DE PAGO --
        yTotales += 10;
        doc.setFont(undefined, 'bold');
        doc.text('Condiciones de Pago:', 15, yTotales);
        doc.setFont(undefined, 'normal');
        doc.text(`Forma de Pago: ${datos.formaPago || ''}`, 15, yTotales + 7);

        if (datos.notasPago) {
            const notasSplit = doc.splitTextToSize(`Notas: ${datos.notasPago}`, 180);
            doc.text(notasSplit, 15, yTotales + 14);
        }

        // -- SECCIÓN DE FIRMAS --
        let yFirmas = 240;
        doc.setDrawColor(100, 100, 100);
        doc.line(25, yFirmas, 85, yFirmas);
        doc.line(125, yFirmas, 185, yFirmas);
        doc.setFontSize(8);
        doc.text('Autoriza Cliente', 55, yFirmas + 5, { align: 'center' });
        doc.text(datos.cliente.nombre || '', 55, yFirmas + 10, { align: 'center' });
        doc.text('Por StableBuilds', 155, yFirmas + 5, { align: 'center' });
        doc.text(datos.empresa.nombre || 'StableBuilds', 155, yFirmas + 10, { align: 'center' });

        // -- FOOTER --
        doc.setFontSize(8);
        doc.setTextColor(130, 130, 130);
        doc.text('Esta cotización tiene una vigencia de 30 días naturales.', 105, 270, { align: 'center' });
        doc.text('stablebuilds.com | skillhub-mex.com', 105, 275, { align: 'center' });

        // GUARDAR PDF
        doc.save(`Cotizacion_${datos.empresa.nombre || 'StableBuilds'}_${datos.folio || ''}.pdf`);
    } catch (error) {
        console.error('Error al generar PDF:', error);
        alert('Error al generar PDF.');
        throw error;
    }
};