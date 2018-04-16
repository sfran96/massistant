/** Archivo de configuración **/
const conf = require('./conf.json');// Opciones del submenú de la asignatura

var courseMenu = [
    { name: "Inicio", option: "home"},
    { name: "Buscar (beta)", option: "search"},
    { name: "Navegar", option: "navigate"},
    { name: "Calificaciones", option: "califications"},
    { name: "Profesores", option: "teachers"},
    { name: "Menú global", option: "global"}
]
// Opciones del submenú de los mensajes
var messageMenu = [
    { name: "Abrir", option: "open" },
    { name: "Responder" , option: "reply"},
    { name: "Redactar", option: "write" },
    { name: "Eliminar", option: "delete" },
    { name: "Menú global", option: "global"}
]
// Opciones del menú global
var globalMenu = [
    { name: "Página principal", url: `${conf.self.host}/my`, type: "home" },
    { name: "Asignaturas", url: undefined, type: "course" },
    { name: "Mensajes", url: `${conf.self.host}/message/index.php`, type: "message" },
    { name: "Calificaciones", url: `${conf.self.host}/grade/report/overview/index.php`, type: "clasification" },
    { name: "Desplegar menú", url: undefined, type: "menu_toggle" },
    { name: "Configuración", url: undefined, type: "config" },
    { name: "Sobre MA", url: undefined, type: "about" }
]

// Menú devuelto en petición
var menus = {
    courseMenu, messageMenu, globalMenu
}

module.exports = {
    menus
}