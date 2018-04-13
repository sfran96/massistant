/** Archivo de configuración y menús **/
const conf = require('./conf.json');
const menus = require('./menus.js');
/** Módulos externos utilizados **/
const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server, {
    pingTimeout: 5000
});
const session = require("express-session")({
    secret: conf.self.cookie_session_key1,
    resave: true,
    saveUninitialized: true
});
const sharedsession = require("express-socket.io-session");
const fs = require('fs');
/** Módulos propios utilizados **/
const sessionControl = require("./session-control/session-cont");

app.use(session);
io.use(sharedsession(session));
io.use(sessionControl.checkUserStatus);

io.on('connection', function (socket) {
    // Cuando el usuario se "desconecta del socket", cierra la pestaña del navegador, por ejemplo.
    socket.on('disconnecting', (reason) => {
        var rooms = Object.keys(socket.rooms);
        socket.to(rooms[0]).emit("socket-left", "Una de tus pestañas ha sido cerrada/recargada.");
    });

    // Cuando el usuario solicita los distintos menús disponibles
    socket.on('menusRequested', () => {
        socket.emit('menusRecieved', menus.menus)
    });

    socket.on('aboutRequested', () => {
        let text = "Soy <i>MAssistant (Moodle Assistant)<\/i>, pretendo ayudarte a utilizar Moodle de una forma más sencilla e intuitiva como alumno.<br\/>Desarrollado por <strong>Francis Santos<\/strong> como proyecto de fin de carrera en el segundo periodo del curso 2017/2018.";
        socket.emit('aboutRecieved', text);
    });
});

// Vigilar el fichero que contiene la información acerca de los menús, si cambia hay que cambiar la información que el servidor reenvía a los usuarios
fs.watch('./menus.js', (event, filename) => {
    menus = require('./menus.js');
});

// Listen on configuration port
server.listen(conf.self.port, () => {
    console.log(`Listening on port ${conf.self.port}...`);
});
