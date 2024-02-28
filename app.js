const express = require('express');
const fs = require('fs').promises;
const uuid = require('uuid');
const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

let productosExistentes = [];
let serviciosDisponibles;

fs.readFile('productos.json', 'utf8')
    .then(data => {
        serviciosDisponibles = JSON.parse(data);
    })
    .catch(error => {
        console.error('Error al leer productos.json:', error);
        serviciosDisponibles = [];
    });

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/products.html');
});

app.get('/index.html', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.use('/assets', express.static(__dirname + '/assets'));

app.get('/obtener-factura/:id', async (req, res) => {
    const facturaId = req.params.id;

    try {
        const facturaPath = `factura_${facturaId}.json`;
        const data = await fs.readFile(facturaPath, 'utf8');
        const factura = JSON.parse(data);
        res.json(factura);
    } catch (error) {
        console.error('Error al leer la factura:', error);
        res.status(500).send('Error interno del servidor');
    }
});


app.get('/productos', async (req, res) => {
    try {
        const data = await fs.readFile('productos.json', 'utf8');
        productosExistentes = JSON.parse(data);
        res.json(productosExistentes);
    } catch (error) {
        console.error('Error al leer el archivo JSON:', error);
        res.status(500).send('Error interno del servidor');
    }
});

app.post('/productos', async (req, res) => {
    const nuevoProducto = req.body;
    productosExistentes.push(nuevoProducto);

    try {
        await fs.writeFile('productos.json', JSON.stringify(productosExistentes, null, 2));
        res.json(productosExistentes);
    } catch (error) {
        console.error('Error al escribir en el archivo JSON:', error);
        res.status(500).send('Error interno del servidor');
    }
});

app.get('/servicios', (req, res) => {
    res.json(serviciosDisponibles);
});

app.post('/generar-factura', async (req, res) => {
    const factura = generarFactura(req.body);

    try {
        await fs.writeFile(`factura_${factura.id}.json`, JSON.stringify(factura, null, 2));
        res.json(factura);
    } catch (error) {
        console.error('Error al escribir la factura en un archivo:', error);
        res.status(500).send('Error interno del servidor');
    }
});

function generarFactura(data) {
    const id = generarID();
    const serviciosSeleccionados = obtenerServiciosSeleccionados(data.servicios);
    const subtotal = calcularSubtotal(serviciosSeleccionados);
    const descuento = calcularDescuento(subtotal, data.descuento);
    const tax = parseInt(calcularTax(subtotal, descuento));
    const total = calcularTotal(subtotal, descuento, tax);

    const factura = {
        id,
        nombreCliente: data.nombreCliente,
        proyecto: data.proyecto,
        fecha: obtenerFechaActual(),
        linkPago: data.linkPago,
        servicios: serviciosSeleccionados,
        subtotal,
        descuento,
        tax,
        total
    };

    return factura;
}

function generarID() {
    const fechaHora = new Date();
    const id = fechaHora.toISOString().replace(/[^0-9]/g, '').slice(0, 14) + uuid.v4().replace(/-/g, '').slice(0, 6);
    return id;
}

function obtenerServiciosSeleccionados(idsServicios) {
    return serviciosDisponibles.filter(servicio => idsServicios.includes(servicio.ITEM));
}

function calcularSubtotal(servicios) {
    return servicios.reduce((total, servicio) => total + servicio.PRECIO, 0);
}

function calcularDescuento(subtotal, porcentajeDescuento) {
    return (subtotal * porcentajeDescuento) / 100;
}

function calcularTax(subtotal, descuento) {
    const impuestoPorcentaje = 8; // Por ejemplo, 8% de impuestos
    return ((subtotal - descuento) * impuestoPorcentaje) / 100;
}

function calcularTotal(subtotal, descuento, tax) {
    numero = subtotal - descuento + tax;
    total = numero.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
    return total;
}

function obtenerFechaActual() {
    const fecha = new Date();
    return `${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()}`;
}

app.listen(PORT, () => {
    console.log(`Servidor en ejecución en http://localhost:${PORT}`);
});
