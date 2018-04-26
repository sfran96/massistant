/**
 * @author Francis Santos Liranzo <francis.santosd@alumnos.upm.es>
 * @version 0.8
 */
/** Archivo de configuración y menús **/
var reload = require('require-reload')(require);
const conf = require('./conf.json');
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
const utils = require("./utils/utils");

// Control de DoS
// ["ip"]: {lastTime, allowance}
const connectionLastTime = {};
// Definimos el número de peticiones que se permite por intervalo de tiempo
const rate = 5; // Máximo 5 solicitudes
const per = 10; // Cada 10 segundos

/**
 * Función encargada de comprobar que el usuario no está realizando un mal uso de la aplicación
 * @param {SocketIO.Socket} socket Socket del usuario que solicita el servicio
 * @param {function} next Pasa al siguiente módulo del middleware (connection) si todo es correcto
 */
function checkGoodUse(socket, next) {
    let current = Date.now();
    let timePassed;
    let user = connectionLastTime[socket.handshake.address];

    // Si no existe una entrada para el usuario, se crea
    if (user === undefined) {
        connectionLastTime[socket.handshake.address] = {
            lastTime: current,
            allowance: rate
        }
        user = connectionLastTime[socket.handshake.address];
    }

    // Se calcula cuanto ha pasado desde la última vez
    timePassed = current - user.last;
    // Guardamos cuando se solicitó por última vez
    user.lastTime = current;

    // Calculamos la permitibilidad del usuario
    user.allowance += timePassed * (rate / per);
    if (user.allowance > rate) {
        user.allowance = rate;
    }

    utils.log('Allowance is: ' + user.allowance);
    // Comparamos
    if (user.allowance < 1.0) {
        // Desconectamos al usuario
        socket.disconnect();
        utils.log(`El usuario con IP=${socket.handshake.address} ha realizado más consultas de las contempladas por un uso correcto.`);
    } else {
        // Lo pasamos al siguiente middleware
        next();
        user.allowance -= 1.0;
    }
};

app.use(session);
io.use(checkGoodUse);
io.use(sharedsession(session));
io.use(sessionControl.checkUserStatus);

io.on('connection', function (socket) {

    /** 
     * Cuando el usuario se "desconecta del socket", cierra la pestaña del navegador, por ejemplo.
     * @event disconnecting
     */
    socket.on('disconnecting', (reason) => {
    });

    /**  
     * Cuando el usuario solicita información acerca de Massistant
     * @event aboutRequested
    */
    socket.on('aboutRequested', () => {
        let text = "Soy <i>MAssistant (Moodle Assistant)<\/i>, pretendo ayudarte a utilizar Moodle de una forma más sencilla e intuitiva como alumno.<br\/>Desarrollado por <strong>Francis Santos<\/strong> como proyecto de fin de carrera en el segundo periodo del curso 2017/2018.";
        socket.emit('aboutReceived', text);
    });

    /** 
     * Cuando el usuario solicita entrar en una de las asignaturas que tiene matriculado
     * @event coursesRequested
     */
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

    /**
     * Cuando el usuario solicita visitar la página de calificaciones de una asignatura
     * @event pathForGradesRequested
     */
    socket.on('pathForGradesRequested', subjectId => {
        let toReturn = `${conf.self.host}/grade/report/index.php?id=${subjectId}`;
        socket.emit('pathForGradesReceived', toReturn);
    });

    /**
     * Ejecutado para saber si un usuario se encuentra en una subpágina de una asignatura
     * @event checkUserPositionRequested
     */
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

    /**
     * Ejecutado cuando el usuario quiere saber su nota
     * @event gradesRequested
     */
    socket.on('gradesRequested', (courseId) => {
        let courseIdInt = parseInt(courseId);
        if (!isNaN(courseIdInt))
            moodleConnection.getGrades(socket.handshake.session.userId, courseId, (gradeObjectsArray) => {
                socket.emit('gradesReceived', gradeObjectsArray);
            });
        else
            socket.emit('gradesReceived');
    });

    /**
     * Ejecuta cuando el usuario solicita los profesores de una asignatura
     * @event teachersInfoRequested
     */
    socket.on('teachersInfoRequested', (courseId) => {
        let courseIdInt = parseInt(courseId);
        if (!isNaN(courseIdInt))
            moodleConnection.getTeachers(courseIdInt, (teacherArray) => {
                socket.emit('teachersInfoReceived', teacherArray);
            });
        else
            socket.emit('teachersInfoReceived');
    });

    /**
     * Ejecutado cuando el usuario solicita los mensajes que son suyos
     * @event messagesRequested
     */
    socket.on('messagesRequested', () => {
        let userIdInt = parseInt(socket.handshake.session.userId);
        if (!isNaN(userIdInt))
            moodleConnection.getMessages(userIdInt, (messages) => {
                socket.emit('messagesReceived', messages);
            });
        else
            socket.emit('messagesReceived');
    });

    /**
     * Ejecutado cuando el usuario solicita información acerca de otro usuario
     * @event userInfoRequested
     */
    socket.on('userInfoRequested', (userId) => {
        let userIdInt = parseInt(userId);
        if (!isNaN(userIdInt))
            moodleConnection.getUserInfo(userIdInt, (user) => {
                socket.emit('userInfoReceived', user);
            });
    });

    /**
     * Ejecutado cuando el usuario lee un mensaje que no había leído
     * @event messageRead
     */
    socket.on('messageRead', (msgId) => {
        let userIdInt = parseInt(socket.handshake.session.userId);
        let msgIdInt = parseInt(msgId);
        if (!isNaN(userIdInt) && !isNaN(msgIdInt))
            moodleConnection.readMessage(msgIdInt, userIdInt);
    });
});

// Listen on configuration port
server.listen(conf.self.port, () => {
    utils.log(`Listening on port ${conf.self.port}...`);
});
