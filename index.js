// Modulo principal, encargado de cargar todos los métodos necesarios para la aplicación
const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server, {
    pingTimeout: 5000
});
const conf = require('./conf.json');
const moodleConn = require('./moodle-conn/moodle-conn');

// TODO: remove later
app.get('/test', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/', (req, res) => {
    res.end("Nothing to see here.");
});

io.use((socket, next) => {
    // Comprobamos que tiene la cookie iniciada
    var cookieMoodle = getCookie("MoodleSession", socket.request.headers.cookie);
    if (cookieMoodle != "" || cookieMoodle != undefined) {
        moodleConn.IsUserLoggedIn(cookieMoodle, (userId) => {
            socket.join(userId);
            // Mensaje de bienvenida
            console.log(socket.request.headers.referer);
            if (socket.request.headers.referer.includes('login'))
                socket.emit('joined-welcome', "¡Bienvenido a Moodle!");
            else
                socket.emit('joined', {});
            next();
        });
    }
});

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
