/** Archivo de configuración **/
const conf = require('./conf.json');// Opciones del submenú de la asignatura

const courseMenu = [
    { name: "Inicio", option: "home" },
    { name: "Navegar", option: "navigate" },
    { name: "Calificaciones", option: "califications" },
    { name: "Profesores", option: "teachers" },
    { name: "Menú global", option: "global" }
]
// Opciones del submenú de los mensajes
const messageMenu = [
    { name: "Abrir", option: "open" },
    { name: "Responder", option: "reply" },
    { name: "Redactar", option: "write" },
    { name: "Eliminar", option: "delete" },
    { name: "Menú global", option: "global" }
]
// Opciones del menú global
const globalMenu = [
    { name: "Página principal", url: `${conf.self.host}/my`, type: "home" },
    { name: "Asignaturas", url: undefined, type: "course" },
    { name: "Mensajes", url: `${conf.self.host}/message/index.php`, type: "message" },
    { name: "Calificaciones", url: `${conf.self.host}/grade/report/overview/index.php`, type: "clasification" },
    { name: "Configuración", url: undefined, type: "config" },
    { name: "Sobre MA", url: undefined, type: "about" }
]

// Opciones del menú de manejo de entrega
const assignEditMenu = [
    { name: "Añadir fichero", option: "modify" },
    { name: "Eliminar fichero", option: "delete" },
    { name: "Guardar cambios", option: "save" },
    { name: "Cancelar", option: "cancel" },
    { name: "Menú de asignatura", option: "course" }
]

const assingMainMenu = [
    { name: "Editar entrega", option: "editAssig" },
    { name: "Menú de asignatura", option: "course" }
]

// Menú devuelto en petición
const menus = {
    courseMenu, messageMenu, globalMenu, assignEditMenu, assingMainMenu
}

module.exports = {
    menus
}