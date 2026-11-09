# Stability of Predator–Prey Ecosystems | Eigenvalue & Dynamical Systems Analyzer

An interactive, agency-grade scientific web application and mathematical simulator for computing and analyzing the **Stability of Predator–Prey Ecosystems using Eigenvalues of Linear Differential Systems**.

Built for engineering, mathematics, physics, and ecology students (Semester 2 Applied Mathematics, Differential Equations, and Dynamical Systems).

---

## 🔬 Mathematical & Theoretical Foundations

### 1. Model Formulations

#### A. Classic Lotka–Volterra Model
$$\frac{dx}{dt} = \alpha x - \beta x y = x(\alpha - \beta y)$$
$$\frac{dy}{dt} = \delta x y - \gamma y = y(\delta x - \gamma)$$
- $x(t)$: Prey population density (e.g., hares)
- $y(t)$: Predator population density (e.g., lynx)
- $\alpha$: Prey natural per-capita growth rate
- $\beta$: Predation/consumption rate
- $\delta$: Predator conversion efficiency (biomass conversion)
- $\gamma$: Predator natural mortality rate

**Equilibria:**
- Trivial Extinction: $E_0 = (0, 0)$
- Sustainable Coexistence: $E_1 = \left(\frac{\gamma}{\delta}, \frac{\alpha}{\beta}\right)$

**Jacobian Linearization:**
$$J(x, y) = \begin{pmatrix} \alpha - \beta y & -\beta x \\ \delta y & \delta x - \gamma \end{pmatrix}$$

At Coexistence $E_1$:
$$J(E_1) = \begin{pmatrix} 0 & -\frac{\beta \gamma}{\delta} \\ \frac{\delta \alpha}{\beta} & 0 \end{pmatrix}$$
- $\tau = \text{Tr}(J) = 0$
- $\Delta = \det(J) = \alpha \gamma > 0$
- Characteristic equation: $\lambda^2 + \alpha \gamma = 0$
- **Eigenvalues:** $\lambda_{1, 2} = \pm i \sqrt{\alpha \gamma}$ (Pure imaginary)
- **Stability:** **Center (Neutrally Stable)** $\implies$ Trajectories form closed concentric periodic orbits in phase space without damping or exponential growth.

---

#### B. Lotka–Volterra with Logistic Prey Growth
Incorporates finite environmental resources with prey carrying capacity $K$:
$$\frac{dx}{dt} = r x \left(1 - \frac{x}{K}\right) - \beta x y$$
$$\frac{dy}{dt} = \delta x y - \gamma y$$

At Coexistence $x^* = \frac{\gamma}{\delta}$, $y^* = \frac{r}{\beta}\left(1 - \frac{x^*}{K}\right)$:
$$J(x^*, y^*) = \begin{pmatrix} -\frac{r x^*}{K} & -\beta x^* \\ \delta y^* & 0 \end{pmatrix}$$
- $\tau = -\frac{r x^*}{K} < 0$
- $\Delta = \beta \delta x^* y^* > 0$
- Since $\tau < 0$ and $\Delta > 0$, real parts of eigenvalues are strictly negative:
  $$\text{Re}(\lambda) = \frac{\tau}{2} = -\frac{r x^*}{2K} < 0$$
- **Stability:** **Stable Spiral / Focus (Asymptotically Stable)** $\implies$ Boom-and-bust fluctuations gradually dampen over time, settling smoothly into steady coexistence.

---

#### C. Rosenzweig–MacArthur Model (Holling Type II Functional Response)
Models predator saturation and handling time $h$:
$$\frac{dx}{dt} = r x \left(1 - \frac{x}{K}\right) - \frac{a x y}{1 + a h x}$$
$$\frac{dy}{dt} = \frac{e a x y}{1 + a h x} - d y$$

**The Paradox of Enrichment & Hopf Bifurcation:**
- For small carrying capacity $K$, the coexistence equilibrium is a **Stable Focus**.
- As enrichment increases carrying capacity $K$ past the critical threshold $K_{\text{crit}} = \frac{e + d h}{a(e - d h)}$, the trace $\tau$ passes through zero to positive values ($\tau > 0$).
- A **Supercritical Hopf Bifurcation** occurs: the steady state loses stability and gives birth to a stable **Limit Cycle**, causing perpetual wild population swings!

---

