/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"s4hana/CEToolkit/test/integration/AllJourneys"
	], function () {
		QUnit.start();
	});
});
