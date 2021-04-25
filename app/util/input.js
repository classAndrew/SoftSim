"use strict";
/**
 * Input for the simulation. Keyboard, mouse, etc.
 */
exports.__esModule = true;
exports.MouseState = void 0;
var MouseState = /** @class */ (function () {
    function MouseState() {
    }
    MouseState.isDown = false;
    // world coordinates
    MouseState.x = 0;
    MouseState.y = 0;
    return MouseState;
}());
exports.MouseState = MouseState;
