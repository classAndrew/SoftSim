"use strict";
exports.__esModule = true;
var Vec2 = /** @class */ (function () {
    function Vec2(x, y) {
        this.x = x;
        this.y = y;
    }
    Vec2.prototype.add = function (v) {
        return new Vec2(this.x + v.x, this.y + v.y);
    };
    Vec2.prototype.sub = function (v) {
        return new Vec2(this.x - v.x, this.y - v.y);
    };
    Vec2.prototype.dot = function (v) {
        return this.x * v.x + this.y * v.y;
    };
    Vec2.prototype.mul = function (t) {
        return new Vec2(this.x * t, this.y * t);
    };
    Vec2.prototype.dist = function () {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    };
    Vec2.prototype.distSqd = function () {
        return this.x * this.x + this.y * this.y;
    };
    Vec2.prototype.norm = function () {
        var magnitude = this.dist();
        return this.mul(1 / magnitude);
    };
    Vec2.zero = new Vec2(0, 0);
    return Vec2;
}());
exports["default"] = Vec2;
