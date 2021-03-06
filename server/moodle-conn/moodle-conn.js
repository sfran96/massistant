/**
 * @author Francis Santos Liranzo <francis.santosd@alumnos.upm.es>
 * @version 0.8
 * @namespace MoodleConnection
 */

var mysql = require('mysql');
var conf = require('../conf.json');
const utils = require('../utils/utils');

var connection = mysql.createPool({
    connectionLimit: 50,
    host: conf.sql.host,
    user: conf.sql.user,
    password: conf.sql.password,
    database: conf.sql.sql_moodle_db
});

/**
 * Función encargada de comprobar si el usuario que solicita la petición HTTP se encuentra con una sesión iniciada según Moodle
 * @param {string} moodCookValue Valor de la sesión
 * @param {string} callerIP IP del solicitante
 * @param {function(string)} callback Función a llamar cuando se obtena el resultado de la consulta SQL
 * @method isUserLoggedIn
 * @memberOf MoodleConnection
 */
function isUserLoggedIn(moodCookValue, callerIP, callback) {
    if (moodCookValue !== undefined && callback !== undefined && typeof callback === 'function') {
        connection.query(`SELECT * FROM mdl_sessions WHERE sid LIKE ? AND timemodified > (UNIX_TIMESTAMP()-15*60*60) AND (? LIKE CONCAT('%',firstip) OR ? LIKE CONCAT('%',lastip))`, [moodCookValue, callerIP, callerIP], (error, results, fields) => {
            if (error) manageError(error);
            // Si hay resultados
            else if (results != undefined && results.length > 0 && results[0].userid !== 0) {
                callback(results[0].userid);
            }
        });
    }
}

/**
 * Función para obtener las asignaturas que tiene un usuario matriculado
 * @param {number} userId Identificador del usuario
 * @param {function(subjectsSql)} callback Función a llamar cuando se obtena el resultado de la consulta SQL
 * @method retrieveUserCourses
 * @memberOf MoodleConnection
 */
function retrieveUserCourses(userId, callback) {
    if (userId !== undefined && callback !== undefined && typeof callback === 'function') {
        let fechaActual = Date.now();
        connection.query("SELECT courses.id, courses.fullname FROM `mdl_course` AS `courses`" +
            " INNER JOIN `mdl_enrol` AS `user_asig` ON user_asig.courseid = courses.id" +
            " INNER JOIN `mdl_user_enrolments` AS `user_enr` ON user_enr.enrolid = user_asig.id" +
            " WHERE user_enr.userid LIKE ?" +
            " AND user_enr.timestart <= ?" +
            " AND (user_enr.timeend > ? OR user_enr.timeend = 0)", [userId, fechaActual, fechaActual], (error, results, fields) => {
                if (error) manageError(error);
                else {
                    if (results != undefined && results.length > 0) {
                        callback(results);
                    } else {
                        callback([]);
                    }
                }
            });
    }
}

/**
 * Función que obtiene un id del curso en el que se encuentra un usuario según
 * @param {string} moduleName Nombre del módulo
 * @param {number} courseId Id del curso
 * @param {function(subjectId)} callback Función a llamar cuando se obtena el resultado de la consulta SQL
 * @method getCourse
 * @memberOf MoodleConnection
 */
function getCourse(moduleName, courseId, callback) {
    if (courseId !== undefined && callback !== undefined && moduleName !== undefined && typeof callback === 'function') {
        connection.query("SELECT mcm.course FROM `mdl_course_modules` AS mcm" +
            " INNER JOIN `mdl_modules` AS mm" +
            " ON mcm.module = mm.id" +
            " WHERE mcm.id = ?" +
            "AND mm.name = ?", [courseId, moduleName], (error, results, fields) => {
                if (error) manageError(error);
                else {
                    if (results != undefined && results.length > 0) {
                        callback(results[0].course);
                    } else {
                        callback();
                    }
                }
            });
    }
}

/**
 * Llama a la función 'callback' pasando como parámetro el array de notas, nota => {description, finalGrade, maxGrade}
 * @param {number} userId Id del usuario
 * @param {number} courseId Id del curso 
 * @param {function(Object)} callback Función a llamar cuando se obtena el resultado de la consulta SQL
 * @method getGrades
 * @memberOf MoodleConnection
 */
