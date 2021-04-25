"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
exports.__esModule = true;
exports.SoftBody = exports.Particle = exports.RectangleImmovable = exports.World = void 0;
var input_1 = require("../util/input");
var vec_1 = require("../util/vec");
var Entity = /** @class */ (function () {
    function Entity(pos, force, velocity) {
        if (force === void 0) { force = new vec_1["default"](0, 0); }
        if (velocity === void 0) { velocity = new vec_1["default"](0, 0); }
        this.mass = 0;
        // assume the vertices are drawn clockwise
        this.vertices = [];
        // bottom left and top right corners
        this.LC = vec_1["default"].zero;
        this.RC = vec_1["default"].zero;
        this.pos = pos;
        this.force = force;
        this.velocity = velocity;
    }
    // is held by the cursor (done with bounding box instead of polygon intersection)
    Entity.prototype.isCaptured = function () {
        return input_1.MouseState.x >= this.LC.x && input_1.MouseState.x <= this.RC.x && input_1.MouseState.y >= this.LC.y && input_1.MouseState.y <= this.RC.y
            && input_1.MouseState.isDown;
    };
    // applies a force for a brief amount of time
    Entity.prototype.applyForce = function (force) {
        this.force = force;
    };
    // setPos as a wrapper for pos = ... because the left and right corners need to be set.
    Entity.prototype.setPos = function (newPos) {
        this.LC = newPos;
        this.RC = this.RC.sub(this.pos).add(newPos);
        for (var i in this.vertices) {
            this.vertices[i] = this.vertices[i].sub(this.pos).add(newPos);
        }
        this.pos = newPos;
    };
    return Entity;
}());
var Immovable = /** @class */ (function (_super) {
    __extends(Immovable, _super);
    function Immovable() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.force = new vec_1["default"](0, 0);
        _this.velocity = new vec_1["default"](0, 0);
        return _this;
    }
    Immovable.prototype.tick = function (time) {
        // do nothing. It won't move
    };
    Immovable.prototype.intersect = function (object) {
        // do nothing. Immovables do not care about intersections
        return null;
    };
    return Immovable;
}(Entity));
var RectangleImmovable = /** @class */ (function (_super) {
    __extends(RectangleImmovable, _super);
    // pos is left corner
    function RectangleImmovable(pos, size, force, velocity) {
        if (force === void 0) { force = new vec_1["default"](0, 0); }
        if (velocity === void 0) { velocity = new vec_1["default"](0, 0); }
        var _this = _super.call(this, pos, force, velocity) || this;
        _this.size = size;
        _this.LC = pos;
        _this.RC = pos.add(size);
        _this.vertices = [
            new vec_1["default"](_this.pos.x, _this.pos.y),
            new vec_1["default"](_this.pos.x, _this.pos.y + _this.size.y),
            new vec_1["default"](_this.pos.x + _this.size.x, _this.pos.y + _this.size.y),
            new vec_1["default"](_this.pos.x + _this.size.x, _this.pos.y),
            // add an extra vertex which is the same as the start to close the polygon
            new vec_1["default"](_this.pos.x, _this.pos.y)
        ];
        return _this;
    }
    RectangleImmovable.prototype.render = function (ctx, height) {
        ctx.fillStyle = "black";
        ctx.strokeRect(this.pos.x, height - this.pos.y - this.size.y, this.size.x, this.size.y);
    };
    return RectangleImmovable;
}(Immovable));
exports.RectangleImmovable = RectangleImmovable;
var Particle = /** @class */ (function (_super) {
    __extends(Particle, _super);
    // pos is center
    function Particle(pos, radius, mass, force, velocity) {
        if (radius === void 0) { radius = 10; }
        if (mass === void 0) { mass = 1; }
        if (force === void 0) { force = new vec_1["default"](0, 0); }
        if (velocity === void 0) { velocity = new vec_1["default"](0, 0); }
        var _this = _super.call(this, pos, force, velocity) || this;
        // selectable area
        _this.fuzzyFactor = 1.5;
        _this.LC = _this.pos.sub(new vec_1["default"](radius, radius));
        _this.RC = _this.pos.add(new vec_1["default"](radius, radius));
        _this.radius = radius;
        _this.mass = mass;
        return _this;
    }
    Particle.prototype.render = function (ctx, height) {
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(this.pos.x, height - this.pos.y, this.radius, 0, 2 * Math.PI);
        ctx.fill();
        // ctx.strokeRect(this.LC.x, height-this.LC.y-this.radius*(this.fuzzyFactor*2), this.radius*(this.fuzzyFactor*2), this.radius*(this.fuzzyFactor*2));
    };
    Particle.prototype.tick = function (time) {
        // divide force by mass to get acceleration
        // multiply all the components by time to get displacement/change in velocity
        this.velocity = this.velocity.add(this.force.mul(1 / this.mass * time));
        this.setPos(this.pos.add(this.velocity.mul(time)));
    };
    Particle.prototype.intersect = function (obj) {
        // raycast in a cardinal direction. We're going to choose the north direction
        var inxs = 0;
        var bestCandidate;
        var bestDsquared = Number.MAX_VALUE;
        for (var i = 1; i < obj.vertices.length; i++) {
            var _a = obj.vertices[i - 1].x < obj.vertices[i].x ? [obj.vertices[i - 1], obj.vertices[i]] : [obj.vertices[i], obj.vertices[i - 1]], p1 = _a[0], p2 = _a[1];
            // compute the closest point on the line. This makes a perpendicular angle with the side.
            var sideDiff = p2.sub(p1);
            var u = sideDiff.x == 0 ? new vec_1["default"](0, 1) : new vec_1["default"](1, sideDiff.y / sideDiff.x);
            var v = this.pos.sub(p1);
            // compute closest point on line using orthogonal projection
            var closest = u.mul((u.dot(v) / u.dot(u))).add(p1);
            // const closest = sideDiff.mul(sideDiff.dot(this.pos.sub(p1))/sideDiff.dot(sideDiff)).add(p1);
            var dSquared = closest.sub(this.pos).distSqd();
            if (dSquared < bestDsquared) {
                bestCandidate = closest;
                bestDsquared = dSquared;
            }
            // next see if this polygon side has an intersection by ray casting upwards
            // there might be a vertical line (like in a rectangle)
            var lerpY = p1.y + sideDiff.y * ((this.pos.x - p1.x) / sideDiff.x);
            inxs += +(lerpY > this.pos.y && this.pos.x <= p2.x && this.pos.x >= p1.x);
        }
        // odd number of intersections means the point is within the polygon
        return inxs & 1 ? bestCandidate : null;
    };
    Particle.prototype.setPos = function (newPos) {
        this.LC = newPos.sub(new vec_1["default"](this.radius, this.radius).mul(this.fuzzyFactor));
        this.RC = newPos.add(new vec_1["default"](this.radius, this.radius).mul(this.fuzzyFactor));
        this.pos = newPos;
    };
    return Particle;
}(Entity));
exports.Particle = Particle;
var SoftBody = /** @class */ (function (_super) {
    __extends(SoftBody, _super);
    function SoftBody(pos, width, height) {
        if (width === void 0) { width = 5; }
        if (height === void 0) { height = 5; }
        var _this = _super.call(this, pos) || this;
        // mass of each particle
        _this.mass = 1;
        _this.pMatrix = __spreadArray([], Array(height)).map(function (e) { return Array(width); });
        for (var i = height - 1; i >= 0; i--) {
            for (var j = 0; j < width; j++) {
                _this.pMatrix[i][j] = new Particle(pos.add(new vec_1["default"](SoftBody.APART * j, SoftBody.APART * (height - i + 1))));
            }
        }
        return _this;
    }
    // intersections will be handled on a particle to polygon basis. 
    // intersections and position updates for each individual particle will be performed during the soft body tick
    SoftBody.prototype.intersect = function (obj) {
        return null;
    };
    // render
    SoftBody.prototype.render = function (ctx, height) {
        for (var i = 0; i < this.pMatrix.length; i++) {
            for (var j = 0; j < this.pMatrix[0].length; j++) {
                var p = this.pMatrix[i][j];
                ctx.beginPath();
                ctx.moveTo(p.pos.x, height - p.pos.y);
                for (var _i = 0, _a = [[1, 0], [1, 1], [0, 0], [0, 1], [1, 0]]; _i < _a.length; _i++) {
                    var search = _a[_i];
                    var nextR = this.pMatrix[i + search[1]];
                    var neighbor = nextR ? nextR[j + search[0]] : 0;
                    if (neighbor)
                        ctx.lineTo(neighbor.pos.x, height - neighbor.pos.y);
                }
                ctx.stroke();
                p.render(ctx, height);
            }
        }
    };
    SoftBody.prototype.tick = function (time, objects) {
        for (var i = 0; i < this.pMatrix.length; i++) {
            for (var j = 0; j < this.pMatrix[0].length; j++) {
                var p = this.pMatrix[i][j];
                for (var _i = 0, objects_1 = objects; _i < objects_1.length; _i++) {
                    var obj = objects_1[_i];
                    // ignore if the particle is trying to collide with the parent softbody
                    if (obj == this)
                        continue;
                    var intersect = p.intersect(obj);
                    if (intersect) {
                        // get normal vector from collision surface by difference between closest and current point
                        var surfaceNormal = intersect.sub(p.pos).norm();
                        // the reflected velocity is: v - 2(v dot n) * n 
                        p.velocity = p.velocity.sub(surfaceNormal.mul(2 * p.velocity.dot(surfaceNormal)));
                        // move the object out of the colliding object
                        p.setPos(intersect);
                    }
                }
                p.tick(time);
            }
        }
    };
    SoftBody.prototype.applyForce = function (force) {
        for (var i = 0; i < this.pMatrix.length; i++) {
            for (var j = 0; j < this.pMatrix[0].length; j++) {
                var p = this.pMatrix[i][j];
                // set spring force on each particle. This requires consideration of all 8 directions
                for (var _i = 0, _a = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]; _i < _a.length; _i++) {
                    var search = _a[_i];
                    var nextR = this.pMatrix[i + search[1]];
                    var neighbor = nextR ? nextR[j + search[0]] : null;
                    if (neighbor) {
                        // calculate the force of the spring + damping
                        var posDiff = neighbor.pos.sub(p.pos);
                        var magnitude = posDiff.dist();
                        var springForce = SoftBody.K * (magnitude - SoftBody.APART * Math.sqrt(search[0] * search[0] + search[1] * search[1]));
                        var normDiff = posDiff.mul(1 / magnitude);
                        var damping = normDiff.dot(neighbor.velocity.sub(p.velocity)) * SoftBody.DAMPING;
                        var netSpring = normDiff.mul(springForce - damping).mul(-0.01);
                        force = force.add(netSpring);
                    }
                }
                p.applyForce(force);
            }
        }
    };
    // each particle will be 50 pixels apart
    SoftBody.APART = 40;
    SoftBody.DAMPING = 0.2;
    // spring constant k
    SoftBody.K = 0.2;
    return SoftBody;
}(Entity));
exports.SoftBody = SoftBody;
var World = /** @class */ (function () {
    function World(ctx, width, height, gravity) {
        this.objects = [];
        this.width = width;
        this.height = height;
        this.ctx = ctx;
        this.gravity = new vec_1["default"](0, -gravity);
    }
    World.prototype.addObject = function (entity) {
        this.objects.push(entity);
    };
    World.prototype.tick = function (time) {
        for (var i = 0; i < this.objects.length; i++) {
            var n = this.objects[i];
            // if the object is held by the cursor, skip the collision check
            if (n.isCaptured()) {
                if (n instanceof RectangleImmovable) {
                    var rectDiff = n.RC.sub(n.LC).mul(0.5);
                    n.setPos(new vec_1["default"](input_1.MouseState.x, input_1.MouseState.y).sub(rectDiff));
                }
                else {
                    n.setPos(new vec_1["default"](input_1.MouseState.x, input_1.MouseState.y));
                    n.velocity = new vec_1["default"](input_1.MouseState.e.movementX, -input_1.MouseState.e.movementY).mul(3);
                }
                n.force = vec_1["default"].zero;
                n.render(this.ctx, World.canvasHeight);
                continue;
            }
            var netForce = this.gravity.mul(n.mass);
            for (var j = 0; j < this.objects.length; j++) {
                // avoid checking collision on itself
                if (i == j)
                    continue;
                // TODO: add boundary culling and check for the type
                var intersect = n.intersect(this.objects[j]);
                if (intersect) {
                    // get normal vector from collision surface by difference between closest and current point
                    var surfaceNormal = intersect.sub(n.pos).norm();
                    // the reflected velocity is: v - 2(v dot n) * n 
                    n.velocity = n.velocity.sub(surfaceNormal.mul(2 * n.velocity.dot(surfaceNormal)));
                    // move the object out of the colliding object
                    n.setPos(intersect);
                }
            }
            n.applyForce(netForce);
            n.tick(time, this.objects);
            n.render(this.ctx, World.canvasHeight);
        }
    };
    World.canvasHeight = 1000;
    return World;
}());
exports.World = World;
