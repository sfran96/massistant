/** Archivo de configuración **/
const conf = require('./conf.json');// Opciones del submenú de la asignatura

var courseMenu = [
    { name: "Inicio", option: "home" },
    { name: "Buscar (beta)", option: "search" },
    { name: "Navegar", option: "navigate" },
    { name: "Calificaciones", option: "califications" },
    { name: "Profesores", option: "teachers" },
    { name: "Menú global", option: "global" }
]
// Opciones del submenú de los mensajes
var messageMenu = [
    { name: "Abrir", option: "open" },
    { name: "Responder", option: "reply" },
    { name: "Redactar", option: "write" },
    { name: "Eliminar", option: "delete" },
    { name: "Menú global", option: "global" }
]
// Opciones del menú de realización de un quiz
var quizMenu = [
    { name: "Responder pregunta", option: "answer" },
    { name: "Siguiente pregunta", option: "next" },
    { name: "Pregunta anterior", option: "previous" },
    { name: "Enviar cuestionario", option: "send" },
    { name: "Salir", option: "exit" }
]

// Opciones del menú global
var globalMenu = [
    { name: "Página principal", url: `${conf.self.host}/my`, type: "home" },
    { name: "Asignaturas", url: undefined, type: "course" },
    { name: "Mensajes", url: `${conf.self.host}/message/index.php`, type: "message" },
    { name: "Calificaciones", url: `${conf.self.host}/grade/report/overview/index.php`, type: "clasification" },
    { name: "Configuración", url: undefined, type: "config" },
    { name: "Sobre MA", url: undefined, type: "about" }
]

// Menús para el manejo de la página principal del quiz
var quizStartMenu = [
    { name: "Iniciar cuestionario", type: "start" },
    { name: "Inicio de la asignatura", type: "home" }
];
var quizResumeMenu = [
    { name: "Reanudar cuestionario", type: "resume" },
    { name: "Inicio de la asignatura", type: "home" }
]
var quizFinishMenu = [
    { name: "Enviar solución del cuestionario", type: "send" },
    { name: "Cambiar alguna resultado", type: "change" },
    { name: "Reiniciar cuestionario", type: "restart" },
    { name: "Salir sin realizar ningún cambio", type: "exit" }
]

// Menú devuelto en petición
var menus = {
    courseMenu, messageMenu, quizMenu, globalMenu, quizStartMenu, quizResumeMenu, quizFinishMenu
}

module.exports = {
    menus
}