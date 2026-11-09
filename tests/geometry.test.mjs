// Redline geometry checks: the crowd maths the Lens relies on, runnable without Lens Studio.
// Run: npm test   (Node 22+: loads the TypeScript source directly via --experimental-strip-types)
import {test} from "node:test"
import assert from "node:assert/strict"
import * as g from "../Assets/Scripts/RedlineGeometry.ts"

const EDGE_CM = 22 // half a ghost's shoulder width: no body may stick out of the zone outline
const zone = (wCm, dCm) => ({minX: -wCm / 2, maxX: wCm / 2, minZ: -dCm - 100, maxZ: -100}) // near edge 1 m ahead
const SIZES = [[200, 200], [305, 200], [400, 300], [410, 305], [437, 600], [800, 600], [1000, 1000]]

test("4 x 3 m zone: 12 m², 24 people at 2 per m², 60 at 5 per m² (done criterion 1)", () => {
  const z = zone(400, 300)
  assert.equal(g.rectAreaM2(z), 12)
  assert.equal(g.peopleFor(2, z), 24)
  assert.equal(g.peopleFor(5, z), 60)
})

test("every zone and density gets exactly round(N x area) people (done criterion 2)", () => {
  for (const [w, d] of SIZES) for (let n = 0; n <= g.MAX_DENSITY; n++) {
    const z = zone(w, d)
    assert.equal(g.layoutCrowd(z, n).length, g.peopleFor(n, z), `${w}x${d} cm at ${n}`)
  }
})

test("every full square metre aligned to the highlighted square holds exactly N", () => {
  for (const [w, d] of SIZES) for (let n = 1; n <= g.MAX_DENSITY; n++) {
    const z = zone(w, d)
    const sq = g.squareRect(z)
    const spots = g.layoutCrowd(z, n)
    for (let i = -10; i <= 10; i++) for (let j = -10; j <= 10; j++) {
      const c = {minX: sq.minX + i * 100, maxX: sq.maxX + i * 100, minZ: sq.minZ + j * 100, maxZ: sq.maxZ + j * 100}
      const full = c.minX >= z.minX && c.maxX <= z.maxX && c.minZ >= z.minZ && c.maxZ <= z.maxZ
      if (!full) continue
      const inCell = spots.filter((s) => s.x >= c.minX && s.x < c.maxX && s.z >= c.minZ && s.z < c.maxZ).length
      assert.equal(inCell, n, `${w}x${d} at ${n}, cell ${i},${j}`)
    }
    assert.equal(spots.filter((s) => s.inSquare).length, n, `highlighted square at ${n}`)
  }
})

test("no ghost stands closer than half a shoulder width to the zone edge", () => {
  for (const [w, d] of SIZES) for (let n = 1; n <= g.MAX_DENSITY; n++) {
    const z = zone(w, d)
    for (const s of g.layoutCrowd(z, n)) {
      assert.ok(s.x >= z.minX + EDGE_CM - 1e-9 && s.x <= z.maxX - EDGE_CM + 1e-9, `x ${s.x} in ${w}x${d} at ${n}`)
      assert.ok(s.z >= z.minZ + EDGE_CM - 1e-9 && s.z <= z.maxZ - EDGE_CM + 1e-9, `z ${s.z} in ${w}x${d} at ${n}`)
    }
  }
})

test("layout is stable between runs (same seed, same spots)", () => {
  const z = zone(400, 300)
  assert.deepEqual(g.layoutCrowd(z, 5), g.layoutCrowd(z, 5))
})

test("dragging a corner keeps the opposite corner and clamps to 2..10 m", () => {
  const z = zone(400, 300)
  const far = g.zoneCorner(z, 2) // corner 0's opposite
  const big = g.dragCornerTo(z, 0, -5000, 5000)
  assert.deepEqual(g.zoneCorner(big, 2), far)
  assert.equal(g.rectWidth(big), g.ZONE_LIMITS.maxW)
  assert.equal(g.rectDepth(big), g.ZONE_LIMITS.maxD)
  const small = g.dragCornerTo(z, 0, far[0] - 1, far[1] + 1)
  assert.equal(g.rectWidth(small), g.ZONE_LIMITS.minW)
  assert.equal(g.rectDepth(small), g.ZONE_LIMITS.minD)
})

test("heading stays correct looking level, straight down and straight up", () => {
  const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`)
  close(g.yawOf({x: 0, y: 0, z: 1}, {x: 0, y: 1, z: 0}), 0) // level, facing -Z
  close(g.yawOf({x: 0, y: 1, z: 0.001}, {x: 0, y: 0.001, z: -1}), 0) // straight down, facing -Z
  close(g.yawOf({x: 0, y: -1, z: 0.001}, {x: 0, y: 0.001, z: 1}), 0) // straight up, facing -Z
  close(g.yawOf({x: 0, y: 1, z: 0}, {x: 1, y: 0, z: 0}), Math.atan2(-1, 0)) // down, facing +X
})
