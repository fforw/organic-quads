import Vector from "./vector";

const SIZE = 10; // count + case(1=odd face 2=outmost tri) + 4 * x/y
const TAU = Math.PI * 2;

const SIXTH = TAU / 6;

function calculateNumberOfFaces(limit)
{
    return 6 * (limit + 1) * (limit + 1);
}


const DEFAULT_CONFIG = {
    // coordinate width
    width: 0,
    // coordinate height
    height: 0,
    // number of rings in the hexagon / number of base intersections of hexaxgon
    numberOfRings: 5,
    // how many percent of the edges shall we attempt to remove?
    removeEdges: 50,
    // if true, the graph will be layouted a bit with every render. If false, the graph relaxation happens at creation
    animatedEasing: true,

    /// MOSTLY INTERNAL CONFIG ////
    
    // calculated internally to match the height
    edgeLength: 80,
    // number of iterations until we give up (we will drop out due to having reached low energy most likely much sooner)
    maxIterations: 100,
    // set to false if the graph is done animated on animatedEasing : true
    animating: true,

    // Minimum energy at which we stop relaxing the graph
    minTension: 2
};



function updateConfig(config)
{
    config.numFaces = calculateNumberOfFaces(config.numberOfRings)
    config.firstPassLen = config.numFaces * SIZE
    config.firstPassNumEdges = config.numFaces * 3
    config.edgeLength = ( Math.min(config.width, config.height) / (config.numberOfRings * 2 + 2)) | 0;
    config.animating = config.animatedEasing;
    config.relaxCount = 0;
}


function createHexagonTriangles(config)
{

    const limit = config.numberOfRings;

    //console.log("createHexagonTriangles", limit);

    const DIRECTIONS = [
        new Vector(
            Math.cos(0) * config.edgeLength,
            Math.sin(0) * config.edgeLength
        ),
        new Vector(
            Math.cos(SIXTH) * config.edgeLength,
            Math.sin(SIXTH) * config.edgeLength
        ),
        new Vector(
            Math.cos(SIXTH * 2) * config.edgeLength,
            Math.sin(SIXTH * 2) * config.edgeLength
        ),
        new Vector(
            Math.cos(SIXTH * 3) * config.edgeLength,
            Math.sin(SIXTH * 3) * config.edgeLength
        ),
        new Vector(
            Math.cos(SIXTH * 4) * config.edgeLength,
            Math.sin(SIXTH * 4) * config.edgeLength
        ),
        new Vector(
            Math.cos(SIXTH * 5) * config.edgeLength,
            Math.sin(SIXTH * 5) * config.edgeLength
        )
    ];

    const faces = new Float64Array(config.firstPassLen);

    let off = 0;

    let count = 0;
    let numTris = 1;
    do
    {
        for (let i = 0; i < 6; i++)
        {
            const v0 = DIRECTIONS[i];
            const v1 = DIRECTIONS[(i + 1) % 6];
            const v2 = DIRECTIONS[(i + 2) % 6];

            let pos = v0.copy().scale(count);

            for (let j = 0; j < numTris; j++)
            {
                if (j & 1)
                {
                    faces[off++] = (pos.x) | 0;
                    faces[off++] = (pos.y) | 0;
                    faces[off++] = (pos.x + v1.x) | 0;
                    faces[off++] = (pos.y + v1.y) | 0;
                    faces[off++] = (pos.x + v2.x) | 0;
                    faces[off++] = (pos.y + v2.y) | 0;
                    off += 2;
                    faces[off++] = 3;
                    faces[off++] = -1;

                    pos.add(v2);
                }
                else
                {

                    faces[off++] = (pos.x) | 0;
                    faces[off++] = (pos.y) | 0;
                    faces[off++] = (pos.x + v0.x) | 0;
                    faces[off++] = (pos.y + v0.y) | 0;
                    faces[off++] = (pos.x + v1.x) | 0;
                    faces[off++] = (pos.y + v1.y) | 0;
                    off += 2;
                    faces[off++] = 3;

                    // All tris in the last row all have their edge #1 on the outer edge of the big hexagon
                    const isOutmost = count === limit;
                    faces[off++] = isOutmost ? 1 : -1;
                }
            }
        }

        numTris += 2;

    } while (count++ < limit);

    return faces;
}


