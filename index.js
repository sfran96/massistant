/** Archivo de configuración */
const conf = require('./conf.json');
/** Módulos externos utilizados */
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
/** Módulos propios utilizados */
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
});

// Listen on configuration port
server.listen(conf.self.port, () => {
    console.log(`Listening on port ${conf.self.port}...`);
});
