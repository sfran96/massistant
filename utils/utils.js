const fs = require('fs');

/**
 * Función encargada de devolver el valor de una cookie
 * @param {string} cname El nombre de la cookie a recoger
 * @param {string} cookies Define las cookies del usuario (cookie1=cd;cookie2=ab)
 * @method getCookie
 * @returns {string} valor de la cookie solicitada
 */
function getCookie(cname, cookies) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(cookies);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

/**
 * Genera un log para cada mensaje, uno para cada día
 * @param {any} value Valor a guardar en el fichero del log
 * @method log
 */
function log(value) {
    let fecha = new Date();
    let fechaArchivo = `${fecha.getDay()}${fecha.getMonth()}${fecha.getFullYear()}`;
    let pathLog = `${__dirname}/logs/${fechaArchivo}.log`;

    fs.exists(`${__dirname}/logs`, (dirExists) => {
        if (!dirExists)
            fs.mkdirSync(`${__dirname}/logs`);
        // Comprobamos si existe el fichero
        fs.exists(pathLog, (exists) => {
            let printable = `[${fecha.getHours()}:${fecha.getMinutes()}:${fecha.getSeconds()}] ${value}\n`;
            if (exists) {
                fs.appendFileSync(pathLog, printable);
            } else {
                fs.writeFileSync(pathLog, printable);
            }
            console.log(printable);
        });
    })
}

module.exports = {
    getCookie, log
}