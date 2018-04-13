/** Archivo de configuración **/
const conf = require('./conf.json');// Opciones del submenú de la asignatura

var courseMenu = [
    { name: "Abrir", option: "open", type: "bullet" },
    { name: "Buscar (beta)", option: "search", type: "bullet" },
    { name: "Navegar", option: "navigate", type: "bullet" },
    { name: "Calificaciones", option: "califications", type: "bullet" },
    { name: "Profesores", option: "teachers", type: "bullet" },
    { name: "Menú global", option: "global", type: "bullet" }
]
// Opciones del submenú de los mensajes
var messageMenu = [
    { name: "Abrir" },
    { name: "Responder" },
    { name: "Redactar" },
    { name: "Eliminar" },
    { name: "Menú global", option: "global", type: "bullet" }
]
// Opciones del menú global
var globalMenu = [
    { name: "Página principal", url: `${conf.self.host}/my`, type: "home" },
    { name: "Asignaturas", url: undefined, type: "course" },
    { name: "Mensajes", url: `${conf.self.host}/message/index.php`, type: "message" },
    { name: "Calificaciones", url: `${conf.self.host}/grade/report/overview/index.php`, type: "clasification" },
    { name: "Desplegar menú", url: undefined, type: "menu_toggle" },
    { name: "Presentación", url: undefined, type: "config" },
    { name: "Sobre MA", url: undefined, type: "about" }
]

// Menú devuelto en petición
var menus = {
    courseMenu, messageMenu, globalMenu
}

module.exports = {
    menus
}