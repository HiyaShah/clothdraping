# Drape Lab
<img width="1407" height="670" alt="Screenshot 2026-10-27 at 9 29 26 PM" src="https://github.com/user-attachments/assets/c71f66ca-a105-4438-bf45-7015b903e8e0" />

A cloth playground inspired by Pixar's [Directing Cloth Draping through Blended UVs](https://research.pixar.com/docs/2025.SiggraphTalks.CdGWE.pdf) (SIGGRAPH Talks 2025).

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

