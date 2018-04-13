/**
 * Define el módulo encargado de la comprobación de sesión del usuario
 */
const moodleConn = require('../moodle-conn/moodle-conn');
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
    if ((cookieMoodle != "" || cookieMoodle != undefined) && socket.handshake.session.cookieMoodle != cookieMoodle) {
        moodleConn.isUserLoggedIn(cookieMoodle, (userId) => {
            socket.handshake.session.userId = userId;
            socket.handshake.session.cookieMoodle = cookieMoodle;
            socket.join(userId);
            next();
        });
        // Si SÍ está definida, coger los datos de la sesión
    } else if ((cookieMoodle != "" || cookieMoodle != undefined) && socket.handshake.session.cookieMoodle === cookieMoodle) {
        socket.join(socket.handshake.session.userId);
        socket.emit('joined', {});
        next();
    }
}

module.exports = {
    checkUserStatus
}