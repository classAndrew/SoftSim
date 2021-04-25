/**
 * Input for the simulation. Keyboard, mouse, etc.
 */

import Vec2 from "./vec"

class MouseState {
    static isDown = false;
    static e: MouseEvent; // last mouse event
    // world coordinates
    static x = 0;
    static y = 0;
}

class Settings {
    static avoidSelfCollision = false;
    
    static gravity = new Vec2(0, -9.81);

    // each particle will be 50 pixels apart
    static apart = 50;
    static damping = 0.5;
    // spring constant k
    static k = 5.8;
}

export {MouseState, Settings};