"use strict";
exports.__esModule = true;
var objects_1 = require("./scene/objects");
var vec_1 = require("./util/vec");
var input_1 = require("./util/input");
var canvas = document.getElementById("cv");
var coords = document.querySelector("#coords");
var ctx = canvas.getContext("2d");
canvas.width = 2000;
canvas.height = 1000;
var last = Date.now();
objects_1.World.canvasHeight = canvas.height;
var world = new objects_1.World(ctx, 2000, 1000, 15.81);
var p = new objects_1.SoftBody(new vec_1["default"](1000, 400)); // new Particle(new Vec2(1000, 800)); 
world.addObject(p);
world.addObject(new objects_1.RectangleImmovable(new vec_1["default"](500, 100), new vec_1["default"](1000, 100)));
canvas.onmousemove = function (e) {
    // the 1.25 (1/0.8) depends on what the css resizes it to
    var rect = canvas.getBoundingClientRect(), scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    var x = Math.round((e.clientX - rect.left) * scaleX);
    var y = Math.round(canvas.height - (e.clientY - rect.top) * scaleY);
    coords.textContent = x + ", " + y;
    // if button one is held down
    input_1.MouseState.e = e;
    input_1.MouseState.isDown = !!e.buttons;
    input_1.MouseState.x = x;
    input_1.MouseState.y = y;
};
function draw() {
    ctx.fillStyle = "white";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var now = Date.now();
    var dt = now - last;
    last = now;
    world.tick(dt * 0.01);
    requestAnimationFrame(draw);
}
draw();
