/** Archivo de configuración **/
const conf = require('./conf.json');// Opciones del submenú de la asignatura

var courseMenu = [
    { name: "Buscar (beta)", type: "bullet" },
    { name: "Navegar", type: "bullet" },
    { name: "Calificaciones", type: "bullet" },
    { name: "Profesores", type: "bullet" },
    { name: "Menú global", type: "bullet" }
]
// Opciones del submenú de los mensajes
var messageMenu = [
    { name: "Abrir" },
    { name: "Responder" },
    { name: "Redactar" },
    { name: "Eliminar" }
]
// Opciones del menú global
var globalMenu = [
    { name: "Página principal", url: `${conf.self.host}/my`, type: "home" },
    { name: "Asignaturas", url: undefined, type: "course", menu: courseMenu },
    { name: "Mensajes", url: `${conf.self.host}/message/index.php`, type: "message", menu: messageMenu },
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