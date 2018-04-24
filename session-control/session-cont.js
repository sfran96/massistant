/**
 * Define el módulo encargado de la comprobación de sesión del usuario
 */
const moodleConn = require('../moodle-conn/moodle-conn');
const conf = require('../conf.json');
const utils = require('../utils/utils');

/**
 * 
 * @param {SocketIO.Socket} socket Socket del usuario que solicita el servicio
 * @param {function} next Pasa al siguiente módulo del middleware (connection) si todo es correcto
 */
function checkUserStatus(socket, next) {
    // Comprobamos que tiene la cookie iniciada
    var cookieMoodle = utils.getCookie("MoodleSession", socket.request.headers.cookie);
    // Si la cookie está definida, y no se ha registrado su sesión en el sistema de sockets, buscar en la base de datos SQL
    if ((cookieMoodle != "" || cookieMoodle != undefined)) {
        if (socket.handshake.session.cookieMoodle != cookieMoodle) {
            let callerIP = socket.handshake.address;
            moodleConn.isUserLoggedIn(cookieMoodle, callerIP, (userId) => {
                socket.handshake.session.userId = userId;
                socket.handshake.session.cookieMoodle = cookieMoodle;
                _whenLoggedIn(socket);
                next();
            });
            // Si SÍ está definida, coger los datos de la sesión
        } else if (socket.handshake.session.cookieMoodle === cookieMoodle) {
            _whenLoggedIn(socket);
            next();
        }
    }
}

/**
 * 
 * @param {SocketIO.Socket} socket Socket del usuario que solicita el servicio
 */
function _whenLoggedIn(socket) {
    socket.join(socket.handshake.session.userId);
    socket.emit('hostInfo', conf.self.host);
}

module.exports = {
    checkUserStatus
}