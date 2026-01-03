# Info

- THREE.js is configured to use Z as up (matching geom coordinate system)
- The X-Y plane is the horizontal plane (Z is up)
- No coordinate conversion needed: geom [x, y, z] = THREE.js [x, y, z]

Coordinate system:

- Red (Three.js X) = geom X (2D right)
- Green (Three.js Y) = geom Y (2D up)
- Blue (Three.js Z) = geom Z (2D vertical/up)

## Decisions

1. Store polylines as arrays of numbers... odd and even for x and y.
2. Store vectors as tuples for more compact serialized form.
3. Don't use direct memory Float64Array representation for polylines, since perf/serialization complexity is not the focus of the code challenge.
