
import { MouseState, Settings } from '../util/input';
import Vec2 from '../util/vec';

abstract class Entity {
    pos: Vec2; force: Vec2; velocity: Vec2; 
    mass = 0;
    // assume the vertices are drawn clockwise
    vertices: Vec2[] = [];
    
    // bottom left and top right corners
    LC = Vec2.zero; RC = Vec2.zero;

    constructor(pos: Vec2, force=new Vec2(0, 0), velocity=new Vec2(0, 0)) {
        this.pos = pos;
        this.force = force; this.velocity = velocity;
    }

    // screen coords vs cartesian coords. Needs height to flip y coord
    abstract render(ctx: CanvasRenderingContext2D, height: number) : void; 
    // the world objects are needed for the tick to carry world's context for collisions
    abstract tick(time: number, objects: Entity[]) : void;
    // intersection check. Return null if no intersection, return closest point to move outside.
    abstract intersect(object: Entity) : Vec2;

    // is held by the cursor (done with bounding box instead of polygon intersection)
    isCaptured() {
        return MouseState.x >= this.LC.x && MouseState.x <= this.RC.x && MouseState.y >= this.LC.y && MouseState.y <= this.RC.y
            && MouseState.isDown;
    }

    // applies a force for a brief amount of time
    applyForce(force: Vec2) {
        this.force = force;
    }

    // setPos as a wrapper for pos = ... because the left and right corners need to be set.
    setPos(newPos: Vec2) {
        this.LC = newPos;
        this.RC = this.RC.sub(this.pos).add(newPos);
        for (let i in this.vertices) {
            this.vertices[i] = this.vertices[i].sub(this.pos).add(newPos);
        }
        this.pos = newPos;
    }
}

abstract class Immovable extends Entity {
    force = new Vec2(0, 0); velocity = new Vec2(0, 0);

    tick(time: number) {
        // do nothing. It won't move
    }

    intersect(object: Entity) {
        // do nothing. Immovables do not care about intersections
        return null;
    }
}

class RectangleImmovable extends Immovable {
    size: Vec2;

    // pos is left corner
    constructor(pos: Vec2, size: Vec2, force=new Vec2(0, 0), velocity=new Vec2(0, 0)) {
        super(pos, force, velocity);
        this.size = size;
        this.LC = pos;
        this.RC = pos.add(size);
        this.vertices = [
            new Vec2(this.pos.x, this.pos.y),
            new Vec2(this.pos.x, this.pos.y+this.size.y),
            new Vec2(this.pos.x+this.size.x, this.pos.y+this.size.y),
            new Vec2(this.pos.x+this.size.x, this.pos.y),
            // add an extra vertex which is the same as the start to close the polygon
            new Vec2(this.pos.x, this.pos.y)
        ];
    }

    render(ctx: CanvasRenderingContext2D, height: number) {
        ctx.fillStyle = "black";
        ctx.strokeRect(this.pos.x, height-this.pos.y- this.size.y, this.size.x, this.size.y);
    }
}

class Particle extends Entity {
    radius: number; mass: number;

    // selectable area
    fuzzyFactor = 1.5;

    // pos is center
    constructor(pos: Vec2, radius: number=10, mass: number=1, force=new Vec2(0, 0), velocity=new Vec2(0, 0)) {
        super(pos, force, velocity);
        this.LC = this.pos.sub(new Vec2(radius, radius));
        this.RC = this.pos.add(new Vec2(radius, radius));
        this.radius = radius;
        this.mass = mass;
    }

    render(ctx: CanvasRenderingContext2D, height: number) {
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(this.pos.x, height-this.pos.y, this.radius, 0, 2*Math.PI);
        ctx.fill();
        // ctx.strokeRect(this.LC.x, height-this.LC.y-this.radius*(this.fuzzyFactor*2), this.radius*(this.fuzzyFactor*2), this.radius*(this.fuzzyFactor*2));
    }

    tick(time: number) {
        // divide force by mass to get acceleration
        // multiply all the components by time to get displacement/change in velocity
        this.velocity = this.velocity.add(this.force.mul(1/this.mass * time));
        this.setPos(this.pos.add(this.velocity.mul(time)));
    }