function findOtherEdge(faces, x0, y0, x1, y1, index, out)
{
    for (let i = 0; i < faces.length; i += SIZE)
    {
        if (i === index)
        {
            continue;
        }

        // console.log("find", x0, y0, x1, y1, ":",
        //     faces[i    ], faces[i + 1],
        //     faces[i + 2], faces[i + 3],
        //     faces[i + 4], faces[i + 5],
        //     faces[i + 6], faces[i + 7],
        // );

        const count = faces[i + 8];
        if (
            faces[i] === x1 && faces[i + 1] === y1 &&
            faces[i + 2] === x0 && faces[i + 3] === y0
        )
        {
            out.index = i;
            out.edge = 0;
            return;
        }
        if (
            faces[i + 2] === x1 && faces[i + 3] === y1 &&
            faces[i + 4] === x0 && faces[i + 5] === y0
        )
        {
            out.index = i;
            out.edge = 1;
            return;
        }

        if (count === 3)
        {
            if (
                faces[i + 4] === x1 && faces[i + 5] === y1 &&
                faces[i] === x0 && faces[i + 1] === y0
            )
            {
                out.index = i;
                out.edge = 2;
                return;
            }
        }
        else
        {
            if (
                faces[i + 4] === x1 && faces[i + 5] === y1 &&
                faces[i + 6] === x0 && faces[i + 7] === y0
            )
            {
                out.index = i;
                out.edge = 2;
                return;
            }

            if (
                faces[i + 6] === x1 && faces[i + 7] === y1 &&
                faces[i] === x0 && faces[i] === y0
            )
            {
                out.index = i;
                out.edge = 3;
                return;
            }

        }
    }

    out.index = -1;
}


const out = {index: -1, edge: 0};


function removeRandomEdges(config, faces)
{
    const count = config.firstPassNumEdges * config.removeEdges / 100;

    //console.log("remove attempts", count);

    let success = 0;

    // function printEdge(faces, otherIndex, outMostEdge)
    // {
    //     const count = faces[otherIndex + 8];
    //     const x0 = faces[otherIndex + outMostEdge * 2]
    //     const y0 = faces[otherIndex + outMostEdge * 2 + 1]
    //     const x1 = outMostEdge === count -1 ? faces[otherIndex] : faces[otherIndex + (outMostEdge + 1) * 2]
    //     const y1 = outMostEdge === count -1 ? faces[otherIndex + 1] : faces[otherIndex + (outMostEdge + 1) * 2 + 1]
    //
    //
    //     return x0 + "," + y0 + "," + x1 + "," + y1;
    // }

    for (let i = 0; i < count; i++)
    {
        const index = ((Math.random() * config.numFaces) | 0) * SIZE;
        if (faces[index + 8] === 3)
        {
            const outmostEdge = faces[index + 9];
            const targetIsOutmostFace = outmostEdge >= 0;

            const edge = (Math.random() * 3) | 0;

            // we can't remove any of the outmost edges around the big hexagon
            if (!(targetIsOutmostFace))//&& edge === outmostEdge))
            {

                const x0 = faces[index + edge * 2];
                const y0 = faces[index + edge * 2 + 1];
                const x1 = edge === 2 ? faces[index] : faces[index + (edge + 1) * 2];
                const y1 = edge === 2 ? faces[index + 1] : faces[index + (edge + 1) * 2 + 1];

                findOtherEdge(faces, x0, y0, x1, y1, index, out)
                if (out.index >= 0 && faces[out.index + 8] === 3)
                {
                    const {index: otherIndex, edge: otherEdge} = out;
                    const x2 = edge === 0 ? faces[index + 2 * 2] : faces[index + (edge - 1) * 2];
                    const y2 = edge === 0 ? faces[index + 2 * 2 + 1] : faces[index + (edge - 1) * 2 + 1];

                    // check if we're merging with an outmost face
                    const outMostEdge = faces[otherIndex + 9];
                    const otherIsOutmostTri = outMostEdge >= 0;

                    //const before = printEdge(faces, otherIndex, outMostEdge)
                    // if (otherIsOutmostTri)
                    // {
                    //     console.log("OUTMOST edge before split", printEdge(faces, otherIndex, outMostEdge),"EDGE CASE", otherEdge, "outMostEdge", outMostEdge)
                    //     console.log("face before", faces.slice(otherIndex, otherIndex + SIZE))
                    // }

                    faces[otherIndex + 8] = 4;
                    switch (otherEdge)
                    {
                        case 2:
                            faces[otherIndex + 6] = x2;
                            faces[otherIndex + 7] = y2;
                            break;
                        case 1:
                            faces[otherIndex + 6] = faces[otherIndex + 4];
                            faces[otherIndex + 7] = faces[otherIndex + 5];
                            faces[otherIndex + 4] = x2;
                            faces[otherIndex + 5] = y2;
                            break;
                        case 0:
                            faces[otherIndex + 6] = faces[otherIndex + 4];
                            faces[otherIndex + 7] = faces[otherIndex + 5];
                            faces[otherIndex + 4] = faces[otherIndex + 2];
                            faces[otherIndex + 5] = faces[otherIndex + 3];
                            faces[otherIndex + 2] = x2
                            faces[otherIndex + 3] = y2;

                            if (otherIsOutmostTri)
                            {
                                faces[otherIndex + 9] = 2;
                            }

                            break;
                    }

                    // remove our face
                    faces[index + 8] = 0;

                    success++;
                }
            }
        }
    }

    console.log("Successfully removed", success, "out of", count);

    return success;
}