function getGrades(userId, courseId, callback) {
    if (courseId !== undefined && callback !== undefined && userId !== undefined && typeof callback === 'function') {
        connection.query("SELECT mgi.itemname, mgg.finalgrade, mgi.grademax, mgi.itemtype FROM `mdl_grade_items` AS mgi" +
            " INNER JOIN `mdl_grade_grades` AS mgg" +
            " ON mgi.id = mgg.itemid" +
            " WHERE userid = ?" +
            " AND mgi.courseid = ? " +
            " AND (mgg.hidden != 1 OR mgg.hidden > UNIX_TIMESTAMP())" +
            " AND (mgi.hidden != 1 OR mgi.hidden > UNIX_TIMESTAMP())" +
            " ORDER BY mgi.itemtype DESC", [userId, courseId], (error, results, fields) => {
                if (error) manageError(error);
                else {
                    if (results !== undefined && results.length > 0) {
                        // Objeto a devolver
                        let arrayOfObjects = [];
                        for (i = 0; i < results.length; i++) {
                            let grade = results[i];
                            let auxGradeObject = {};
                            // Sacamos la descripción de la nota, es decir, de qué es la nota
                            if (grade.itemname !== undefined && grade.itemname !== null) auxGradeObject.description = grade.itemname;
                            else if ((grade.itemname === undefined || grade.itemname === null) && grade.itemtype === 'course') auxGradeObject.description = 'la nota de la asignatura';
                            // Nota obtenida
                            auxGradeObject.finalGrade = grade.finalgrade;
                            // Nota máxima
                            auxGradeObject.maxGrade = grade.grademax;
                            arrayOfObjects.push(auxGradeObject);
                        }
                        callback(arrayOfObjects)
                    } else
                        callback([]);
                }
            });
    }
}

/**
 * Función para obtener la información acerca de los profesores de una asignatura
 * @param {number} courseId Id de la asignatura
 * @param {function(Object)} callback Función a llamar cuando se obtena el resultado de la consulta SQL
 * @memberOf MoodleConnection
 */
function getTeachers(courseId, callback) {
    if (courseId !== undefined && callback !== undefined && typeof callback === 'function') {
        connection.query(`SELECT DISTINCT mu.id, mu.firstname, mu.lastname, mu.email FROM mdl_user AS mu 
        INNER JOIN mdl_role_assignments AS mra
        ON mra.userid = mu.id
        INNER JOIN mdl_role AS mr
        ON mr.id = mra.roleid
        INNER JOIN mdl_user_enrolments AS mue
        ON mue.userid = mu.id
        INNER JOIN mdl_enrol AS me
        ON me.id = mue.enrolid
        WHERE me.courseid = ? AND mr.archetype LIKE '%teacher'`, [courseId], (error, results, fields) => {
                if (error) manageError(error);
                else {
                    if (results !== undefined && results.length > 0) {
                        let teachersA = [];
                        callback(results);
                    } else {
                        callback();
                    }
                }
            });
    } else {
        callback();
    }
};

/**
 * Función para obtener los mensajes de un usuario
 * @param {number} userId Identificador del usuario
 * @param {function(Object)} callback Función a llamar cuando se obtena el resultado de la consulta SQL
 * @memberOf MoodleConnection
 */
function getMessages(userId, callback) {
    if (userId !== undefined && typeof userId === 'number') {
        // Primero leemos los leídos
        let messages = {};
        connection.query(`SELECT * FROM mdl_message_read WHERE useridfrom = ? OR useridto = ? ORDER BY timecreated DESC`, [userId, userId], (error1, results1, fields1) => {
            if (error1) manageError(error1);
            else {
                if (results1 !== undefined) {
                    if (results1.length > 0) {
                        for (i = 0; i < results1.length; i++) {
                            let message = results1[i];
                            // Si el mensaje tiene como origen el usuario que lo solicita
                            if (message.useridfrom == userId) {
                                if (message.timeuserfromdeleted == 0) {
                                    // Si no se ha añadido al objeto de mensajes leídos se crea 
                                    if (messages[message.useridto] === undefined) {
                                        messages[message.useridto] = [];
                                    }
                                    // Exista o no, se habrá creado el array y se añadirán los mensajes
                                    messages[message.useridto].push({
                                        id: message.id,
                                        user1: message.useridfrom,
                                        user2: message.useridto,
                                        message: message.smallmessage,
                                        read: 'unknown'
                                    });
                                }
                            } else {
                                if (message.timeusertodeleted == 0) {
                                    // Si no se ha añadido al objeto de mensajes leídos se crea 
                                    if (messages[message.useridfrom] === undefined) {
                                        messages[message.useridfrom] = [];
                                    }
                                    // Exista o no, se habrá creado el array y se añadirán los mensajes
                                    messages[message.useridfrom].push({
                                        id: message.id,
                                        user1: message.useridfrom,
                                        user2: message.useridto,
                                        message: message.smallmessage,
                                        read: true
                                    });
                                }
                            }
                        }
                    }
                    // Ahora los no leídos
                    connection.query(`SELECT * FROM mdl_message WHERE useridfrom = ? OR useridto = ? ORDER BY timecreated DESC`, [userId, userId], (error2, results2, fields2) => {
                        if (error2) manageError(error2);
                        else {
                            if (results2 !== undefined)
                                if (results2.length > 0) {
                                    for (j = 0; j < results2.length; j++) {
                                        let message = results2[j];
                                        // Si el mensaje tiene como origen el usuario que lo solicita
                                        if (message.useridfrom == userId) {
                                            if (message.timeuserfromdeleted == 0) {
                                                // Si no se ha añadido al objeto de mensajes leídos se crea 
                                                if (messages[message.useridto] === undefined) {
                                                    messages[message.useridto] = [];
                                                }
                                                // Exista o no, se habrá creado el array y se añadirán los mensajes
                                                messages[message.useridto].push({
                                                    id: message.id,
                                                    user1: message.useridfrom,
                                                    user2: message.useridto,
                                                    message: message.smallmessage,
                                                    read: 'unknown'
                                                });
                                            }
                                        } else {
                                            if (message.timeusertodeleted == 0) {
                                                // Si no se ha añadido al objeto de mensajes leídos se crea 
                                                if (messages[message.useridfrom] === undefined) {
                                                    messages[message.useridfrom] = [];
                                                }
                                                // Exista o no, se habrá creado el array y se añadirán los mensajes
                                                messages[message.useridfrom].push({
                                                    id: message.id,
                                                    user1: message.useridfrom,
                                                    user2: message.useridto,
                                                    message: message.smallmessage,
                                                    read: false
                                                });
                                            }
                                        }
                                    }
                                }
                            callback(messages);
                        }
                    });
                } else {
                    callback();
                }
            }
        });
    }
}

