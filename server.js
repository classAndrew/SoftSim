"use strict";
exports.__esModule = true;
var express = require("express");
var app = express();
app.use("/node_modules", express.static("node_modules"));
app.use("/", express.static("app"));
app.listen(8080, function () { return console.log("Starting on http://localhost:8080"); });