function calculateNumNodes(config, faces)
{
    let tris = 0;
    let quads = 0;
    for (let i = 0; i < config.firstPassLen; i += SIZE)
    {
        const count = faces[i + 8];

        if (count === 3)
        {
            tris++;
        }
        else if (count === 4)
        {
            quads++;
        }
    }

    //console.log({quads,tris})

    // we divide each quad in 9 nodes and each tri into 7 nodes
    return quads * 9 + tris * 7;
}


const NODE_SIZE = 10;


function subdivide(config, faces)
{
    const numNodes = calculateNumNodes(config, faces);

    const nodes = new Float64Array(numNodes * NODE_SIZE);

    let pos = 0;

    const insertNode = (x0, y0, isEdge) => {

        x0 |= 0;
        y0 |= 0;

        for (let i = 0; i < pos; i += NODE_SIZE)
        {
            if (Math.abs(nodes[i] - x0) < 2 && Math.abs(nodes[i + 1] - y0) < 2)
            {
                // if we discover an odd face vertex touching the outmost edge, we will
                // not register that because the odd tris are not marked as having an outmost edge, because they don't, they
                // only have one vertices on the edge at most
                // Later we might however return to that node within an outmost edge and we have to make sure that
                // we take over the isEdge status from such a node
                if (isEdge && !nodes[i + 2])
                {
                    nodes[i + 2] = 1;
                }

                return i;
            }
        }

        const index = pos;

        nodes[pos] = x0;
        nodes[pos + 1] = y0;
        nodes[pos + 2] = isEdge ? 1 : 0;
        nodes[pos + 3] = 0;

        nodes[pos + 4] = -1;
        nodes[pos + 5] = -1;
        nodes[pos + 6] = -1;
        nodes[pos + 7] = -1;

        pos += NODE_SIZE;

        return index;
    }

    const insertEdge = (n0, n1) => {
        let count = nodes[n0 + 3];

        let found = false;
        for (let i = 0; i < count; i++)
        {
            const other = nodes[n0 + 4 + i];
            if (other === n1)
            {
                found = true;
                break;
            }
        }
        if (!found)
        {
            if (count >= 6)
            {
                throw new Error("At most 6 edges per node")
            }

            nodes[n0 + 4 + count++] = n1;
            nodes[n0 + 3] = count;
        }

    }
    const connect = (n0, n1) => {

        insertEdge(n0, n1);
        insertEdge(n1, n0);

    }

    for (let i = 0; i < config.firstPassLen; i += SIZE)
    {
        const count = faces[i + 8];
        if (count === 0)
        {
            continue;
        }

        const x0 = faces[i]
        const y0 = faces[i + 1]
        const x1 = faces[i + 2]
        const y1 = faces[i + 3]
        const x2 = faces[i + 4]
        const y2 = faces[i + 5]

        const outmostEdge = faces[i + 9];

        const firstEdgeIsOutmost = outmostEdge === 1;
        const secondEdgeIsOutmost = outmostEdge === 2;

        if (count === 3)
        {
            const m0x = (x0 + x1) / 2;
            const m0y = (y0 + y1) / 2;
            const m1x = (x1 + x2) / 2;
            const m1y = (y1 + y2) / 2;
            const m2x = (x2 + x0) / 2;
            const m2y = (y2 + y0) / 2;

            const cx = (x0 + x1 + x2) / 3
            const cy = (y0 + y1 + y2) / 3

            const n0 = insertNode(x0, y0);
            const n1 = insertNode(m0x, m0y);
            const n2 = insertNode(x1, y1, firstEdgeIsOutmost);
            const n3 = insertNode(m1x, m1y, firstEdgeIsOutmost);
            const n4 = insertNode(x2, y2, firstEdgeIsOutmost);
            const n5 = insertNode(m2x, m2y);
            const n6 = insertNode(cx, cy);

            connect(n0, n1);
            connect(n1, n6);
            connect(n6, n5);
            connect(n5, n0);

            connect(n1, n2);
            connect(n2, n3);
            connect(n3, n6);
            connect(n6, n1);

            connect(n5, n6);
            connect(n6, n3);
            connect(n3, n4);
            connect(n4, n5);

        }
        else
        {
            const x3 = faces[i + 6]
            const y3 = faces[i + 7]

            const m0x = (x0 + x1) / 2;
            const m0y = (y0 + y1) / 2;
            const m1x = (x1 + x2) / 2;
            const m1y = (y1 + y2) / 2;
            const m2x = (x2 + x3) / 2;
            const m2y = (y2 + y3) / 2;
            const m3x = (x3 + x0) / 2;
            const m3y = (y3 + y0) / 2;

            const cx = (x0 + x1 + x2 + x3) / 4
            const cy = (y0 + y1 + y2 + y3) / 4

            const n0 = insertNode(x0, y0);
            const n1 = insertNode(m0x, m0y);
            const n2 = insertNode(x1, y1, firstEdgeIsOutmost);
            const n3 = insertNode(m1x, m1y, firstEdgeIsOutmost);
            const n4 = insertNode(x2, y2, firstEdgeIsOutmost || secondEdgeIsOutmost);
            const n5 = insertNode(m2x, m2y, secondEdgeIsOutmost);
            const n6 = insertNode(x3, y3, secondEdgeIsOutmost);
            const n7 = insertNode(m3x, m3y);
            const n8 = insertNode(cx, cy);

            connect(n0, n1);
            connect(n1, n2);
            connect(n2, n3);
            connect(n3, n4);
            connect(n4, n5);
            connect(n5, n6);
            connect(n6, n7);
            connect(n7, n0);

            connect(n8, n3);
            connect(n8, n5);
            connect(n8, n7);
            connect(n8, n1);
        }
    }

    const fillRate = (pos / NODE_SIZE) / numNodes;
    //console.log("SUBDIVIDED: limit = ", numNodes, ", fill rate = ", fillRate);

    return nodes.slice(0, pos);
}


