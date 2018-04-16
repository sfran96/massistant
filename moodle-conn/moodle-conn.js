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
function isUserLoggedIn(moodCookValue, callback) {
    connection.query("SELECT * FROM `mdl_sessions` WHERE `sid` LIKE '" + moodCookValue + "'", (error, results, fields) => {
        if (error)
            console.log("Ha ocurrido un problema al verificar al usuario con sid " + moodCookValue);
        // Si hay resultados
        else if (results != undefined && results.length > 0 && results[0].userid !== 0) {
            callback(results[0].userid);
        }
    });
}

/**
 * Función para obtener las asignaturas que tiene un usuario matriculado
 * @param {number} userId 
 * @param {function(subjectsSql)} callback 
 */
function retrieveUserCourses(userId, callback) {
    let fechaActual = Date.now();
    connection.query("SELECT courses.id, courses.fullname FROM `mdl_course` AS `courses`" +
        " INNER JOIN `mdl_enrol` AS `user_asig` ON user_asig.courseid = courses.id" +
        " INNER JOIN `mdl_user_enrolments` AS `user_enr` ON user_enr.enrolid = user_asig.id" +
        " WHERE user_enr.userid LIKE '" + userId +
        "' AND user_enr.timestart <= " + fechaActual +
        " AND (user_enr.timeend > " + fechaActual + " OR user_enr.timeend = 0)", (error, results, fields) => {
            if (error)
                console.log("Ha ocurrido un problema al recoger las asignaturas de un usuario");
            else {
                if (results != undefined && results.length > 0) {
                    callback(results);
                } else {
                    callback([]);
                }
            }
        });
}

/**
 * 
 * @param {string} moduleName 
 * @param {number} courseId 
 * @param {function(subjectId)} callback 
 */
function getCourse(moduleName, courseId, callback) {
    connection.query("SELECT mcm.course FROM `mdl_course_modules` AS mcm" +
        " INNER JOIN `mdl_modules` AS mm" +
        " ON mcm.module = mm.id" +
        " WHERE mcm.id = ? AND mm.name = ?", [courseId, moduleName], (error, results, fields) => {
            if (error)
                console.log("[ERROR]: Ha ocurrido un problema al intentar realizar la petición.\n" + error.message);
            else {
                if (results != undefined && results.length > 0) {
                    callback(results[0].course);
                } else {
                    callback();
                }
            }
        });
}
module.exports = {
    isUserLoggedIn, retrieveUserCourses, getCourse
}