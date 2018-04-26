/**
 * Envuelve todo el sistema de MAssistant (Moodle Assistant)
 * @author Francis Santos <francis.santosd@alumnos.upm.es>
 * @version 0.8
 */
var MA = (() => {
    // Socket variable 
    var socket = io('https://massistant.ddns.net:3000');
    // Diccionario de menús
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
        { name: "Menú global", option: "global" }
    ]
    // Opciones del menú global
    const globalMenu = [
        { name: "Página principal", url: `${M.cfg.wwwroot}/my`, type: "home" },
        { name: "Asignaturas", url: undefined, type: "course" },
        { name: "Mensajes", url: `${M.cfg.wwwroot}/message/index.php`, type: "message" },
        { name: "Calificaciones", url: `${M.cfg.wwwroot}/grade/report/overview/index.php`, type: "clasification" },
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
    // Menú seleccionado (globalMenu por defecto)
    var menuOnUse;
    // Menús visitados
    var menuHistory = [];
    // Última vez clicado
    var lastClick;
    // Variable que controla si el usuario se encuentra escribiendo, por ejemplo, en una caja de texto
    var isOnInput = false;
    // Puntero del menú que se muestre por pantalla en cada momento
    var pointerMenu = -1;
    // Elementos del menu, que representan la versión DOM del objeto menuOnUse
    var menuItems;
    // Menú dinámico que contiene la información acerca de las asignaturas en las que está matriculado un usuario
    var subjectItems;
    // Menú dinámico que contiene la información acerca de los mensajes que ha recibido/enviado un usuario
    var messagesItems = [];
    // Interruptor que contiene información acerca de si el usuario se encuentra navegando una asignatura o no
    var navigatingSubject;
    // Identificador de la asignatura en la que se encuentra un usuario (si se encuentra en alguno de sus módulos)
    var courseId;
    // Usuarios sobre los que se ha conseguido obtener información tras la petición, utilizado, por ejemplo, cuando se solicitan los mensajes
    var usersWithInfo = 0;

    /**
     * Funcionalidades de los sockets
     */
    var Sockets = (function () {

        // Se ejecuta cuando el cliente pierde la conexión con el sistema
        socket.on('disconnect', (reason) => {
            // Pasado un tiempo (2.5s) desde la conexión el color del ícono que representa el sistema en el lado del cliente cambia de color para indicar un problema en la conexión,
            // a la vez que muestra un mensaje por pantalla (y reproduce su contenido si está configurado así por el usuario)
            setTimeout(() => {
                $(".massistant").css("background", "linear-gradient(14deg, rgba(184, 15, 15, 0.6) 0%, rgba(219, 66, 31, 0.6) 50%, rgba(232, 122, 44, 0.6) 100%)");
                if (localStorage.getItem("visibleMass"))
                    Massistant.showMessage("Se ha perdido la conexión con el servidor. Clica abajo para intentar restablecer la conexión.");
            }, 2500);
        });

        // Se ejecuta cuando el cliente se conecta de forma correcta con el sistema
        socket.on('connect', (reason) => {
            // Si el cliente se conecta y es identificado de forma correcta se cambia el color del ícono indicando que todo se ha realizado de forma correcta
            $(".massistant").css("background", "linear-gradient(14deg, rgba(15, 184, 173, 0.6) 0%, rgba(31, 200, 219, 0.6) 50%, rgba(44, 181, 232, 0.6) 100%)");
            $("#massistant_popup").css("visibility", "visible");
            socket.emit('checkUserPositionRequested', window.location.href);
        });

        // Se ejecuta cuando el cliente se reconecta con el sistema de forma correcta
        socket.on('reconnect', (attemtNumber) => {
            // Cambia de color al color normal y se notifica al usuario que se ha reestablecido la conexión de forma correcta
            $(".massistant").css("background", "linear-gradient(14deg, rgba(15, 184, 173, 0.6) 0%, rgba(31, 200, 219, 0.6) 50%, rgba(44, 181, 232, 0.6) 100%)");
            if (localStorage.getItem("visibleMass"))
                Massistant.showMessage("Se ha reestablecido la conexión correctamente.");
        });

        // Se ejecuta cuando el usuario recibe la información que había solicitado acerca de quién ha desarrollado el asistente
        socket.on('aboutReceived', (text) => {
            Massistant.showMessage(text, 20000);
        });

        // Se ejecuta para comprobar en qué página se encuentra el cliente en cada momento y qué menú mostrar en consecuencia
        socket.on('checkUserPositionReceived', (object) => {
            setTimeout(() => {
                if (object && object[0] === 'subjectMenu' && object.length > 1)
                    courseId = object[1];
                if (window.location.pathname.includes('message')) {
                    // Asignar que el menú a usar es el da las asignaturas
                    menuOnUse = menus.messageMenu;
                    socket.emit("messagesRequested");
                } else if (window.location.pathname.includes('assign/view.php')) {
                    if (window.location.search.includes('editsubmission') || M.form_filemanager)
                        menuOnUse = menus.assignEditMenu;
                    else
                        menuOnUse = menus.assingMainMenu;
                } else if ((typeof object !== 'undefined' && object[1]) || window.location.pathname.includes('course/view.php') || (window.location.pathname.includes('grade/report') && Utils.getQueryParam('id'))) {
                    // Asignar que el menú a usar es el da las asignaturas
                    menuOnUse = menus.courseMenu;
                    if (object && object[0] === 'subjectMenu' && object.length > 1)
                        courseId = object[1];
                    else
                        courseId = Utils.getQueryParam('id');
                } else {
                    // Asignar que el menú a usar es el global
                    menuOnUse = menus.globalMenu;
                }
                // Mostrar el menú
                Massistant.showMenu(menuOnUse);
            }, 500);
        });

        // Se ejecuta cuando el usuario recibe las asignaturas de las que está matricualdo
        socket.on('coursesReceived', (subjects) => {
            menus.userSubjects = subjects;
            if (menus.userSubjects != undefined && menus.userSubjects.length > 0) {
                // Preguntamos qué asignatura quiere visitar
                Massistant.showMessage("¿Qué asignatura quieres visitar?", 6000000);
                Massistant.getInMenu(menus.userSubjects);
            } else {
                Massistant.showMessage("Parece ser que no estás matriculado de ninguna asignatura.");
            }
        });

        // Se ejecuta cuando el usuario recibe la URL de calificaciones de la asignatura a la que quiere acceder
        socket.on('gradesReceived', (gradeObjectsArray) => {
            // Variable que contendrá el texto a mostrar en formato HTML, a la vez que será lo enviado a la API Text-To-Speech para reproducirlo si así lo ha permitido el cliente
            let tts;
            if (gradeObjectsArray !== undefined && gradeObjectsArray.length > 0) {
                tts = "Estas son las calificaciones que tienes en esta asignatura: <ul>";
                gradeObjectsArray.forEach((grade) => {
                    if (grade.finalGrade !== null)
                        tts += `<li>Un <strong>${grade.finalGrade} sobre ${grade.maxGrade}</strong> en ${grade.description}. </li>`;
                    else
                        tts += `<li><strong>Sin calificación</strong> asignada en ${grade.description}. </li>`;
                });
                tts += "</ul>";
            } else {
                tts = "No hay ninguna calificación asignada para esta asignatura.";
            }
            Massistant.showMessage(tts, 60000);
        });

        // Se ejecuta cuando el usuario recibe la información acerca de los profesores de una asignatura, que previamente ha solicitado
        socket.on('teachersInfoReceived', (teachers) => {
            if (teachers !== undefined && teachers !== null && teachers.length > 0) {
                let teachersInfoMenu = [];
                teachers.forEach((teacher) => {
                    teachersInfoMenu.push({
                        name: `${teacher.firstname} ${teacher.lastname}`,
                        url: `mailto:${teacher.email}`
                    });
                });
                Massistant.showMessage("Estos son los profesores de esta asignatura, selecciona uno si quieres enviarle un correo electrónico, serás redirigido a una aplicación externa.", 40000);
                Massistant.getInMenu(teachersInfoMenu);
            } else {
                Massistant.showMessage("Parece ser que no hay información disponible acerca de los profesores en estos momentos.");
            }
        });

        // Se ejecuta cuando el usuario recibe la información acerca de los mensajes que ha recibido
        socket.on('messagesReceived', (messages) => {
            messagesItems = [];
            if (messages !== undefined && typeof messages === 'object') {
                let usersId = Object.keys(messages);
                if (usersId.length > 0) {
                    for (i = 0; i < usersId.length; i++) {
                        if (usersId[i] >= 0) {
                            messagesItems.push({
                                "name": "...",
                                "id": usersId[i],
                                "messages": messages[usersId[i]]
                            });
                            socket.emit('userInfoRequested', usersId[i]);
                        }
                    }
                }
            }
        });

        // Se ejecuta cuando el usuario recibe la información acerca de otro usuario
        socket.on('userInfoReceived', (user) => {
            for (j = 0; j < messagesItems.length; j++) {
                if (messagesItems[j].id == user.id) {
                    messagesItems[j].name = `${user.firstname} ${user.lastname}`;
                    usersWithInfo++;
                    break;
                }
            }
            if (usersWithInfo === messagesItems.length) {
                usersWithInfo = 0;
            }
        });
    })();

    /**
     * Funcionalidades principales de MAssistant como:
     *  - Manejo de menús
     *  - Manejo de mensajes
     *  - Control de las preferencias del usuario
     */
    var Massistant = (() => {

        /**
         * Función para mostrar en forma de menú todas las opciones del objeto que se le proporciona
         * @typedef {{name:string,option?:string,url?:string,type?:string,any?:any}} menuObject
         * @param {menuObject} data Menú a mostrar
         */
        function showMenu(data) {
            if (data !== undefined) {
                // Representación HTML de la variable que se pasa como parametro para mostrarlo en el contenedor correspondiente
                var htmlRepresentation = "";
                data.forEach((value, index) => {
                    htmlRepresentation += `<div class="massistant_menu_option massistant_menu_option_${value.type}">${value.name}<\/div>`;
                });
                $("#massistant_menu_content").html(htmlRepresentation);
                $("#massistant_menu").css({ "visibility": "visible" });

                // Asignamos el valor a la "lista" utilizada para recorrer las opciones del menú
                menuItems = $("#massistant_menu div.massistant_menu_option");

                // Si el usuario tiene configurado que se muestre el asistente de sesiones anteriores
                if (localStorage.getItem("visibleMass")) {
                    $('#massistant').css({ "opacity": "1", "visibility": "visible" });
                    $("#massistant_popup").css({ "display": "block" });

                    // Si fue redirigido por alguna URL del MAssistant
                    var wasRedirected = (localStorage.getItem('wasRedirected') == 'true');
                    if (wasRedirected) {
                        Utils.textToSpeech("Has sido redirigido a la página con título:" + document.title);
                        localStorage.removeItem('wasRedirected');
                    }

                    if (menuOnUse == menus.courseMenu) {
                        Utils.textToSpeech("Estás en el menú de manejo de asignaturas");
                    } else if (menuOnUse == menus.messageMenu) {
                        Utils.textToSpeech("Estás en el menú de manejo de mensajes");
                    } else if (menuOnUse == menus.globalMenu) {
                        Utils.textToSpeech("Estás en el menú global");
                    }
                }
            } else {
                setTimeout(() => {
                    Massistant.showMenu(menuOnUse);
                }, 1000);
            }
        }

        /**
         * Muestra un mensaje durante un intervalo asignado
         * @param {string} message Mensaje a mostrar (acepta HTML)
         * @param {number} timeout Tiempo durante el cual se muestra el mensaje, por defecto son 10s
         */
        function showMessage(message, timeout) {
            Utils.textToSpeech(message);
            $("#massistant_message").css("visibility", "visible");
            $("#massistant_message_content").empty().append(`<p id="massistant_menu_msg">${message}<\/p>`);
            setTimeout(() => {
                hideMessage();
            }, timeout || 10000);
        }

        /**
         * Oculta el mensaje y para la reproducción si se está reproduciendo
         */
        function hideMessage() {
            if (responsiveVoice.isPlaying())
                responsiveVoice.cancel();
            $("#massistant_message").css("visibility", "");
            $("#massistant_message_content").empty();
        }

        /**
         * Función que permite que el usuario navegue el menú, opción que hace que se desplace hasta
         * la opción superior a la actual
         */
        function goUpInTheMenu() {
            // Asignamos valor
            if (pointerMenu != 0 && pointerMenu != -1)
                pointerMenu = (pointerMenu - 1) % menuItems.length;
            else
                pointerMenu = menuItems.length - 1;
            highlightMenuItem(pointerMenu);
            unhighlightMenuItem(pointerMenu, false);
        }

        /**
         * Función que permite que el usuario navegue el menú, opción que hace que se desplace hasta
         * la opción inferior a la actual
         */
        function goDownInTheMenu() {
            // Asignamos valor
            pointerMenu = (pointerMenu + 1) % menuItems.length;
            highlightMenuItem(pointerMenu);
            unhighlightMenuItem(pointerMenu, true);

        }

        /**
         * Destaca la opción del menú que se está seleccionando en estos momento
         * @param {number} index posición actual del puntero
         */
        function highlightMenuItem(index) {
            setTimeout(() => {
                if (pointerMenu === index)
                    Utils.textToSpeech("Opción:" + menuOnUse[index].name);
            }, 300);
            $(menuItems[index]).css("color", "#21b8d1").css({ "font-size": "30px", "font-weight": "bold" });
        }

        /**
         * Deshace el destacar la opción que anteriormente estaba seleccionada
         * @param {number} index posición actual del puntero
         * @param {boolean} isPressingDown especifica si el usuario quiere ir hacia abajo o hacia arriba
         */
        function unhighlightMenuItem(index, isPressingDown) {
            if (menuItems.length > 1) {
                if (isPressingDown) {
                    if (index != -1 && index != 0) {
                        $(menuItems[index - 1]).css("color", "").css("font-size", "").css("font-weight", "");
                    } else {
                        $(menuItems[menuItems.length - 1]).css("color", "").css("font-size", "").css("font-weight", "");
                    }
                } else {
                    if (index !== menuItems.length - 1)
                        $(menuItems[index + 1]).css("color", "").css("font-size", "").css("font-weight", "");
                    else
                        $(menuItems[0]).css("color", "").css("font-size", "").css("font-weight", "");
                }
            }
        }

        /**
         * Opciones disponibles que se ejecutan cuando el usuario intenta acceder a alguna opción
         * del menú global
         */
        function globalGetInOptions() {
            switch (menuOnUse[pointerMenu].type) {
                case "course":
                    // Preguntamos por las asignaturas que tenemos guardadas
                    socket.emit('coursesRequested');
                    break;
                case "about":
                    socket.emit('aboutRequested');
                    break;
                default:
                    showMessage("Esta opción no está disponible en estos momentos.");
                    break;
            }
        }

        /**
         * Opciones disponibles que se ejecutan cuando el usuario intenta acceder a alguna opción
         * del menú de manejo de un curso/asignatura
         */
        function courseGetInOptions() {
            switch (menuOnUse[pointerMenu].option) {
                case "home":
                    if (localStorage.getItem('host') !== undefined && courseId !== undefined) {
                        window.location.replace(`${localStorage.getItem('host')}/course/view.php?id=${courseId}`);
                        localStorage.setItem("wasRedirected", true);
                    }
                    break;
                case "califications":
                    socket.emit('gradesRequested', courseId);
                    break;
                case 'teachers':
                    socket.emit('teachersInfoRequested', courseId);
                    break;
                case "navigate":
                    if (window.location.pathname.includes('course/view.php')) {
                        showMessage("Para volver presiona la flecha con dirección izquierda.", 600000);
                        $("body").off('keyup');
                        $('body').on('keyup', CourseNav.keyUpEventFunction);
                    } else {
                        showMessage('No es posible realizar esta acción desde este espacio.');
                    }
                    break;
                case "global":
                    getInMenu(menus.globalMenu);
                    break;
                default:
                    showMessage("Esta opción no está disponible en estos momentos.");
                    break;
            }
        }

        /**
         * Opciones disponibles que se ejecutan cuando el usuario intenta acceder a alguna opción
         * del menú de manejo de mensajes
         */
        function messagesGetInOptions() {
            switch (menuOnUse[pointerMenu].option) {
                case "open":
                    Massistant.getInMenu(messagesItems);
                    menuOnUse.forEach((mI) => {
                        mI.option = "open_read";
                    })
                    break;
                case "open_read":
                    let tts = "Se leerán los últimos diez mensajes de la conversación: </br></br>";
                    for (i = 0; i < menuOnUse[pointerMenu].messages.length && i < 10; i++) {
                        message = menuOnUse[pointerMenu].messages[i];
                        let estado = "";
                        if (message.read == false)
                            estado = "(Sin leer) ";
                        if (menuOnUse[pointerMenu].id == message.user1) {
                            tts += `<strong>${estado}Recibiste:</strong> ${message.message}. </br>`;
                            if (message.read == false)
                                socket.emit('messageRead', message.id);
                        } else {
                            tts += `<strong>Escribiste:</strong> ${message.message}. </br>`;
                        }
                    }
                    tts += "</ul>";
                    showMessage(tts, 120000);
                    break;
                case "global":
                    getInMenu(menus.globalMenu);
                    break;
                default:
                    showMessage("Esta opción no está disponible.");
                    break;
            }
        }

        /**
         * Opciones disponibles que se ejecutan cuando el usuario intenta acceder a alguna opción
         * del menú de manejo de entregas
         */
        function assignEditGetInOptions() {
            switch (menuOnUse[pointerMenu].option) {
                case "editAssig":
                    let editBttn = $("input[type='submit']");
                    if (editBttn.length > 0)
                        editBttn[0].click();
                    else
                        showMessage("No es posible modificar esta entrega");
                    break;
                case "modify":
                    let addFileButton = $("div[class='fp-btn-add']");
                    if (addFileButton.length > 0 && $("div[class='fp-btn-add']").css("display") !== "none") {
                        $("div[class='fp-btn-add']")[0].click();
                        // Añadimos un handler para cuando se termine de realizar el cambio de subida o no de fichero
                        showMessage("En breves se abrirá una ventana externa para que elijas el fichero que quieres subir.");
                        setTimeout(() => {
                            $("input[name='repo_upload_file']").change((focusEvent) => {
                                $("button[class*='fp-upload-btn']")[0].click();
                                hideMessage();
                            });
                            $("input[name='repo_upload_file']")[0].click();
                        }, 1000);
                    } else {
                        showMessage("Actualmente el máximo número de ficheros existe en esta entrega");
                    }
                    break;
                case "delete":
                    let filesToDelete = $("div[class='fp-file fp-hascontextmenu']");
                    if (filesToDelete.length > 0) {
                        $("div[class='fp-file fp-hascontextmenu']")[0].click();
                        $("button[class='fp-file-delete']")[0].click()
                        $("button[class='fp-dlg-butconfirm btn-primary btn']").click();
                    } else {
                        showMessage("No hay ficheros para eliminar en este momento.");
                    }
                    break;
                case "save":
                    let filesToUpload = $("div[class='fp-file fp-hascontextmenu']");
                    if (filesToUpload.length > 0) {
                        $("#id_submitbutton").click();
                    } else {
                        showMessage("Sube un fichero antes de enviar la entrega.");
                    }
                    break;
                case "cancel":
                    $("#id_cancel").click();
                    break;
                case "course":
                    getInMenu(menus.courseMenu);
                    break;
                default:
                    showMessage("Esta opción no está disponible en estos momentos.");
                    break;
            }
        }

        /**
         * Controlador de opciones según el menú usado en cada momento
         */
        function getInTheItemOption() {
            if (pointerMenu != -1) {
                // Si es una URL                
                if (menuOnUse[pointerMenu].url) {
                    window.location.replace(menuOnUse[pointerMenu].url);
                    localStorage.setItem("wasRedirected", true);
                }
                // Acciones que difieren por tipo de menú
                else {
                    // Si es el menú global
                    if (menuOnUse === menus.globalMenu) {
                        globalGetInOptions();
                    }
                    // Si es el menú de encontrar curso
                    else if (menuOnUse === menus.userSubjects) {
                        (() => { })(); // Nada
                    }
                    // Si es el menú de dentro de un curso
                    else if (menuOnUse === menus.courseMenu) {
                        courseGetInOptions();
                    }
                    // Si es el menú de los mensajes
                    else if (menuOnUse === menus.messageMenu || menuOnUse === messagesItems) {
                        messagesGetInOptions();
                    }
                    // Si es el menú de control de entregas
                    else if (menuOnUse === menus.assignEditMenu || menuOnUse === menus.assingMainMenu) {
                        assignEditGetInOptions();
                    }
                }
            }
        }

        /**
         * Introduce al usuario en el menú que se pasa como argumento, guardando los datos acerca
         * del menú en el que se encontraba anteriormente
         * @param {menuObject} menu Menú en el que se quiere navegar
         */
        function getInMenu(menu) {
            // Guardamos en qué menú nos encontrabamos en primer momento y en qué posición
            menuHistory.push({ position: pointerMenu, menu: menuOnUse });
            // Asignamos qué menú se muestra en estos momentos
            menuOnUse = menu;
            // Mostramos el menú
            showMenu(menuOnUse);
            // Puntero a cero
            pointerMenu = -1;
            Utils.textToSpeech("Para volver al menú anterior presiona la flecha con dirección izquierda");
        }

        /**
         * Función que controla qué hacer con el tecleo del usuario
         * @param {KeyboardEvent} event Evento que ha desencadenado esta llamada
         */
        function keyUpEventFunction(event) {
            if (!isOnInput && socket.connected && !socket.disconnected) {
                switch (event.keyCode) {
                    // m
                    case 77:
                        doubleClickMA();
                        break;
                    // Left
                    case 37:
                        if (localStorage.getItem("visibleMass") && menuHistory.length !== 0) {
                            // Recogemos la información del menú anterior
                            let previousMenuInfo = menuHistory.pop();
                            // Recogemos el menú
                            menuOnUse = previousMenuInfo.menu;
                            // Recogemos el puntero
                            pointerMenu = previousMenuInfo.position;
                            // Mostramos el menú y destacamos la opción en la que ha entrado previamente
                            showMenu(menuOnUse);
                            highlightMenuItem(pointerMenu);

                            // Ocultar mensaje si está mostrandose alguno
                            hideMessage();
                        }
                        break;
                    // Up
                    case 38:
                        if (localStorage.getItem("visibleMass")) {
                            event.preventDefault();
                            goUpInTheMenu();
                        }
                        break;
                    // Right
                    case 39:
                        if (localStorage.getItem("visibleMass")) {
                            event.preventDefault();
                            // Ocultar mensaje si está mostrandose alguno
                            hideMessage();
                            getInTheItemOption();
                        }
                        break;
                    // Down
                    case 40:
                        if (localStorage.getItem("visibleMass")) {
                            event.preventDefault();
                            goDownInTheMenu();
                        }
                        break;
                }
            }
        }

        /**
         * Función que controla qué hacer con el tecleo del usuario
         * @param {KeyboardEvent} event Evento que ha desencadenado esta llamada
         */
        function keyDownEventFunction(event) {
            if (!isOnInput && socket.connected && !socket.disconnected) {
                switch (event.keyCode) {
                    case 37:
                    case 38:
                    case 39:
                    case 40:
                    case 77:
                        if (localStorage.getItem("visibleMass"))
                            event.preventDefault();
                        break;
                }
            }
        }

        /**
         * Función que se ejecuta cuando el usuario realiza un doble click en el ícono,
         * desencadena una ocultación o aparición del menú
         */
        function doubleClickMA() {
            if (!localStorage.getItem("visibleMass")) {
                localStorage.setItem("visibleMass", true);
                $('#massistant').css({ "opacity": "1", "visibility": "visible" });
                $('#massistant > div').css({ "visibility": "" });
                $('#massistant_popup').css({ "display": "block" });
                showMenu(menuOnUse);
            }
            else {
                if (responsiveVoice.isPlaying())
                    responsiveVoice.cancel();
                $('#massistant').css({ "opacity": "", "visibility": "" });
                $('#massistant_popup').css({ "display": "none" });
                localStorage.removeItem("visibleMass");
            }
        }

        /**
         * Función que se ejecuta cuando el usuario realiza un click en el ícono,
         * principalmente para la reconexión del asistente
         */
        function onclickma() {
            // ¿Es doble click?
            let newClick = Date.now();
            if (socket.connected && !socket.disconnected && lastClick != undefined && newClick - lastClick < 200) {
                doubleClickMA();
            }
            // Forzar reconexión
            else if (socket.disconnected) {
                socket.open();
                setTimeout(() => {
                    if (socket.connected)
                        showMessage("Se ha reestablecido la conexión correctamente.");
                }, 200);
            }
            lastClick = Date.now();
        };

        return {
            showMenu, showMessage, hideMessage, highlightMenuItem, keyUpEventFunction, keyDownEventFunction, onclickma, getInMenu, doubleClickMA
        }
    })();

    /**
     * Módulo que contiene opciones como:
     *  - Text-to-speech
     *  - Obtención de parámetro de la consulta (query) presente en la URL
     */
    var Utils = (() => {

        // Realiza la función de reproducir el audio
        function textToSpeech(text) {
            if (responsiveVoice.isPlaying())
                responsiveVoice.cancel();
            var regex = /(<([^>]+)>)/ig;
            textNoHTML = text.replace(regex, "");
            responsiveVoice.speak(textNoHTML, "Spanish Female");
        }

        /**
         * Función que recoge el parámetro que le indiques de la URL
         * @typedef {(string|undefined)} qConsulta
         * @param {string} name Nombre del parámetro a recoger
         * @returns {qConsulta} Valor del parámetro en la consulta
         **/
        function getQueryParam(name) {
            let paramsString = window.location.search.replace('?', '');
            // Si soporta URLSearchParams
            if (typeof URLSearchParams !== 'undefined') {
                let paramsObjectController = new URLSearchParams(paramsString);
                if (paramsObjectController.has(name))
                    return paramsObjectController.get(name);
            }
            // Retrocompatibilidad
            else {
                let paramsArray = paramsString.split('&');
                let valueReturned;
                paramsArray.forEach((param, number) => {
                    let key = param.split('=')[0];
                    let value = param.split('=')[1];
                    if (key === name) {
                        valueReturned = value;
                    }
                });
                return valueReturned;
            }
        }

        return {
            textToSpeech, getQueryParam
        }
    })();

    /**
     * Módulo que contiene las opciones de navegar dentro de un curso
     */
    var CourseNav = (() => {
        // Puntero con la información de dónde se encuentra el usuario en cada momento
        let pointer = -1;

        /**
         * Navega al siguiente elemento, capaz de recorrerlo en forma de módulo
         */
        function nextItem() {
            pointer = (pointer + 1) % subjectItems.length;
            if (pointer != 0)
                $(subjectItems[pointer - 1]).css("border", "").css("padding", "");
            else if (pointer == 0)
                $(subjectItems[subjectItems.length - 1]).css("border", "").css("padding", "");
            $(subjectItems[pointer]).css("border", "1px black solid").css("padding", "10px");

            let text = $(subjectItems[pointer]).children("a").text();
            Utils.textToSpeech(text);
        }

        /**
         * Navegar al elemento anterior, capaz de recorrerlo en forma de módulo
         */
        function previousItem() {
            // Asignamos valor
            if (pointer != 0 && pointer != -1)
                pointer = (pointer - 1) % subjectItems.length;
            else
                pointer = subjectItems.length - 1;
            if (pointer == subjectItems.length - 1) {
                $(subjectItems[0]).css("border", "").css("padding", "");
                $(subjectItems[pointer]).css("border", "1px black solid").css("padding", "10px");
            } else {
                $(subjectItems[pointer + 1]).css("border", "").css("padding", "");
                $(subjectItems[pointer]).css("border", "1px black solid").css("padding", "10px");
            }

            let text = $(subjectItems[pointer]).children("a").text();
            Utils.textToSpeech(text);
        }

        /**
         * Función que controla qué hacer con el tecleo del usuario
         * @param {KeyboardEvent} event Evento que ha desencadenado esta llamada
         */
        function keyUpEventFunction(event) {
            if (!isOnInput && socket.connected && !socket.disconnected) {
                switch (event.keyCode) {
                    // Left
                    case 37:
                        if (localStorage.getItem("visibleMass")) {
                            $("body").off('keyup');
                            $("body").on('keyup', Massistant.keyUpEventFunction);
                            pointer = -1;
                            subjectItems.css("border", "").css("padding", "");
                            Massistant.hideMessage();
                            Utils.textToSpeech("Vuelves a estar en el menú de manejo de asignaturas");
                        }
                        break;
                    // Up
                    case 38:
                        if (localStorage.getItem("visibleMass")) {
                            previousItem();
                        }
                        break;
                    // Right
                    case 39:
                        if (localStorage.getItem("visibleMass")) {
                            let nw = window.open($(subjectItems[pointer]).children("a")[0].href);
                            if (!nw)
                                window.location.replace($(subjectItems[pointer]).children("a")[0].href);
                            else
                                Utils.textToSpeech("Has abierto una nueva pestaña, cierrala para volver a Moodle.");
                        }
                        break;
                    // Down
                    case 40:
                        if (localStorage.getItem("visibleMass")) {
                            nextItem();
                        }
                        break;
                }
            }
        }

        return {
            keyUpEventFunction
        }
    })();

    // Opciones cargadas cuando el DOM se encuentra totalmente cargado
    $('document').ready(() => {

        // Asignar los eventos de click
        $('#massistant_icon').on('click', Massistant.onclickma);
        $('#massistant_message_close_btn').on('click', Massistant.hideMessage);
        $('#massistant_menu_close_btn').on('click', Massistant.doubleClickMA());

        $('input').focusin(() => {
            isOnInput = true;
        });

        $('input').focusout(() => {
            isOnInput = false;
        });

        $('textarea').focusin(() => {
            isOnInput = true;
        });

        $('textarea').focusout(() => {
            isOnInput = false;
        });

        // Ejecutado únicamente cuando se levanta el dedo de la tecla
        $('body').keyup(Massistant.keyUpEventFunction);
        $('body').keydown(Massistant.keyDownEventFunction);

        // Guardamos todos los elementos importantes para la navegación
        subjectItems = $(".activityinstance");
    });
})();