function relaxWeighted(config, graph, maxIterations = 1)
{

    const {length} = graph;

    for (let i = 0; i < maxIterations; i++)
    {
        let energy = 0;
        for (let j = 0; j < length; j += NODE_SIZE)
        {
            if (!graph[j + 2])
            {
                const x0 = graph[j]
                const y0 = graph[j + 1]
                const edgeCount = graph[j + 3]

                let centerX = 0;
                let centerY = 0;
                let sumWeight = 0;

                for (let k = 0; k < edgeCount; k++)
                {
                    const other = graph[j + 4 + k];

                    const x1 = graph[other];
                    const y1 = graph[other + 1];

                    const dx = x1 - x0;
                    const dy = y1 - y0;

                    let weight = Math.sqrt(dx * dx + dy * dy);

                    centerX += x1 * weight;
                    centerY += y1 * weight;
                    sumWeight += weight;
                }

                const x1 = centerX / sumWeight
                const y1 = centerY / sumWeight;

                const dx = x1 - x0;
                const dy = y1 - y0;

                graph[j] = x1;
                graph[j + 1] = y1;

                energy += dx * dx + dy * dy;

            }
        }

        if (energy < config.minEnergy)
        {
            console.log("Reached minimal energy", config.minEnergy, "after", config.relaxCount, "iterations")
            return true;
        }
        config.relaxCount++;
    }

    if (!config.animatedEasing)
    {
        console.log("Stopping after max iterations = " + config.maxIterations)
    }

    return false;
}


/**
 * A hexagon filled with quads forming organic shapes.
 */
class OrganicQuads {
    constructor(cfg)
    {

        const config = {
            ...DEFAULT_CONFIG,
            ...cfg
        }

        updateConfig(config)

        this.config = config;

        const faces = createHexagonTriangles(config);
        removeRandomEdges(config, faces)
        const graph = subdivide(config, faces);
        if (!config.animating)
        {
            relaxWeighted(config, graph, config.maxIterations);
        }
        //console.log("GRAPH SIZE", graph.length / NODE_SIZE, graph);
        this.graph = graph;

    }


