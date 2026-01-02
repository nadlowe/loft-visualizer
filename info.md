# Info

- The X-Z plane is the horizontal plane in Three.js (Y is up)

Blue (Three.js Z) = geom X (2D right)
Red (Three.js X) = geom Y (2D up)
Green (Three.js Y) = geom Z (2D vertical)

## Decisions

1. Store polylines as arrays of numbers... odd and even for x and y.
2. Store vectors as tuples for more compact serialized form.
3. Don't use direct memory Float64Array representation for polylines, since perf/serialization complexity is not the focus of the code challenge.
