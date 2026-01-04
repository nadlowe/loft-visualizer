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

## Design Thoughts

1. Workplanes should be a 1st class entity.
2. A polyline should always require a workplane.
   a. When drawing a polyline without having a work plane selected, it creates a workplane on globalXY at centroid of polyline2.
3. A loft is created by taking any two polylines and "lofting" them.

## Next Steps

1. Remove the X from the Load File. You shouldn't be able to delete from there.
2. Make it possible to draw on the world plane... that will be a polyline without a workplane.
3. There should be a double-click on a polyline to enter edit mode.
   a. Edit mode should support merging vertices and adding more vertices and removing vertices. Along with editing them.