    intersect(obj: Entity) {
        // raycast in a cardinal direction. We're going to choose the north direction
        var inxs = 0;
        var bestCandidate: Vec2; var bestDsquared = Number.MAX_VALUE;
        for (var i = 1; i < obj.vertices.length; i++) {
            const [p1, p2]: Vec2[] = obj.vertices[i-1].x < obj.vertices[i].x ? [obj.vertices[i-1], obj.vertices[i]] : [obj.vertices[i], obj.vertices[i-1]];
            // compute the closest point on the line. This makes a perpendicular angle with the side.
            const sideDiff = p2.sub(p1);
            const u = sideDiff.x == 0 ? new Vec2(0, 1) : new Vec2(1, sideDiff.y/sideDiff.x);
            const v = this.pos.sub(p1);
            // compute closest point on line using orthogonal projection
            const closest = u.mul((u.dot(v)/u.dot(u))).add(p1);
            // const closest = sideDiff.mul(sideDiff.dot(this.pos.sub(p1))/sideDiff.dot(sideDiff)).add(p1);
            const dSquared = closest.sub(this.pos).distSqd();
            if (dSquared < bestDsquared) {
                bestCandidate = closest;
                bestDsquared = dSquared;
            }
            
            // next see if this polygon side has an intersection by ray casting upwards
            // there might be a vertical line (like in a rectangle)

            const lerpY = p1.y + sideDiff.y * ((this.pos.x-p1.x)/sideDiff.x);
            inxs += +(lerpY > this.pos.y && this.pos.x <= p2.x && this.pos.x >= p1.x);
            
        }
        // odd number of intersections means the point is within the polygon
        return inxs&1 ? bestCandidate : null;
    }

    setPos(newPos: Vec2) {
        this.LC = newPos.sub(new Vec2(this.radius, this.radius).mul(this.fuzzyFactor));
        this.RC = newPos.add(new Vec2(this.radius, this.radius).mul(this.fuzzyFactor));
        this.pos = newPos;
    }
}

class SoftBody extends Entity {
    // width and height define the number of particles on each side
    width: number; height: number;
    // just store a matrix of all the particles. These will be drawn in the same order
    pMatrix: Particle[][];
    // mass of each particle
    mass = 1.0;
    // radius of each particle
    radius = 10;

    constructor(pos: Vec2, width = 7, height = 7) {
        super(pos);
        this.pMatrix = [...Array(height)].map(e=>Array(width));
        for (var i = height-1; i >= 0; i--) {
            for (var j = 0; j < width; j++) {
                this.pMatrix[i][j] = new Particle(pos.add(new Vec2(Settings.apart*j, Settings.apart*(height-i+1))), 10, this.mass);
            }
        }
    }

    // intersections will be handled on a particle to polygon basis. 
    // intersections and position updates for each individual particle will be performed during the soft body tick
    intersect(obj: Entity) {
        return null;
    }

    // render
    render(ctx: CanvasRenderingContext2D, height: number) {
        for (var i = 0; i < this.pMatrix.length; i++) {
            for (var j = 0; j < this.pMatrix[0].length; j++) {
                const p = this.pMatrix[i][j];
                ctx.beginPath();
                ctx.moveTo(p.pos.x, height-p.pos.y);
                for (const search of [[1, 0], [1, 1], [0, 0], [0, 1], [1, 0]]) {
                    var nextR = this.pMatrix[i+search[1]];
                    const neighbor = nextR ? nextR[j+search[0]] : 0;
                    if (neighbor) ctx.lineTo(neighbor.pos.x, height-neighbor.pos.y);
                }
                ctx.stroke();
                p.render(ctx, height);
            }
        }
    }

    tick(time: number, objects: Entity[]) {
        for (var i = 0; i < this.pMatrix.length; i++) {
            for (var j = 0; j < this.pMatrix[0].length; j++) {
                const p = this.pMatrix[i][j];
                for (const obj of objects) {
                    // ignore if the particle is trying to collide with the parent softbody
                    if (obj == this) continue;
                    const intersect = p.intersect(obj);
                    if (intersect) {
                        // get normal vector from collision surface by difference between closest and current point
                        const surfaceNormal = intersect.sub(p.pos).norm();
                        // the reflected velocity is: v - 2(v dot n) * n 
                        p.velocity = p.velocity.sub(surfaceNormal.mul(2*p.velocity.dot(surfaceNormal)));
                        // move the object out of the colliding object
                        p.setPos(intersect);
                    }
                }
                if (Settings.avoidSelfCollision) {
                    // also check if the particle is colliding with another particle
                    // TODO: find some sort of optimization?
                    for (var k = 0; k < this.pMatrix.length; k++) {
                        for (var l = 0; l < this.pMatrix[0].length; l++) {
                            const next = this.pMatrix[k][l];
                            // don't check with itself
                            if (next == p) continue;
                            const difference = next.pos.sub(p.pos);
                            const distSqd = difference.distSqd();
                            // skip 0 division
                            if (distSqd == 0) continue;
                            // if the dist is < the square of twice the radius of the particle
                            if (distSqd < 4*this.radius*this.radius) {
                                // calculate normal and reflect velocity
                                const dir = difference.norm().mul(-1);
                                p.velocity = p.velocity.sub(dir.mul(2*p.velocity.dot(dir)));
                            }
                        }
                    }                  
                }
                p.tick(time);
            }
        }
    }

