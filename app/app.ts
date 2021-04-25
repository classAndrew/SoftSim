import {World, Particle, RectangleImmovable, SoftBody} from './scene/objects';
import Vec2 from './util/vec';
import {MouseState, Settings} from './util/input';

const canvas = <HTMLCanvasElement> document.getElementById("cv");
const coords = document.querySelector("#coords");
const fps = document.querySelector("#fps");
const sliders = document.querySelector(".sliders");
const ctx = canvas.getContext("2d");

canvas.width = 2000;
canvas.height = 1000;

var last = Date.now();
World.canvasHeight = canvas.height;
const world = new World(ctx, 2000, 1000);
var p = new SoftBody(new Vec2(1000, 190)); // new Particle(new Vec2(1000, 800)); 
world.addObject(p);
world.addObject(new RectangleImmovable(new Vec2(500, 100), new Vec2(1000, 100)));

canvas.onmousemove = e => {
    // the 1.25 (1/0.8) depends on what the css resizes it to
    var rect = canvas.getBoundingClientRect(), scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    const x = Math.round((e.clientX-rect.left)*scaleX);
    const y = Math.round(canvas.height-(e.clientY-rect.top)*scaleY);
    coords.textContent = `${x}, ${y}`
    // if button one is held down
    MouseState.e = e;
    MouseState.isDown = !!e.buttons;
    MouseState.x = x;
    MouseState.y = y;
} 


Array.from(sliders.children).forEach(e => {
    if (e instanceof HTMLInputElement) {
        e.onchange = c => {
            if (e.id == "gravity") {
                console.log(Settings.gravity)
                Settings[e.id] = new Vec2(0, -e.value);
            } else {
                Settings[e.id] = e.value;
            }   
        }
    }
})


function draw() {
    ctx.fillStyle = "white";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const now = Date.now();
    const dt = now-last;
    last = now;
    world.tick(dt*0.01);
    fps.textContent = `${Math.round(1/dt*1000)} FPS`;
    requestAnimationFrame(draw);
}

draw();
