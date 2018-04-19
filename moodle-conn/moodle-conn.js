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
        if (error) manageError(error);
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

/**
 * 
 * @param {number} userId 
 * @param {number} quizId 
 * @param {function(status)} callback 
 */
function getQuizStatus(userId, quizId, callback) {
    // Comprobar que existe dicho cuestionario
    connection.query("SELECT mcm.course, mcm.instance FROM `mdl_course_modules` AS mcm" +
        " INNER JOIN `mdl_quiz` AS mq" +
        " ON mcm.course = mq.course" +
        " INNER JOIN `mdl_modules` AS mm" +
        " ON mm.id= mcm.module" +
        " WHERE mcm.id = ?" +
        " AND mm.name LIKE 'quiz'", [quizId], (error, resultsCourse, fields) => {
            if (error) manageError(error);
            else {
                if (resultsCourse != undefined && resultsCourse.length > 0) {
                    // Comprobamos que el usuario está matriculado en dicha asignatura
                    connection.query("SELECT COUNT(*) AS enrolled FROM `mdl_user_enrolments` AS mue" +
                        " INNER JOIN `mdl_enrol` AS me" +
                        " ON mue.enrolid = me.id" +
                        " WHERE mue.userid = ?" +
                        " AND mue.status = 0" +
                        " AND me.courseid = ?", [userId, resultsCourse[0].course], (error, resultsEnroled, fields) => {
                            if (error) manageError(error);
                            else {
                                if (resultsEnroled != undefined && resultsEnroled.length > 0 && resultsEnroled.enrolled === '1') {
                                    // Comprobamos si existe algún intento por parte del usuario
                                    connection.query("SELECT COUNT(*) AS attempted FROM `mdl_quiz_attemps`" +
                                        " WHERE userid = ?" +
                                        " AND quiz = ?" +
                                        " state LIKE 'inprogress'", [userId, resultsCourse[0].instance], (error, resultsAttempted, fields) => {
                                            if (error) manageError(error);
                                            else {
                                                if (resultsAttempted != undefined && resultsAttempted.length > 0 && resultsAttempted.attempted > 1)
                                                    callback("Attempted");
                                                else
                                                    callback("NotAttempted");
                                            }
                                        })
                                } else {
                                    callback("NotEnrolled");
                                }
                            }
                        });
                } else {
                    callback("NotFound");
                }
            }
        });
}

function manageError(error) {
    console.log("[ERROR]: Ha ocurrido un problema al intentar realizar la petición.\n" + error.message);
    if (error.sql)
        console.log("SQL: " + error.sql);
}

module.exports = {
    isUserLoggedIn, retrieveUserCourses, getCourse, getQuizStatus
}