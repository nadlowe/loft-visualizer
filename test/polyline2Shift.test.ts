import { describe, it, expect } from "@jest/globals";
import { polyline2Shift, DIST_EPSILON } from "../lib/geomOp";
import { Polyline2 } from "../lib/geom";

describe("polyline2Shift", () => {
    type TestCase = {
        name: string;
        input: Polyline2;
        shift: number;
        expected: Polyline2;
    };

    const testCases: TestCase[] = [
        // Closed polyline - positive shifts
        {
            name: "closed polyline shift 0",
            input: [1, 1, 2, 2, 3, 3, 1, 1],
            shift: 0,
            expected: [1, 1, 2, 2, 3, 3, 1, 1],
        },
        {
            name: "closed polyline shift 1",
            input: [1, 1, 2, 2, 3, 3, 1, 1],
            shift: 1,
            expected: [2, 2, 3, 3, 1, 1, 2, 2],
        },
        {
            name: "closed polyline shift 2",
            input: [1, 1, 2, 2, 3, 3, 1, 1],
            shift: 2,
            expected: [3, 3, 1, 1, 2, 2, 3, 3],
        },
        {
            name: "closed polyline shift 3 (wraps to 0)",
            input: [1, 1, 2, 2, 3, 3, 1, 1],
            shift: 3,
            expected: [1, 1, 2, 2, 3, 3, 1, 1],
        },
        {
            name: "closed polyline shift 4 (wraps to 1)",
            input: [1, 1, 2, 2, 3, 3, 1, 1],
            shift: 4,
            expected: [2, 2, 3, 3, 1, 1, 2, 2],
        },

        // Closed polyline - negative shifts
        {
            name: "closed polyline shift -1",
            input: [1, 1, 2, 2, 3, 3, 1, 1],
            shift: -1,
            expected: [3, 3, 1, 1, 2, 2, 3, 3],
        },
        {
            name: "closed polyline shift -2",
            input: [1, 1, 2, 2, 3, 3, 1, 1],
            shift: -2,
            expected: [2, 2, 3, 3, 1, 1, 2, 2],
        },
        {
            name: "closed polyline shift -3 (wraps to 0)",
            input: [1, 1, 2, 2, 3, 3, 1, 1],
            shift: -3,
            expected: [1, 1, 2, 2, 3, 3, 1, 1],
        },
        {
            name: "closed polyline shift -4 (wraps to -1)",
            input: [1, 1, 2, 2, 3, 3, 1, 1],
            shift: -4,
            expected: [3, 3, 1, 1, 2, 2, 3, 3],
        },

        // Open polyline - positive shifts
        {
            name: "open polyline shift 0",
            input: [1, 1, 2, 2, 3, 3],
            shift: 0,
            expected: [1, 1, 2, 2, 3, 3],
        },
        {
            name: "open polyline shift 1",
            input: [1, 1, 2, 2, 3, 3],
            shift: 1,
            expected: [2, 2, 3, 3, 1, 1],
        },
        {
            name: "open polyline shift 2",
            input: [1, 1, 2, 2, 3, 3],
            shift: 2,
            expected: [3, 3, 1, 1, 2, 2],
        },
        {
            name: "open polyline shift 3 (wraps to 0)",
            input: [1, 1, 2, 2, 3, 3],
            shift: 3,
            expected: [1, 1, 2, 2, 3, 3],
        },
        {
            name: "open polyline shift 4 (wraps to 1)",
            input: [1, 1, 2, 2, 3, 3],
            shift: 4,
            expected: [2, 2, 3, 3, 1, 1],
        },

        // Open polyline - negative shifts
        {
            name: "open polyline shift -1",
            input: [1, 1, 2, 2, 3, 3],
            shift: -1,
            expected: [3, 3, 1, 1, 2, 2],
        },
        {
            name: "open polyline shift -2",
            input: [1, 1, 2, 2, 3, 3],
            shift: -2,
            expected: [2, 2, 3, 3, 1, 1],
        },
        {
            name: "open polyline shift -3 (wraps around)",
            input: [1, 1, 2, 2, 3, 3],
            shift: -3,
            expected: [1, 1, 2, 2, 3, 3],
        },
        {
            name: "open polyline shift -4 (wraps to -1)",
            input: [1, 1, 2, 2, 3, 3],
            shift: -4,
            expected: [3, 3, 1, 1, 2, 2],
        },

        // Test distance epsilon
        {
            name: "almost closed polyline (within epsilon) treated as closed",
            input: [
                1,
                1,
                2,
                2,
                3,
                3,
                1 + DIST_EPSILON / 2,
                1 + DIST_EPSILON / 2,
            ],
            shift: 1,
            expected: [2, 2, 3, 3, 1, 1, 2, 2],
        },
        {
            name: "almost closed polyline (just outside epsilon) treated as open",
            input: [
                1,
                1,
                2,
                2,
                3,
                3,
                1 + DIST_EPSILON * 2,
                1 + DIST_EPSILON * 2,
            ],
            shift: 1,
            expected: [
                2,
                2,
                3,
                3,
                1 + DIST_EPSILON * 2,
                1 + DIST_EPSILON * 2,
                1,
                1,
            ],
        },
        {
            name: "almost closed polyline X within epsilon, Y within epsilon",
            input: [
                1,
                1,
                2,
                2,
                3,
                3,
                1 + DIST_EPSILON / 2,
                1 - DIST_EPSILON / 2,
            ],
            shift: 1,
            expected: [2, 2, 3, 3, 1, 1, 2, 2],
        },
        {
            name: "almost closed polyline X outside epsilon, Y within epsilon",
            input: [1, 1, 2, 2, 3, 3, 1 + DIST_EPSILON * 2, 1],
            shift: 1,
            expected: [2, 2, 3, 3, 1 + DIST_EPSILON * 2, 1, 1, 1],
        },

        // Edge cases
        {
            name: "empty polyline",
            input: [],
            shift: 1,
            expected: [],
        },
        {
            name: "single vertex polyline",
            input: [1, 1],
            shift: 1,
            expected: [1, 1],
        },
        {
            name: "closed polyline with 2 vertices",
            input: [1, 1, 2, 2, 1, 1],
            shift: 1,
            expected: [2, 2, 1, 1, 2, 2],
        },
        {
            name: "open polyline with 2 vertices shift 1",
            input: [1, 1, 2, 2],
            shift: 1,
            expected: [2, 2, 1, 1],
        },
        {
            name: "open polyline with 2 vertices shift -1",
            input: [1, 1, 2, 2],
            shift: -1,
            expected: [2, 2, 1, 1],
        },
    ];

    testCases.forEach(({ name, input, shift, expected }) => {
        it(name, () => {
            const result = polyline2Shift(input, shift);
            expect(result).toEqual(expected);
        });
    });
});