/**
 * Función que se encarga de obtener información acerca de un usuario
 * @param {number} userId Identificador del usuario a buscar
 * @param {function} callback Función a llamar cuando se obtena el resultado de la consulta SQL
 * @memberOf MoodleConnection
 */
function getUserInfo(userId, callback) {
    if (userId !== undefined && typeof userId === 'number' && callback !== undefined && typeof callback === 'function') {
        connection.query("SELECT id, firstname, lastname, email FROM mdl_user WHERE id = ?", [userId], (error, results, fields) => {
            // Hay error
            if (error) manageError(error);
            // No hay error
            else {
                // Existen resultados
                if (results !== undefined && results.length === 1) {
                    callback(results[0]);
                }
            }
        });
    } else {
        callback();
    }
}

/**
 * Función para notificar que un mensaje ha sido leído por un usuario y que se proceda a pasar a la bandeja de leídos
 * @param {string} msgId Id del mensaje
 * @param {number} userId Id del usuario
 * @memberOf MoodleConnection
 */
function readMessage(msgId, userId) {
    if (userId !== undefined && typeof userId === 'number' && msgId !== undefined && typeof msgId === 'number') {
        connection.query("SELECT * FROM mdl_message WHERE id = ? AND useridto = ?", [msgId, userId], (error, results, fields) => {
            // Hay error
            if (error) manageError(error);
            // No hay error
            else {
                // Copiar en la tabla de leídos
                if (results !== undefined && results.length === 1) {
                    let message = results[0];
                    delete message.id;
                    message.timeread = Date.now();
                    connection.query(`INSERT INTO mdl_message_read (useridfrom, useridto, subject, fullmessage, fullmessageformat, fullmessagehtml, smallmessage, notification, contexturl, contexturlname, timecreated, timeread, timeuserfromdeleted, timeusertodeleted) VALUES (${message.useridfrom},${message.useridto},'${message.subject}','${message.fullmessage}',${message.fullmessageformat},'${message.fullmessagehtml}','${message.smallmessage}',${message.notification},'${message.contexturl}','${message.contexturlname}',${message.timecreated},${message.timeread},${message.timeuserfromdeleted},${message.timeusertodeleted});`, (error, results, fields) => {
                        if (error) manageError(error);
                        else {
                            connection.query(`DELETE FROM mdl_message WHERE id = ? AND useridto = ?`, [msgId, userId], (error, results, fields) => {
                                if (error) manageError(error);
                            });
                        }
                    })
                }
            }
        });
    }
}

/**
 * Función que se ejecuta cuando ocurre cualquier error SQL
 * @param {MysqlError} error Objeto del error
 * @memberOf MoodleConnection
 */
function manageError(error) {
    utils.log("[ERROR]: Ha ocurrido un problema al intentar realizar la petición.\n" + error.message);
    if (error.sql)
        utils.log("SQL: " + error.sql);
}

module.exports = {
    isUserLoggedIn, retrieveUserCourses, getCourse, getGrades, getTeachers, getMessages, getUserInfo, readMessage
}