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
    cert: fs.readFileSync('./ssl_config_files/cert.crt'),
    passphrase: conf.self.passphrase
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
const { URL, URLSearchParams } = require('url');
/** Módulos propios utilizados **/
const sessionControl = require("./session-control/session-cont");
const moodleConnection = require("./moodle-conn/moodle-conn");



// Control de DoS
const connections = {};

/**
 * 
 * @param {SocketIO.Socket} socket Socket del usuario que solicita el servicio
 * @param {function} next Pasa al siguiente módulo del middleware (connection) si todo es correcto
 */
function checkGoodUse(socket, next) {
    // Comprobamos que tenga alguna sesión iniciada, sino, creamos la variable
    if (connections[socket.handshake.address] === undefined) {
        connections[socket.handshake.address] = 0;
    }
    // Si no supera un límite por IP, se aumenta el contandor Y se pasa al siguiente módulo
    if (connections[socket.handshake.address] < 100) {
        // Añadimos un valor más a las conexiones que utiliza
        connections[socket.handshake.address]++;
        next();
    }
    // Sino, simplemente se cierra la conexión
    else {
        socket.disconnect();
    }
};

app.use(session);
io.use(checkGoodUse);
io.use(sharedsession(session));
io.use(sessionControl.checkUserStatus);

io.on('connection', function (socket) {
    // Cuando el usuario se "desconecta del socket", cierra la pestaña del navegador, por ejemplo.
    socket.on('disconnecting', (reason) => {
        // Se elimina del contador una conexión
        if (connections[socket.handshake.address] > 0) {
            connections[socket.handshake.address]--;
        }
        // Si no quedan más conexiones, se elimina del registro
        else {
            delete connections[socket.handshake.address];
        }
    });

    // Cuando el usuario solicita los distintos menús disponibles
    socket.on('menusRequested', () => {
        socket.emit('menusReceived', menus.menus)
    });

    // Cuando el usuario solicita información acerca de Massistant
    socket.on('aboutRequested', () => {
        let text = "Soy <i>MAssistant (Moodle Assistant)<\/i>, pretendo ayudarte a utilizar Moodle de una forma más sencilla e intuitiva como alumno.<br\/>Desarrollado por <strong>Francis Santos<\/strong> como proyecto de fin de carrera en el segundo periodo del curso 2017/2018.";
        socket.emit('aboutReceived', text);
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
            socket.emit('coursesReceived', userSubjects);
        })
    });

    // Cuando el usuario solicita visitar la página de calificaciones de una asignatura
    socket.on('pathForGradesRequested', subjectId => {
        let toReturn = `${conf.self.host}/grade/report/index.php?id=${subjectId}`;
        socket.emit('pathForGradesReceived', toReturn);
    });

    // Ejecutado para saber si un usuario se encuentra en una subpágina de una asignatura
    socket.on('checkUserPositionRequested', url => {
        let myURL = new URL(url);
        let path = url.replace(conf.self.host + "/mod/", '');
        let mmodule = path.split('/')[0];
        let params = new URLSearchParams(myURL.searchParams);
        var delivered = [];
        if (url.includes('mod') && params.has('id') && mmodule !== 'undefined' && mmodule !== '')
            moodleConnection.getCourse(mmodule, params.get('id'), (subjectId) => {
                delivered.push('subjectMenu');
                delivered.push(subjectId);
                socket.emit('checkUserPositionReceived', delivered);
            })
        else
            socket.emit('checkUserPositionReceived');
    });

    // Ejecutado cuando el usuario quiere saber su nota
    socket.on('gradesRequested', (courseId) => {
        let courseIdInt = parseInt(courseId);
        if (!isNaN(courseIdInt))
            moodleConnection.getGrades(socket.handshake.session.userId, courseId, (gradeObjectsArray) => {
                socket.emit('gradesReceived', gradeObjectsArray);
            });
        else
            socket.emit('gradesReceived');
    });

    // Ejecuta cuando el usuario solicita los profesores de una asignatura
    socket.on('teachersInfoRequested', (courseId) => {
        let courseIdInt = parseInt(courseId);
        if (!isNaN(courseIdInt))
            moodleConnection.getTeachers(courseIdInt, (teacherArray) => {
                socket.emit('teachersInfoReceived', teacherArray);
            });
        else
            socket.emit('teachersInfoReceived');
    });

    // Ejecutado cuando el usuario solicita los mensajes que son suyos
    socket.on('messagesRequested', () => {
        let userIdInt = parseInt(socket.handshake.session.userId);
        if (!isNaN(userIdInt))
            moodleConnection.getMessages(userIdInt, (messages) => {
                socket.emit('messagesReceived', messages);
            });
        else
            socket.emit('messagesReceived');
    });

    // Ejecutado cuando el usuario solicita información acerca de otro usuario
    socket.on('userInfoRequested', (userId) => {
        let userIdInt = parseInt(userId);
        if (!isNaN(userIdInt))
            moodleConnection.getUserInfo(userIdInt, (user) => {
                socket.emit('userInfoReceived', user);
            });
    });
});

// Listen on configuration port
server.listen(conf.self.port, () => {
    console.log(`Listening on port ${conf.self.port}...`);
});
