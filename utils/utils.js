function getCookie(cookies, name) {
    console.log(cookies);
    var value = "; " + cookies;
    var parts = value.split("; " + name + "=");
    if (parts.length == 2) return parts.pop().split(";").shift();
}

module.exports = {
    getCookie
}