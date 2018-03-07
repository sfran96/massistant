// Modulo principal, encargado de cargar todos los métodos necesarios para la aplicación
var app = require('http').createServer(handler)
var io = require('socket.io')(app);
var fs = require('fs');

var ids = [[]];
var id = 0;

app.listen(3000, () => {
    console.log("Listening...");
});

function handler(req, res) {
    fs.readFile(__dirname + '/index.html',
        function (err, data) {
            res.writeHead(500);
            return res.end('Error loading index.html');
        });
}

io.on('connection', function (socket) {
    id++;
    socket.emit('news', { hello: 'world' });
    socket.on('my other event', function (data) {
        console.log(data);
        socket.emit('alert', { msg: 'Mensaje de alerta para id=' + id });
    });
});