/**
 * Función encargada de devolver el valor de una cookie
 * @param {string} cname El nombre de la cookie a recoger
 * @param {string} cookies Define las cookies del usuario (cookie1=cd;cookie2=ab)
 */
function getCookie(cname, cookies) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(cookies);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

module.exports = {
    getCookie
}