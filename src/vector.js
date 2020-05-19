const sqrt = Math.sqrt;

class Vector
{
    constructor(x,y)
    {
        this.x = x;
        this.y = y;
    }

    /**
     * Returns a copy of this vector.
     *
     * @returns {Vector} copy
     */
    copy()
    {
        return new Vector(this.x,this.y);
    }

    /**
     * Adds to this vector
     *
     * @param x     {number|Vector} x coordinate or a vector
     * @param y     {number?} y coordinate, ignored if x is a vector
     * @returns {Vector} this vector
     */

    add(x,y)
    {
        if (typeof x === "number")
        {
            this.x += x;
            this.y += y;
        }
        else
        {
            this.x += x.x;
            this.y += x.y;
        }

        return this;
    }

    /**
     * Subtracts from this vector
     *
     * @param x     {number|Vector} x coordinate or a vector
     * @param y     {number?} y coordinate, ignored if x is a vector
     * @returns {Vector} this vector
     */
    subtract(x,y)
    {
        if (typeof x === "number")
        {
            this.x -= x;
            this.y -= y;
        }
        else
        {
            this.x -= x.x;
            this.y -= x.y;
        }

        return this;
    }

    /**
     * Scales the vector by a planar number.
     *
     * @param n     scale
     * @returns {Vector} this vector, scaled
     */
    scale(n)
    {
        this.x *= n;
        this.y *= n;

        return this;
    }

    /**
     * Length of this vector
     *
     * @returns {number}    length
     */
    length()
    {
        const { x, y } = this;
        return sqrt(x*x+y*y);
    }

    /**
     * Scales the vector to normal length or a specified length
     *
     * @param targetLength      {number?} target length of the vector (default is 1, the normal vector length)
     *
     * @returns {Vector}
     */
    norm(targetLength = 1)
    {
        return this.scale(targetLength / this.length());
    }

    /**
     * Rotate vector 90 degrees clockwise.
     *
     * @returns {Vector}
     */
    rotateClockwise()
    {
        const { x, y } = this;

        //noinspection JSSuspiciousNameCombination
        this.x = y;
        this.y = -x;

        return this;
    }

    /**
     * Rotate vector 90 degrees counter clockwise.
     *
     * @returns {Vector}
     */
    rotateCounterClockwise()
    {
        const { x, y } = this;

        this.x = -y;
        //noinspection JSSuspiciousNameCombination
        this.y = x;

        return this;
    }

    /**
     * Sets the coordinates of this vector
     *
     * @param x     {number|Vector} x coordinate or a vector
     * @param y     {number?} y coordinate, ignored if x is a vector
     * @returns {Vector} this vector
     */
    set(x,y)
    {
        if (typeof x === "number")
        {
            this.x = x;
            this.y = y;
        }
        else
        {
            this.x = x.x;
            this.y = x.y;
        }

    }
}

export default Vector;