    applyForce(force: Vec2) {
        for (var i = 0; i < this.pMatrix.length; i++) {
            for (var j = 0; j < this.pMatrix[0].length; j++) {
                var netForce = force;
                const p = this.pMatrix[i][j];
                if (p.isCaptured()) {

                    p.setPos(new Vec2(MouseState.x, MouseState.y));
                    p.velocity = new Vec2(MouseState.e.movementX, -MouseState.e.movementY).mul(3);
                    
                    p.force = Vec2.zero;
                    // n.render(this.ctx, World.canvasHeight);
                    continue;
                }
                // set spring force on each particle. This requires consideration of all 8 directions
                for (const search of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) {
                    var nextR = this.pMatrix[i+search[1]];
                    const neighbor = nextR ? nextR[j+search[0]] : null;
                    if (neighbor) {
                        // calculate the force of the spring + damping
                        const posDiff = neighbor.pos.sub(p.pos);
                        const magnitude = posDiff.dist();
                        // skip any 0 divisions
                        if (magnitude == 0) continue;
                        const springForce = Settings.k*(magnitude-Settings.apart*Math.sqrt(search[0]*search[0]+search[1]*search[1]));

                        const normDiff = posDiff.mul(1/magnitude);
                        const damping = normDiff.dot(neighbor.velocity.sub(p.velocity))*Settings.damping;
                        const netSpring = normDiff.mul(springForce+damping);
                        netForce = netForce.add(netSpring);
                    }
                }
                p.applyForce(netForce);
            }
        }
    }
}

class World {
    // gravitational field will always point downwards
    width: number; height: number;
    objects: Entity[] = [];
    ctx: CanvasRenderingContext2D;

    static canvasHeight = 1000;

    constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
        this.width = width;
        this.height = height;
        this.ctx = ctx;
    }

    addObject(entity: Entity) {
        this.objects.push(entity);
    }

    tick(time: number) {
        for (var i = 0; i < this.objects.length; i++) {
            const n = this.objects[i];
            // if the object is held by the cursor, skip the collision check
            if (n.isCaptured()) {
                if (n instanceof RectangleImmovable) {
                    const rectDiff = n.RC.sub(n.LC).mul(0.5);
                    n.setPos(new Vec2(MouseState.x, MouseState.y).sub(rectDiff));
                } else {
                    n.setPos(new Vec2(MouseState.x, MouseState.y));
                    n.velocity = new Vec2(MouseState.e.movementX, -MouseState.e.movementY).mul(3);
                }
                n.force = Vec2.zero;
                n.render(this.ctx, World.canvasHeight);
                continue;
            }
            const netForce = Settings.gravity.mul(n.mass);
            for (var j = 0; j < this.objects.length; j++) {
                // avoid checking collision on itself
                if (i == j) continue;
                // TODO: add boundary culling and check for the type
                const intersect = n.intersect(this.objects[j]);
                if (intersect) {
                    // get normal vector from collision surface by difference between closest and current point
                    const surfaceNormal = intersect.sub(n.pos).norm();
                    // the reflected velocity is: v - 2(v dot n) * n 
                    n.velocity = n.velocity.sub(surfaceNormal.mul(2*n.velocity.dot(surfaceNormal)));
                    // move the object out of the colliding object
                    n.setPos(intersect);
                }
            }
            n.applyForce(netForce);
            n.tick(time, this.objects);
            n.render(this.ctx, World.canvasHeight);
        }
    }
}

export {World, RectangleImmovable, Particle, SoftBody};