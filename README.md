# Organic Quads

Helper class to create hexagonal shapes filled with organic looking quads.

## Usage:

```js 

import OrganicQuads from "@fforw/organic-quads";

const og = new OrganicQuads(config);

```                                     

## Configuration



```js 

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
};

```                                     

The graph will be centered in the window given by width/height and scaled so that it fits the smaller dimension height.

### Number of Rings


![Hexagon graph with 1 ring and no removed edges](misc/hexagon-1-ring-no-removal.jpg)

The diagram shows a graph with "removeEdges" set to 0 and "numberOfRings" set to 1.

I marked triangles of the initial ring and the one additional ring in the first sector of the hexagon.

Each base face is divided once to have only quads. Every triange here is subdivided into 3 quads.

Every removed edge turns two base triangles into one base quad which is then subdivided into 4 quads.

![Hexagon graph with 1 ring and no removed edges](misc/hexagon-1-ring-some-removal.jpg)

Relaxing the graph after removing the edges gives it the organic shape.

[Live interactive demo](http://pronto/test/funky-quads/)
  
