// Evitar accidentalmente crear variables globales
"use strict";

//requirejs configurations
require.config({
	/*
	 * Let's define short alias for commonly used AMD libraries and name-spaces. Using
	 * these alias, we do not need to specify lengthy paths, when referring a child
	 * files. We will 'import' these scripts, using the alias, later in our application.
	 */
	paths: {
		jquery: 'lib/jquery-3.3.1',
		socketioclient: 'lib/socket.io',
		responsiveVoice: '//code.responsivevoice.org/responsivevoice.js',
		massistant: 'massistant.js'
	}
});

define(['jquery', 'socketioclient', 'responsivevoice', 'massistant'], ($, io, responsiveVoice) => {
})