var mysql = require('mysql');
var conf = require('../conf.json');

var connection = mysql.createConnection({
    host: conf.sql.host,
    user: conf.sql.user,
    password: conf.sql.password,
    database: conf.sql.sql_moodle_db
})

/**
 * 
 * @param {string} moodCookValue 
 * @param {function(string)} callback 
 */
function IsUserLoggedIn(moodCookValue, callback) {
    connection.query("SELECT * FROM `mdl_sessions` WHERE `sid` LIKE '" + moodCookValue + "'", (error, results, fields) => {
       console.log(results);
        // Si hay resultados
        if (results != undefined && results.length > 0 && results[0].userid !== 0) {
            callback(results[0].userid);
        }
    });
}

module.exports = {
    IsUserLoggedIn
}