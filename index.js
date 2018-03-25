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

io.on('connection', function (socket) {

    // Comprobar que está con una sesión iniciada
    socket.on('amIOnline', (data) => {
        if (data.cookie !== "" || data.cookie !== undefined) {
            moodleConn.IsUserLoggedIn(data.cookie, (userId) => {
                socket.join(userId);
                socket.emit('joined', { message: "Te has unido correctamente a la sala del usuario con Id: " + userId });
            });
        }
    });

    socket.on('broadcast-it', (data) => {
        // Obtener la room del usuario
        var rooms = Object.keys(socket.rooms);
        if (rooms.length > 1) {
            socket.to(rooms[1]).emit('broadcast-msg', data);
            console.log("MESSAGE SENT to room " + rooms[1]);
        }
    });
});

// Listen on configuration port
server.listen(conf.self.port, () => {
    console.log(`Listening on port ${conf.self.port}...`);
});