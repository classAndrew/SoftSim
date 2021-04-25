(() => {
  // app/util/vec.ts
  var _Vec2 = class {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
    add(v) {
      return new _Vec2(this.x + v.x, this.y + v.y);
    }
    sub(v) {
      return new _Vec2(this.x - v.x, this.y - v.y);
    }
    dot(v) {
      return this.x * v.x + this.y * v.y;
    }
    mul(t) {
      return new _Vec2(this.x * t, this.y * t);
    }
    dist() {
      return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    distSqd() {
      return this.x * this.x + this.y * this.y;
    }
    norm() {
      const magnitude = this.dist();
      return this.mul(1 / magnitude);
    }
  };
  var Vec2 = _Vec2;
  Vec2.zero = new _Vec2(0, 0);
  var vec_default = Vec2;

  // app/util/input.ts
  var MouseState = class {
  };
  MouseState.isDown = false;
  MouseState.x = 0;
  MouseState.y = 0;
  var Settings = class {
  };
  Settings.avoidSelfCollision = false;
  Settings.gravity = new vec_default(0, -9.81);
  Settings.apart = 50;
  Settings.damping = 0.5;
  Settings.k = 5.8;

  // app/scene/objects.ts
  var Entity = class {
    constructor(pos, force = new vec_default(0, 0), velocity = new vec_default(0, 0)) {
      this.mass = 0;
      this.vertices = [];
      this.LC = vec_default.zero;
      this.RC = vec_default.zero;
      this.pos = pos;
      this.force = force;
      this.velocity = velocity;
    }
    isCaptured() {
      return MouseState.x >= this.LC.x && MouseState.x <= this.RC.x && MouseState.y >= this.LC.y && MouseState.y <= this.RC.y && MouseState.isDown;
    }
    applyForce(force) {
      this.force = force;
    }
    setPos(newPos) {
      this.LC = newPos;
      this.RC = this.RC.sub(this.pos).add(newPos);
      for (let i in this.vertices) {
        this.vertices[i] = this.vertices[i].sub(this.pos).add(newPos);
      }
      this.pos = newPos;
    }
  };
  var Immovable = class extends Entity {
    constructor() {
      super(...arguments);
      this.force = new vec_default(0, 0);
      this.velocity = new vec_default(0, 0);
    }
    tick(time) {
    }
    intersect(object) {
      return null;
    }
  };
  var RectangleImmovable = class extends Immovable {
    constructor(pos, size, force = new vec_default(0, 0), velocity = new vec_default(0, 0)) {
      super(pos, force, velocity);
      this.size = size;
      this.LC = pos;
      this.RC = pos.add(size);
      this.vertices = [
        new vec_default(this.pos.x, this.pos.y),
        new vec_default(this.pos.x, this.pos.y + this.size.y),
        new vec_default(this.pos.x + this.size.x, this.pos.y + this.size.y),
        new vec_default(this.pos.x + this.size.x, this.pos.y),
        new vec_default(this.pos.x, this.pos.y)
      ];
    }
    render(ctx2, height) {
      ctx2.fillStyle = "black";
      ctx2.strokeRect(this.pos.x, height - this.pos.y - this.size.y, this.size.x, this.size.y);
    }
  };
  var Particle = class extends Entity {
    constructor(pos, radius = 10, mass = 1, force = new vec_default(0, 0), velocity = new vec_default(0, 0)) {
      super(pos, force, velocity);
      this.fuzzyFactor = 1.5;
      this.LC = this.pos.sub(new vec_default(radius, radius));
      this.RC = this.pos.add(new vec_default(radius, radius));
      this.radius = radius;
      this.mass = mass;
    }
    render(ctx2, height) {
      ctx2.fillStyle = "red";
      ctx2.beginPath();
      ctx2.arc(this.pos.x, height - this.pos.y, this.radius, 0, 2 * Math.PI);
      ctx2.fill();
    }
    tick(time) {
      this.velocity = this.velocity.add(this.force.mul(1 / this.mass * time));
      this.setPos(this.pos.add(this.velocity.mul(time)));
    }
    intersect(obj) {
      var inxs = 0;
      var bestCandidate;
      var bestDsquared = Number.MAX_VALUE;
      for (var i = 1; i < obj.vertices.length; i++) {
        const [p1, p2] = obj.vertices[i - 1].x < obj.vertices[i].x ? [obj.vertices[i - 1], obj.vertices[i]] : [obj.vertices[i], obj.vertices[i - 1]];
        const sideDiff = p2.sub(p1);
        const u = sideDiff.x == 0 ? new vec_default(0, 1) : new vec_default(1, sideDiff.y / sideDiff.x);
        const v = this.pos.sub(p1);
        const closest = u.mul(u.dot(v) / u.dot(u)).add(p1);
        const dSquared = closest.sub(this.pos).distSqd();
        if (dSquared < bestDsquared) {
          bestCandidate = closest;
          bestDsquared = dSquared;
        }
        const lerpY = p1.y + sideDiff.y * ((this.pos.x - p1.x) / sideDiff.x);
        inxs += +(lerpY > this.pos.y && this.pos.x <= p2.x && this.pos.x >= p1.x);
      }
      return inxs & 1 ? bestCandidate : null;
    }
    setPos(newPos) {
      this.LC = newPos.sub(new vec_default(this.radius, this.radius).mul(this.fuzzyFactor));
      this.RC = newPos.add(new vec_default(this.radius, this.radius).mul(this.fuzzyFactor));
      this.pos = newPos;
    }
  };
  var SoftBody = class extends Entity {
    constructor(pos, width = 10, height = 1) {
      super(pos);
      this.mass = 1;
      this.radius = 10;
      this.pMatrix = [...Array(height)].map((e) => Array(width));
      for (var i = height - 1; i >= 0; i--) {
        for (var j = 0; j < width; j++) {
          this.pMatrix[i][j] = new Particle(pos.add(new vec_default(Settings.apart * j, Settings.apart * (height - i + 1))), 10, this.mass);
        }
      }
    }
    intersect(obj) {
      return null;
    }
    render(ctx2, height) {
      for (var i = 0; i < this.pMatrix.length; i++) {
        for (var j = 0; j < this.pMatrix[0].length; j++) {
          const p2 = this.pMatrix[i][j];
          ctx2.beginPath();
          ctx2.moveTo(p2.pos.x, height - p2.pos.y);
          for (const search of [[1, 0], [1, 1], [0, 0], [0, 1], [1, 0]]) {
            var nextR = this.pMatrix[i + search[1]];
            const neighbor = nextR ? nextR[j + search[0]] : 0;
            if (neighbor)
              ctx2.lineTo(neighbor.pos.x, height - neighbor.pos.y);
          }
          ctx2.stroke();
          p2.render(ctx2, height);
        }
      }
    }
    tick(time, objects) {
      for (var i = 0; i < this.pMatrix.length; i++) {
        for (var j = 0; j < this.pMatrix[0].length; j++) {
          const p2 = this.pMatrix[i][j];
          for (const obj of objects) {
            if (obj == this)
              continue;
            const intersect = p2.intersect(obj);
            if (intersect) {
              const surfaceNormal = intersect.sub(p2.pos).norm();
              p2.velocity = p2.velocity.sub(surfaceNormal.mul(2 * p2.velocity.dot(surfaceNormal)));
              p2.setPos(intersect);
            }
          }
          if (Settings.avoidSelfCollision) {
            for (var k = 0; k < this.pMatrix.length; k++) {
              for (var l = 0; l < this.pMatrix[0].length; l++) {
                const next = this.pMatrix[k][l];
                if (next == p2)
                  continue;
                const difference = next.pos.sub(p2.pos);
                const distSqd = difference.distSqd();
                if (distSqd == 0)
                  continue;
                if (distSqd < 4 * this.radius * this.radius) {
                  const dir = difference.norm().mul(-1);
                  p2.velocity = p2.velocity.sub(dir.mul(2 * p2.velocity.dot(dir)));
                }
              }
            }
          }
          p2.tick(time);
        }
      }
    }
    applyForce(force) {
      for (var i = 0; i < this.pMatrix.length; i++) {
        for (var j = 0; j < this.pMatrix[0].length; j++) {
          var netForce = force;
          const p2 = this.pMatrix[i][j];
          if (p2.isCaptured()) {
            p2.setPos(new vec_default(MouseState.x, MouseState.y));
            p2.velocity = new vec_default(MouseState.e.movementX, -MouseState.e.movementY).mul(3);
            p2.force = vec_default.zero;
            continue;
          }
          for (const search of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) {
            var nextR = this.pMatrix[i + search[1]];
            const neighbor = nextR ? nextR[j + search[0]] : null;
            if (neighbor) {
              const posDiff = neighbor.pos.sub(p2.pos);
              const magnitude = posDiff.dist();
              if (magnitude == 0)
                continue;
              const springForce = Settings.k * (magnitude - Settings.apart * Math.sqrt(search[0] * search[0] + search[1] * search[1]));
              const normDiff = posDiff.mul(1 / magnitude);
              const damping = normDiff.dot(neighbor.velocity.sub(p2.velocity)) * Settings.damping;
              const netSpring = normDiff.mul(springForce + damping);
              netForce = netForce.add(netSpring);
            }
          }
          p2.applyForce(netForce);
        }
      }
    }
  };
  var _World = class {
    constructor(ctx2, width, height) {
      this.objects = [];
      this.width = width;
      this.height = height;
      this.ctx = ctx2;
    }
    addObject(entity) {
      this.objects.push(entity);
    }
    tick(time) {
      for (var i = 0; i < this.objects.length; i++) {
        const n = this.objects[i];
        if (n.isCaptured()) {
          if (n instanceof RectangleImmovable) {
            const rectDiff = n.RC.sub(n.LC).mul(0.5);
            n.setPos(new vec_default(MouseState.x, MouseState.y).sub(rectDiff));
          } else {
            n.setPos(new vec_default(MouseState.x, MouseState.y));
            n.velocity = new vec_default(MouseState.e.movementX, -MouseState.e.movementY).mul(3);
          }
          n.force = vec_default.zero;
          n.render(this.ctx, _World.canvasHeight);
          continue;
        }
        const netForce = Settings.gravity.mul(n.mass);
        for (var j = 0; j < this.objects.length; j++) {
          if (i == j)
            continue;
          const intersect = n.intersect(this.objects[j]);
          if (intersect) {
            const surfaceNormal = intersect.sub(n.pos).norm();
            n.velocity = n.velocity.sub(surfaceNormal.mul(2 * n.velocity.dot(surfaceNormal)));
            n.setPos(intersect);
          }
        }
        n.applyForce(netForce);
        n.tick(time, this.objects);
        n.render(this.ctx, _World.canvasHeight);
      }
    }
  };
  var World = _World;
  World.canvasHeight = 1e3;

  // app/app.ts
  var canvas = document.getElementById("cv");
  var coords = document.querySelector("#coords");
  var fps = document.querySelector("#fps");
  var sliders = document.querySelector(".sliders");
  var ctx = canvas.getContext("2d");
  canvas.width = 2e3;
  canvas.height = 1e3;
  var last = Date.now();
  World.canvasHeight = canvas.height;
  var world = new World(ctx, 2e3, 1e3);
  var p = new SoftBody(new vec_default(1e3, 190));
  world.addObject(p);
  world.addObject(new RectangleImmovable(new vec_default(500, 100), new vec_default(1e3, 100)));
  canvas.onmousemove = (e) => {
    var rect = canvas.getBoundingClientRect(), scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round(canvas.height - (e.clientY - rect.top) * scaleY);
    coords.textContent = `${x}, ${y}`;
    MouseState.e = e;
    MouseState.isDown = !!e.buttons;
    MouseState.x = x;
    MouseState.y = y;
  };
  Array.from(sliders.children).forEach((e) => {
    if (e instanceof HTMLInputElement) {
      e.onchange = (c) => {
        if (e.id == "gravity") {
          console.log(Settings.gravity);
          Settings[e.id] = new vec_default(0, -e.value);
        } else {
          Settings[e.id] = e.value;
        }
      };
    }
  });
  function draw() {
    ctx.fillStyle = "white";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const now = Date.now();
    const dt = now - last;
    last = now;
    world.tick(dt * 0.01);
    fps.textContent = `${Math.round(1 / dt * 1e3)} FPS`;
    requestAnimationFrame(draw);
  }
  draw();
})();
