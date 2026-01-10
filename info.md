# Info

Coordinate system:

- Red (Three.js X) = geom X (2D right)
- Green (Three.js Y) = geom Y (2D up)
- Blue (Three.js Z) = geom Z (2D vertical/up)

## Decisions

1. Store polylines as arrays of numbers... odd and even for x and y.
2. Store vectors as tuples for more compact serialized form.
3. Don't use direct memory Float64Array representation for polylines, since perf/serialization complexity is not the focus of the code challenge.
4. Created geom unit tests mostly to ensure geometry is working correctly, but I'm not diving into perfecting them yet or perhaps not at all.

## Strategies

1. Strict Nulls (strict mode) = AI efficiency
2. Cycle Detection Watch

## Design Thoughts

1. Workplanes should be a 1st class entity.
2. A polyline should always require a workplane.
   a. When drawing a polyline without having a work plane selected, it creates a workplane on globalXY at centroid of polyline2.
3. A loft is created by taking any two polylines and "lofting" them.

## Next Steps

First. Isolate code around loft methodology, so it can be presented and shared.

1. Create an encoding methodology such that vertex connections can be marked and persisted.
2. When editing the polyline those vertex connections also get edited.
3. First step create loft (with a type drop-down)... but then make the edges selectable... like polyline vertices.
4. Keep this first loft style and call it "incremental".
5. Create an explicit loft... use number of vertex to determine from the beginning 8 (really 9) and 4(really 5). This would have 2 to 1 effect.
6. Encode those relationships.
7. Make sure those relationships heal on edits.

Use parametric correspondence... so that 0 - 1 so I
Pick one vertex on one and then pick the closest vertex on the other... then use parametric correspondence from there. The least vertices will determine the initial pairings then the others should match the parameterization of the vertex to the domain of the segment on the other.

Then final steps...

1. Finish above... make sure all geometric operations have unit tests.
2. Delete all unused steps.
3. Create a readme file explaining the repo.
