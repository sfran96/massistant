/** Archivo de configuración y menús **/
var reload = require('require-reload')(require);
const conf = require('./conf.json');
const menus = reload('./menus.js');
/** Módulos externos utilizados **/
const fs = require('fs');
const https = require('https');
const app = require('express')();
const server = https.createServer({
    key: fs.readFileSync('./ssl_config_files/key.pem'),
    cert: fs.readFileSync('./ssl_config_files/cert.crt')
}, app);
const io = require('socket.io')(server, {
    pingTimeout: 5000
});
const session = require("express-session")({
    secret: conf.self.cookie_session_key1,
    resave: true,
    saveUninitialized: true
});
const sharedsession = require("express-socket.io-session");
/** Módulos propios utilizados **/
const sessionControl = require("./session-control/session-cont");
const moodleConnection = require("./moodle-conn/moodle-conn");

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

    // Cuando el usuario solicita información acerca de Massistant
    socket.on('aboutRequested', () => {
        let text = "Soy <i>MAssistant (Moodle Assistant)<\/i>, pretendo ayudarte a utilizar Moodle de una forma más sencilla e intuitiva como alumno.<br\/>Desarrollado por <strong>Francis Santos<\/strong> como proyecto de fin de carrera en el segundo periodo del curso 2017/2018.";
        socket.emit('aboutRecieved', text);
    });

    // Cuando el usuario solicita entrar en una de las asignaturas que tiene matriculado
    socket.on('coursesRequested', () => {
        // Solicitamos dicha información a la base de datos
        moodleConnection.retrieveUserCourses(socket.handshake.session.userId, (subjectsSql) => {
            let userSubjects = [];
            for (i = 0; i < subjectsSql.length; i++) {
                let subject = {};
                subject.name = subjectsSql[i].fullname;
                subject.url = `${conf.self.host}/course/view.php?id=${subjectsSql[i].id}`
                userSubjects.push(subject);
            }
            socket.emit('coursesRecieved', userSubjects);
        })
    })
});

// Vigilar el fichero que contiene la información acerca de los menús, si cambia hay que cambiar la información que el servidor reenvía a los usuarios
fs.watch('./menus.js', (event, filename) => {
    menus = reload('./menus.js');
});

// Listen on configuration port
server.listen(conf.self.port, () => {
    console.log(`Listening on port ${conf.self.port}...`);
});
