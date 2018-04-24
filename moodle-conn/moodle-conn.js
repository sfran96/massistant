var mysql = require('mysql');
var conf = require('../conf.json');

var connection = mysql.createPool({
    connectionLimit: 50,
    host: conf.sql.host,
    user: conf.sql.user,
    password: conf.sql.password,
    database: conf.sql.sql_moodle_db
});

/**
 * Función encargada de comprobar si el usuario que solicita la petición HTTP se encuentra con una sesión iniciada según Moodle
 * @param {string} moodCookValue 
 * @param {function(string)} callback 
 */
function isUserLoggedIn(moodCookValue, callerIP, callback) {
    if (moodCookValue !== undefined && callback !== undefined && typeof callback === 'function') {
        connection.query(`SELECT * FROM mdl_sessions WHERE sid LIKE '${moodCookValue}' AND timemodified > (UNIX_TIMESTAMP()-15*60*60) AND ('%${callerIP}' LIKE firstip OR '%${callerIP}' LIKE lastip)`, (error, results, fields) => {
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
 * @param {number} userId 
 * @param {function(subjectsSql)} callback 
 */
function retrieveUserCourses(userId, callback) {
    if (userId !== undefined && callback !== undefined && typeof callback === 'function') {
        let fechaActual = Date.now();
        connection.query("SELECT courses.id, courses.fullname FROM `mdl_course` AS `courses`" +
            " INNER JOIN `mdl_enrol` AS `user_asig` ON user_asig.courseid = courses.id" +
            " INNER JOIN `mdl_user_enrolments` AS `user_enr` ON user_enr.enrolid = user_asig.id" +
            " WHERE user_enr.userid LIKE '" + userId +
            "' AND user_enr.timestart <= " + fechaActual +
            " AND (user_enr.timeend > " + fechaActual + " OR user_enr.timeend = 0)", (error, results, fields) => {
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
 * 
 * @param {string} moduleName 
 * @param {number} courseId 
 * @param {function(subjectId)} callback 
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
 * @param {number} userId 
 * @param {number} courseId 
 * @param {function(Object)} callback 
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
 * 
 * @param {number} courseId 
 * @param {function(Object)} callback 
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
 * 
 * @param {number} userId 
 * @param {function(Object)} callback
 */
function getMessages(userId, callback) {
    if (userId !== undefined && typeof userId === 'number') {
        // Primero leemos los leídos
        let messages = {};
        connection.query(`SELECT * FROM mdl_message_read WHERE useridfrom = ${userId} OR useridto = ${userId} ORDER BY timecreated DESC`, (error1, results1, fields1) => {
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
                    connection.query(`SELECT * FROM mdl_message WHERE useridfrom = ${userId} OR useridto = ${userId} ORDER BY timecreated DESC`, (error2, results2, fields2) => {
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

function manageError(error) {
    console.log("[ERROR]: Ha ocurrido un problema al intentar realizar la petición.\n" + error.message);
    if (error.sql)
        console.log("SQL: " + error.sql);
}

module.exports = {
    isUserLoggedIn, retrieveUserCourses, getCourse, getGrades, getTeachers, getMessages, getUserInfo
}