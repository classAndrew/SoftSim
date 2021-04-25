class Vec2 {
    x: number; y: number; 

    static readonly zero = new Vec2(0, 0); 

    constructor(x: number, y: number) {
        this.x = x; this.y = y;
    }

    add(v: Vec2) : Vec2 {
        return new Vec2(this.x+v.x, this.y+v.y);
    }

    sub(v: Vec2) : Vec2 {
        return new Vec2(this.x-v.x, this.y-v.y);
    }

    dot(v: Vec2) : number {
        return this.x*v.x + this.y*v.y;
    }

    mul(t: number) : Vec2 {
        return new Vec2(this.x*t, this.y*t);
    }

    dist() : number {
        return Math.sqrt(this.x*this.x+this.y*this.y);
    }

    distSqd() : number {
        return this.x*this.x + this.y*this.y;
    }

    norm() : Vec2 {
        const magnitude = this.dist();
        return this.mul(1/magnitude);
    }

}

export default Vec2;