    render = ctx =>
    {
        const { config, graph } = this;


        ctx.save();

        const hw = config.width / 2;
        const hh = config.height / 2;

        ctx.translate(hw, hh)

        const {length} = graph;

        ctx.fillStyle = "#000";
        ctx.fillRect(-hw, -hh, config.width, config.height)

        // draw original quads and tris

        // ctx.strokeStyle = "#f00";
        // ctx.lineWidth = 1;
        //
        //
        // let outerCount = 0;
        // for (let pos = 0; pos < config.firstPassLen; pos += SIZE)
        // {
        //     const count = faces[pos + 8];
        //
        //     if (count >= 3)
        //     {
        //
        //         ctx.beginPath();
        //         ctx.moveTo(faces[pos ],faces[pos + 1]);
        //
        //         for (let i = 1; i < count; i++)
        //         {
        //             ctx.lineTo(faces[pos + i*2],faces[pos +  i*2 + 1]);
        //         }
        //
        //         ctx.closePath();
        //         ctx.stroke();
        //
        //         // const outmostEdge = faces[pos + 9];
        //         // if (outmostEdge >= 0)
        //         // {
        //         //     ctx.strokeStyle = "#fe0";
        //         //     ctx.beginPath();
        //         //     ctx.moveTo(faces[pos + outmostEdge * 2  ],faces[pos + outmostEdge * 2 + 1]);
        //         //
        //         //     if (outmostEdge === count - 1)
        //         //     {
        //         //         ctx.lineTo(faces[pos  ],faces[pos + 1]);
        //         //     }
        //         //     else
        //         //     {
        //         //         ctx.lineTo(faces[pos + (outmostEdge + 1 ) * 2  ],faces[pos + (outmostEdge + 1 ) * 2 + 1]);
        //         //     }
        //         //     ctx.stroke();
        //         //     ctx.strokeStyle = "#f00";
        //         //
        //         //     outerCount++;
        //         //
        //         // }
        //
        //     }
        // }
        ///    console.log("Number of outer edges", outerCount)

        //console.log("DRAW EDGES")

        ctx.strokeStyle = "#fff";
        ctx.fillStyle = "#f0f";
        ctx.lineWidth = 1;


        function drawEdge(x0, y0, node)
        {
            const x1 = graph[node];
            const y1 = graph[node + 1];

            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();
        }


        for (let i = 0; i < length; i += NODE_SIZE)
        {
            const x0 = graph[i];
            const y0 = graph[i + 1];
            const edgeCount = graph[i + 3];

            for (let j = 0; j < edgeCount; j++)
            {
                drawEdge(x0, y0, graph[i + 4 + j])
            }
        }
        //
        // for (let i = 0; i < length; i += NODE_SIZE)
        // {
        //     const x0 = graph[i];
        //     const y0 = graph[i + 1];
        //     const isEdge = graph[i + 2];
        //
        //     if (isEdge)
        //     {
        //         ctx.fillRect(x0 - 4,  y0 - 4, 8, 8)
        //     }
        // }

        // ctx.strokeStyle = "#f00";
        // ctx.lineWidth = 4;
        //
        // for (let pos = 0; pos < config.firstPassLen; pos += SIZE)
        // {
        //     const count = faces[pos + 8];
        //     const outmostEdge = faces[pos + 9];
        //
        //
        //     const last = count - 1;
        //     for (let i=0; i < count; i++)
        //     {
        //         if (i === outmostEdge)
        //         {
        //             ctx.strokeStyle = "rgba(255,0,0,0.5)";
        //         }
        //         else
        //         {
        //             ctx.strokeStyle = "rgba(0,255,0,0.5)";
        //         }
        //
        //         ctx.beginPath();
        //         ctx.moveTo(faces[pos + i * 2], faces[pos + i * 2 + 1]);
        //         ctx.lineTo(
        //             i === last ? faces[pos    ] : faces[pos + (i+1) * 2],
        //             i === last ? faces[pos + 1] : faces[pos + (i+1) * 2 + 1]
        //         );
        //         ctx.stroke();
        //     }
        // }

        ctx.restore();

        if (config.animating)
        {
            if (relaxWeighted(config, graph))
            {
                config.animating = false;
            }
            //            raf(redrawGraph)
        }
    }

}


export default OrganicQuads
