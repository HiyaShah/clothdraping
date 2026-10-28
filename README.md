# Drape Lab

A browser-only cloth playground inspired by Pixar's [Directing Cloth Draping through Blended UVs](https://research.pixar.com/docs/2025.SiggraphTalks.CdGWE.pdf) (SIGGRAPH Talks 2025). Built for GitHub Pages. No Python, Viser server, build step, or backend is required.

## GitHub Pages

In this repository, go to **Settings → Pages → Build and deployment**, select **Deploy from a branch**, then **main** and **/(root)**, and save. When deployment finishes, open `https://hiyashah.github.io/clothdraping/`.

## Run locally

Run `python3 -m http.server 8000` from the repository directory and open `http://localhost:8000`. Any static web server works. ES modules require HTTP; opening index.html via file:// will not work.

## Explore

- Drag the scene to orbit; scroll to zoom. Camera restores the starting view.
- **3D shape** uses α = β = 0. **Flat panel** uses α = β = 1. **Blended** uses a shoulder-to-hem weight gradient with α = β = 0.65.
- α controls the average log stretch (uniform scale); β controls the difference of log stretches (anisotropy). Each triangle averages its three painted vertex weights. With painted weights enabled, effective α and β are multiplied by that weight.
- Drag across the 2D panel to paint. Choose a brush value of 0 (preserve 3D) or 1 (flat panel). Keyboard: focus the panel, use Up/Down to select a row, and Enter/Space to paint its center.
- Enable Weight map to see the painted weights in 3D. Ghost shows the original mesh. Reset cloth restores positions and velocity while retaining settings and weights.
- Pause and single-step to inspect the simulation. Reduced-motion preferences start the simulation paused.

## What the solver does

For each triangle, construct a local orthonormal 3D tangent basis B and a linear map F from its 3D coordinates to flat-panel coordinates. Diagonalizing FᵀF gives the singular directions and principal stretches s₁ ≥ s₂ > 0. Blend them using the paper's equations:

```
m = (log(s₁) + log(s₂)) / 2
d = (log(s₁) - log(s₂)) / 2
blended_s₁ = exp(α m + β d)
blended_s₂ = exp(α m - β d)
```

The resulting metric determines each triangle's preferred edge lengths. Shared edges average the two neighboring target lengths. A position-based solver relaxes these distance constraints under gravity and wind, with a pinned upper boundary, a floor, and a simple ellipsoidal torso collider. The 3D shape is not used as a positional attraction target. Paint edits adjust rest lengths while keeping the current pose; preset buttons reset the cloth for a repeatable comparison.

**Limits:** this is an educational approximation, not Pixar's C3D/Fizt implementation. Edge constraints replace a full anisotropic constitutive cloth model. There is no bending energy, self-collision, friction, sewing, automatic panel flattening, garment import, or production collision handling. A 3D rest metric alone does not uniquely preserve a silhouette: a surface can bend without stretching. Pinning and the dummy body's contact supply additional constraints. The flat panel is authored procedurally, not automatically unwrapped. Wind is a simple acceleration, not aerodynamic pressure.

## Assets and dependencies

The mannequin, cape, and panel are generated in code. No Disney, Pixar, or Big Hero 6 assets are included. `vendor/three.module.js` is Three.js 0.170.0, vendored so the 3D engine does not require a CDN at runtime. Its MIT license is included in `vendor/THREE-LICENSE.txt`. Google Fonts is optional; system and Georgia fallbacks work without it. Everything else is native browser JavaScript and CSS.

## Verification

Node.js 18+ is sufficient: `npm test`. Tests check the exact metric endpoints, independent scale/anisotropy behavior, pin and floor constraints, numerical stability, and weight painting.

## Files

- `index.html`, `style.css`, `app.js`: browser interface and Three.js scene.
- `simulation.js`: renderer-independent triangle metric and cloth solver.
- `tests/simulation.test.js`: numerical tests.

The reference talk is by Juan Carlos Olmos Guerra, Fernando de Goes, Christine Waggoner, and David Eberle, Pixar Animation Studios. This independent demonstration is not affiliated with Pixar or Disney.