### 2. Poincaré Trace–Determinant ($\tau$–$\Delta$) Classification

For the linearized system $\dot{\vec{u}} = J \vec{u}$ with characteristic polynomial $\lambda^2 - \tau \lambda + \Delta = 0$ and discriminant $D = \tau^2 - 4\Delta$:

| Determinant ($\Delta$) | Trace ($\tau$) | Discriminant ($D$) | Eigenvalues ($\lambda_{1,2}$) | Stability Classification |
|---|---|---|---|---|
| $\Delta < 0$ | Any | $D > 0$ | Real, opposite signs | **Saddle Point (Unstable Hyperbolic)** |
| $\Delta > 0$ | $\tau < 0$ | $D < 0$ | Complex, $\text{Re} < 0$ | **Stable Spiral / Focus (Sink)** |
| $\Delta > 0$ | $\tau < 0$ | $D > 0$ | Real, distinct, negative | **Stable Node (Sink)** |
| $\Delta > 0$ | $\tau < 0$ | $D = 0$ | Real, repeated, negative | **Stable Degenerate / Star Node** |
| $\Delta > 0$ | $\tau = 0$ | $D < 0$ | Pure imaginary ($\pm i\omega$) | **Center (Neutrally Stable)** |
| $\Delta > 0$ | $\tau > 0$ | $D < 0$ | Complex, $\text{Re} > 0$ | **Unstable Spiral / Focus (Source)** |
| $\Delta > 0$ | $\tau > 0$ | $D > 0$ | Real, distinct, positive | **Unstable Node (Source)** |
| $\Delta = 0$ | Any | $D \ge 0$ | At least one zero | **Line / Non-isolated Equilibria** |

---

## 🚀 How to Run the Website

### Option 1: Direct Browser Launch (Zero Installation)
Simply double-click `index.html` or right-click and open with **Google Chrome**, **Microsoft Edge**, **Firefox**, or **Brave**. All dependencies (Tailwind, KaTeX, Chart.js) load automatically via CDN.

### Option 2: Local HTTP Server (Node.js)
```bash
# In this directory:
node server.js
```
Then visit: `http://localhost:3000`

---

## 🌟 Features Included

1. **Interactive 2D Phase Portrait Canvas**:
   - Vector field arrows color-coded by velocity magnitude $\|\vec{v}\|$.
   - Nullclines: $\dot{x}=0$ (emerald dashed) and $\dot{y}=0$ (amber dashed).
   - Marked equilibrium points with custom stability badges (saddle diamond, bullseye center, focus circles).
   - Eigenvector invariant manifold lines indicating stable/unstable directions.
   - **Click-to-Add Trajectories**: Click anywhere on the phase plane to launch multiple particle tracks!
   - Pan (Shift+Drag) and Zoom (Mouse Wheel) with one-click view reset.

2. **Synchronized Time Series Dynamics**:
   - Real-time RK4 simulation plotting $x(t)$ (prey) and $y(t)$ (predator) vs $t$.
   - Measures phase delay and damping rate.

3. **Poincaré Trace–Determinant ($\tau$–$\Delta$) Interactive Diagram**:
   - Live plot of the bifurcation parabola $\Delta = \frac{\tau^2}{4}$.
   - Animated state dot tracks the system's position across stability boundaries as sliders move.

4. **Argand Complex Plane ($\text{Re}(\lambda)$ vs $\text{Im}(\lambda)$)**:
   - Visualizes eigenvalue spectrum relative to the imaginary axis (Hopf bifurcation boundary).

5. **Formal Step-by-Step LaTeX Derivations**:
   - Full KaTeX rendered mathematical derivations: formulation, Jacobian, characteristic polynomial, discriminant, exact eigenvalues, Hartman–Grobman theorem, and ecological interpretation.

6. **Curated Presets**:
   - *Canadian Lynx & Snowshoe Hare*
   - *Yellowstone Wolves & Elk*
   - *Ladybugs & Aphids (Biocontrol)*
   - *Paradox of Enrichment (Hopf Bifurcation)*
   - *Extinction Tipping Point (Saddle)*
   - *General Linear Systems*

7. **Export & Print**:
   - Export Phase Portrait as high-resolution PNG.
   - Export simulation trajectory as CSV for Excel/MATLAB/Python.
   - One-click Print/PDF formatted lab report.
