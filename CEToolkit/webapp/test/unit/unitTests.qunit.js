/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"s4hana/CEToolkit/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
