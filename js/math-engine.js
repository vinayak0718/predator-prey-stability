/**
 * Scientific Mathematical Engine for Predator-Prey Dynamical Systems
 * Lotka-Volterra, Logistic Growth, Rosenzweig-MacArthur, and Linear 2x2 Systems
 * Includes Jacobian calculation, Eigenvalue/Eigenvector analysis,
 * Hartman-Grobman stability classification, and Runge-Kutta 4th order (RK4) integration.
 */

class MathEngine {
  /**
   * Evaluates the chosen model at given coordinates (x, y)
   */
  static getDerivatives(modelType, params, x, y) {
    let dx = 0;
    let dy = 0;

    // Guard against negative populations in physical models
    if (modelType !== 'linear') {
      x = Math.max(0, x);
      y = Math.max(0, y);
    }

    switch (modelType) {
      case 'lotka_volterra': {
        const { alpha, beta, gamma, delta } = params;
        dx = alpha * x - beta * x * y;
        dy = delta * x * y - gamma * y;
        break;
      }
      case 'logistic': {
        const { r, K, beta, gamma, delta } = params;
        dx = r * x * (1 - x / K) - beta * x * y;
        dy = delta * x * y - gamma * y;
        break;
      }
      case 'rosenzweig': {
        const { r, K, a, h, e, d } = params;
        const functionalResponse = (a * x) / (1 + a * h * x);
        dx = r * x * (1 - x / K) - functionalResponse * y;
        dy = e * functionalResponse * y - d * y;
        break;
      }
      case 'linear': {
        const { a, b, c, d } = params;
        dx = a * x + b * y;
        dy = c * x + d * y;
        break;
      }
      default:
        throw new Error(`Unknown model: ${modelType}`);
    }

    return { dx, dy };
  }

  /**
   * Computes analytical equilibrium points (steady states) where dx/dt = 0 and dy/dt = 0
   */
  static findEquilibria(modelType, params) {
    const equilibria = [];

    switch (modelType) {
      case 'lotka_volterra': {
        const { alpha, beta, gamma, delta } = params;
        // E0: Trivial extinction (0, 0)
        equilibria.push({
          id: 'extinction',
          name: 'Total Extinction (0, 0)',
          x: 0,
          y: 0,
          type: 'trivial'
        });

        // E1: Coexistence (gamma/delta, alpha/beta)
        if (delta > 0 && beta > 0) {
          const xStar = gamma / delta;
          const yStar = alpha / beta;
          equilibria.push({
            id: 'coexistence',
            name: `Coexistence (${xStar.toFixed(2)}, ${yStar.toFixed(2)})`,
            x: xStar,
            y: yStar,
            type: 'coexistence'
          });
        }
        break;
      }

      case 'logistic': {
        const { r, K, beta, gamma, delta } = params;
        // E0: Extinction
        equilibria.push({
          id: 'extinction',
          name: 'Total Extinction (0, 0)',
          x: 0,
          y: 0,
          type: 'trivial'
        });

        // E1: Prey at Carrying Capacity, Predator Extinct
        equilibria.push({
          id: 'prey_only',
          name: `Prey Alone at Capacity (${K.toFixed(2)}, 0)`,
          x: K,
          y: 0,
          type: 'boundary'
        });

        // E2: Coexistence x* = gamma / delta
        if (delta > 0 && beta > 0) {
          const xStar = gamma / delta;
          const yStar = (r / beta) * (1 - xStar / K);
          if (xStar > 0 && yStar > 0) {
            equilibria.push({
              id: 'coexistence',
              name: `Coexistence (${xStar.toFixed(2)}, ${yStar.toFixed(2)})`,
              x: xStar,
              y: yStar,
              type: 'coexistence'
            });
          }
        }
        break;
      }

      case 'rosenzweig': {
        const { r, K, a, h, e, d } = params;
        // E0: Extinction
        equilibria.push({
          id: 'extinction',
          name: 'Total Extinction (0, 0)',
          x: 0,
          y: 0,
          type: 'trivial'
        });

        // E1: Prey Alone
        equilibria.push({
          id: 'prey_only',
          name: `Prey Alone (${K.toFixed(2)}, 0)`,
          x: K,
          y: 0,
          type: 'boundary'
        });

        // E2: Coexistence
        const denom = a * (e - d * h);
        if (denom > 0) {
          const xStar = d / denom;
          if (xStar < K) {
            const funcResp = (a * xStar) / (1 + a * h * xStar);
            const yStar = (r * (1 - xStar / K)) / (a / (1 + a * h * xStar));
            if (yStar > 0) {
              equilibria.push({
                id: 'coexistence',
                name: `Coexistence (${xStar.toFixed(2)}, ${yStar.toFixed(2)})`,
                x: xStar,
                y: yStar,
                type: 'coexistence'
              });
            }
          }
        }
        break;
      }

      case 'linear': {
        const { a, b, c, d } = params;
        const det = a * d - b * c;
        if (Math.abs(det) > 1e-9) {
          equilibria.push({
            id: 'origin',
            name: 'Origin (0, 0)',
            x: 0,
            y: 0,
            type: 'trivial'
          });
        } else {
          equilibria.push({
            id: 'origin',
            name: 'Origin (0, 0) [Non-isolated]',
            x: 0,
            y: 0,
            type: 'non_isolated'
          });
        }
        break;
      }
    }

    return equilibria;
  }

  /**
   * Evaluates the 2x2 Jacobian Matrix at a specified point (x, y)
   * J = [ [df/dx, df/dy], [dg/dx, dg/dy] ]
   */
  static computeJacobian(modelType, params, x, y) {
    let J11 = 0, J12 = 0, J21 = 0, J22 = 0;

    switch (modelType) {
      case 'lotka_volterra': {
        const { alpha, beta, gamma, delta } = params;
        J11 = alpha - beta * y;
        J12 = -beta * x;
        J21 = delta * y;
        J22 = delta * x - gamma;
        break;
      }
      case 'logistic': {
        const { r, K, beta, gamma, delta } = params;
        J11 = r * (1 - 2 * x / K) - beta * y;
        J12 = -beta * x;
        J21 = delta * y;
        J22 = delta * x - gamma;
        break;
      }
      case 'rosenzweig': {
        const { r, K, a, h, e, d } = params;
        const denom = (1 + a * h * x);
        const denomSq = denom * denom;
        const dfdx_resp = (a * y) / denomSq;
        J11 = r * (1 - 2 * x / K) - dfdx_resp;
        J12 = -(a * x) / denom;
        J21 = (e * a * y) / denomSq;
        J22 = (e * a * x) / denom - d;
        break;
      }
      case 'linear': {
        const { a, b, c, d } = params;
        J11 = a;
        J12 = b;
        J21 = c;
        J22 = d;
        break;
      }
    }

    return { J11, J12, J21, J22 };
  }

  /**
   * Calculates Trace, Determinant, Discriminant, Eigenvalues, Eigenvectors,
   * and Hartman-Grobman stability classification for a given Jacobian matrix.
   */
  static analyzeStability(J) {
    const { J11, J12, J21, J22 } = J;

    const trace = J11 + J22;
    const det = J11 * J22 - J12 * J21;
    const discriminant = trace * trace - 4 * det;

    let lambda1 = { real: 0, imag: 0 };
    let lambda2 = { real: 0, imag: 0 };

    if (discriminant >= 0) {
      const sqrtD = Math.sqrt(discriminant);
      lambda1.real = (trace + sqrtD) / 2;
      lambda2.real = (trace - sqrtD) / 2;
      lambda1.imag = 0;
      lambda2.imag = 0;
    } else {
      const sqrtAbsD = Math.sqrt(-discriminant);
      lambda1.real = trace / 2;
      lambda2.real = trace / 2;
      lambda1.imag = sqrtAbsD / 2;
      lambda2.imag = -sqrtAbsD / 2;
    }

    // Eigenvectors for real eigenvalues
    const eigenvectors = [];
    if (discriminant >= 0) {
      [lambda1.real, lambda2.real].forEach((lam, idx) => {
        let v1 = 0, v2 = 0;
        if (Math.abs(J12) > 1e-9) {
          v1 = 1;
          v2 = -(J11 - lam) / J12;
        } else if (Math.abs(J21) > 1e-9) {
          v2 = 1;
          v1 = -(J22 - lam) / J21;
        } else {
          if (idx === 0) { v1 = 1; v2 = 0; }
          else { v1 = 0; v2 = 1; }
        }
        const len = Math.hypot(v1, v2);
        if (len > 1e-9) {
          eigenvectors.push({ x: v1 / len, y: v2 / len, lambda: lam });
        }
      });
    }

    let classification = '';
    let category = ''; // 'stable', 'unstable', 'neutral', 'saddle'
    let description = '';
    let ecologicalMeaning = '';

    const eps = 1e-5;

    if (Math.abs(det) < eps) {
      classification = 'Line / Plane of Non-Isolated Equilibria';
      category = 'neutral';
      description = 'Zero eigenvalue exists (det = 0). The equilibrium is degenerate and not isolated.';
      ecologicalMeaning = 'Neutral structural drift: Perturbations cause the population to slide continuously along a continuum of equilibria without restoring forces.';
    } else if (det < 0) {
      classification = 'Saddle Point (Unstable)';
      category = 'saddle';
      description = `Real eigenvalues with opposite signs (\\lambda_1 = ${lambda1.real.toFixed(4)}, \\lambda_2 = ${lambda2.real.toFixed(4)}). One stable attracting direction and one unstable repelling manifold.`;
      ecologicalMeaning = 'Ecological tipping point: Unless populations initiate precisely on the stable separatrix manifold, trajectories diverge away, frequently triggering complete predator extinction or uncontrollable prey breakout.';
    } else {
      // det > 0
      if (Math.abs(trace) < eps) {
        classification = 'Center (Neutrally Stable)';
        category = 'neutral';
        description = `Purely imaginary conjugate eigenvalues (\\lambda = \\pm ${Math.abs(lambda1.imag).toFixed(4)} i). Real part is zero.`;
        ecologicalMeaning = 'Perpetual cyclic oscillation: Prey and predator numbers endlessly cycle in closed periodic orbits without damping or exponential blowout. Classic Lotka-Volterra balance.';
      } else if (trace < 0) {
        category = 'stable';
        if (discriminant < -eps) {
          classification = 'Stable Spiral / Focus (Asymptotically Stable)';
          description = `Complex conjugate eigenvalues with negative real part (Re = ${lambda1.real.toFixed(4)}, Im = \\pm ${Math.abs(lambda1.imag).toFixed(4)} i).`;
          ecologicalMeaning = 'Resilient coexistence with damped oscillations: Perturbations trigger boom-and-bust cycles that gradually decay inward, settling cleanly into steady coexistence equilibrium.';
        } else if (Math.abs(discriminant) <= eps) {
          classification = 'Stable Degenerate / Star Node (Asymptotically Stable)';
          description = `Repeated real negative eigenvalue (\\lambda = ${lambda1.real.toFixed(4)}).`;
          ecologicalMeaning = 'Critical ecological damping: Populations smoothly converge to equilibrium at the fastest possible rate without oscillating.';
        } else {
          classification = 'Stable Node (Asymptotically Stable Sink)';
          description = `Distinct real negative eigenvalues (\\lambda_1 = ${lambda1.real.toFixed(4)}, \\lambda_2 = ${lambda2.real.toFixed(4)}).`;
          ecologicalMeaning = 'Monotonic stable coexistence: Populations smoothly glide toward stable equilibrium without cycling or overshooting.';
        }
      } else {
        // trace > 0
        category = 'unstable';
        if (discriminant < -eps) {
          classification = 'Unstable Spiral / Focus (Source)';
          description = `Complex conjugate eigenvalues with positive real part (Re = ${lambda1.real.toFixed(4)}, Im = \\pm ${Math.abs(lambda1.imag).toFixed(4)} i).`;
          ecologicalMeaning = 'Destabilizing boom-bust amplification: Fluctuations expand violently with time. In bounded ecosystems, this triggers limit cycle formation or catastrophic collapse.';
        } else if (Math.abs(discriminant) <= eps) {
          classification = 'Unstable Degenerate Node (Source)';
          description = `Repeated real positive eigenvalue (\\lambda = ${lambda1.real.toFixed(4)}).`;
          ecologicalMeaning = 'Rapid explosive departure: The system exponentially repels away in all directions.';
        } else {
          classification = 'Unstable Node (Source)';
          description = `Distinct real positive eigenvalues (\\lambda_1 = ${lambda1.real.toFixed(4)}, \\lambda_2 = ${lambda2.real.toFixed(4)}).`;
          ecologicalMeaning = 'Explosive divergence: Any small population perturbation causes monotonic departure away from this equilibrium.';
        }
      }
    }

    return {
      trace,
      det,
      discriminant,
      lambda1,
      lambda2,
      eigenvectors,
      classification,
      category,
      description,
      ecologicalMeaning
    };
  }

  /**
   * Runge-Kutta 4th Order (RK4) Numerical Integration
   */
  static simulateRK4(modelType, params, x0, y0, tMax = 50, dt = 0.05) {
    const trajectory = [{ t: 0, x: x0, y: y0 }];
    let x = x0;
    let y = y0;
    const steps = Math.min(Math.floor(tMax / dt), 3000);

    for (let i = 0; i < steps; i++) {
      const t = i * dt;

      const d1 = this.getDerivatives(modelType, params, x, y);

      const x2 = x + 0.5 * dt * d1.dx;
      const y2 = y + 0.5 * dt * d1.dy;
      const d2 = this.getDerivatives(modelType, params, x2, y2);

      const x3 = x + 0.5 * dt * d2.dx;
      const y3 = y + 0.5 * dt * d2.dy;
      const d3 = this.getDerivatives(modelType, params, x3, y3);

      const x4 = x + dt * d3.dx;
      const y4 = y + dt * d3.dy;
      const d4 = this.getDerivatives(modelType, params, x4, y4);

      x += (dt / 6) * (d1.dx + 2 * d2.dx + 2 * d3.dx + d4.dx);
      y += (dt / 6) * (d1.dy + 2 * d2.dy + 2 * d3.dy + d4.dy);

      if (!isFinite(x) || !isFinite(y) || Math.abs(x) > 1e6 || Math.abs(y) > 1e6) {
        break;
      }

      if (modelType !== 'linear') {
        if (x < 0) x = 0;
        if (y < 0) y = 0;
      }

      trajectory.push({ t: t + dt, x, y });
    }

    return trajectory;
  }

  /**
   * Computes nullclines for rendering on phase portrait
   */
  static computeNullclines(modelType, params, xMax, yMax, resolution = 150) {
    const xNullcline = []; // dx/dt = 0
    const yNullcline = []; // dy/dt = 0

    // All biological models have x = 0 as an x-nullcline and y = 0 as a y-nullcline
    switch (modelType) {
      case 'lotka_volterra': {
        const { alpha, beta, gamma, delta } = params;
        // dx/dt = x (alpha - beta * y) = 0 => x = 0 OR y = alpha / beta
        const yVal = alpha / beta;
        xNullcline.push({ x1: 0, y1: yVal, x2: xMax, y2: yVal, label: `y = \\alpha/\\beta = ${yVal.toFixed(2)}` });

        // dy/dt = y (delta * x - gamma) = 0 => y = 0 OR x = gamma / delta
        const xVal = gamma / delta;
        yNullcline.push({ x1: xVal, y1: 0, x2: xVal, y2: yMax, label: `x = \\gamma/\\delta = ${xVal.toFixed(2)}` });
        break;
      }

      case 'logistic': {
        const { r, K, beta, gamma, delta } = params;
        // dx/dt = x [ r(1 - x/K) - beta * y ] = 0 => y = (r/beta)(1 - x/K)
        const pts = [];
        for (let i = 0; i <= resolution; i++) {
          const x = (i / resolution) * Math.min(xMax, K);
          const y = (r / beta) * (1 - x / K);
          if (y >= 0 && y <= yMax) {
            pts.push({ x, y });
          }
        }
        xNullcline.push({ type: 'curve', points: pts, label: `y = \\frac{r}{\\beta}(1 - \\frac{x}{K})` });

        // dy/dt = y (delta * x - gamma) = 0 => x = gamma / delta
        const xVal = gamma / delta;
        yNullcline.push({ x1: xVal, y1: 0, x2: xVal, y2: yMax, label: `x = \\gamma/\\delta = ${xVal.toFixed(2)}` });
        break;
      }

      case 'rosenzweig': {
        const { r, K, a, h, e, d } = params;
        // dx/dt = 0 => y = (r/a)*(1 - x/K)*(1 + a*h*x)
        const pts = [];
        for (let i = 0; i <= resolution; i++) {
          const x = (i / resolution) * Math.min(xMax, K);
          const y = (r / a) * (1 - x / K) * (1 + a * h * x);
          if (y >= 0 && y <= yMax) {
            pts.push({ x, y });
          }
        }
        xNullcline.push({ type: 'curve', points: pts, label: `Prey Nullcline` });

        // dy/dt = 0 => e*a*x / (1 + a*h*x) = d => x = d / (a*(e - d*h))
        const denom = a * (e - d * h);
        if (denom > 0) {
          const xVal = d / denom;
          if (xVal <= xMax) {
            yNullcline.push({ x1: xVal, y1: 0, x2: xVal, y2: yMax, label: `Predator Nullcline: x = ${xVal.toFixed(2)}` });
          }
        }
        break;
      }

      case 'linear': {
        const { a, b, c, d } = params;
        // dx/dt = 0 => a*x + b*y = 0 => y = -a/b * x
        if (Math.abs(b) > 1e-9) {
          const pts = [];
          for (let i = 0; i <= resolution; i++) {
            const x = (i / resolution) * xMax;
            const y = (-a / b) * x;
            if (y >= 0 && y <= yMax) pts.push({ x, y });
          }
          xNullcline.push({ type: 'curve', points: pts, label: `${a}x + ${b}y = 0` });
        }
        // dy/dt = 0 => c*x + d*y = 0 => y = -c/d * x
        if (Math.abs(d) > 1e-9) {
          const pts = [];
          for (let i = 0; i <= resolution; i++) {
            const x = (i / resolution) * xMax;
            const y = (-c / d) * x;
            if (y >= 0 && y <= yMax) pts.push({ x, y });
          }
          yNullcline.push({ type: 'curve', points: pts, label: `${c}x + ${d}y = 0` });
        }
        break;
      }
    }

    return { xNullcline, yNullcline };
  }

  /**
   * Generates step-by-step LaTeX derivation for the given equilibrium
   */
  static generateDerivation(modelType, params, eq, J, analysis) {
    const { J11, J12, J21, J22 } = J;
    const { trace, det, discriminant, lambda1, lambda2, classification, category } = analysis;

    const steps = [];

    // Step 1: System Definition
    let systemLatex = '';
    if (modelType === 'lotka_volterra') {
      systemLatex = `\\begin{cases}
\\frac{dx}{dt} = \\alpha x - \\beta x y = x(${params.alpha} - ${params.beta} y) \\\\[8pt]
\\frac{dy}{dt} = \\delta x y - \\gamma y = y(${params.delta} x - ${params.gamma})
\\end{cases}`;
    } else if (modelType === 'logistic') {
      systemLatex = `\\begin{cases}
\\frac{dx}{dt} = r x \\left(1 - \\frac{x}{K}\\right) - \\beta x y = ${params.r} x \\left(1 - \\frac{x}{${params.K}}\\right) - ${params.beta} x y \\\\[8pt]
\\frac{dy}{dt} = \\delta x y - \\gamma y = y(${params.delta} x - ${params.gamma})
\\end{cases}`;
    } else if (modelType === 'rosenzweig') {
      systemLatex = `\\begin{cases}
\\frac{dx}{dt} = r x \\left(1 - \\frac{x}{K}\\right) - \\frac{a x y}{1 + a h x} = ${params.r} x \\left(1 - \\frac{x}{${params.K}}\\right) - \\frac{${params.a} x y}{1 + ${(params.a * params.h).toFixed(3)} x} \\\\[8pt]
\\frac{dy}{dt} = \\frac{e a x y}{1 + a h x} - d y = y\\left(\\frac{${(params.e * params.a).toFixed(3)} x}{1 + ${(params.a * params.h).toFixed(3)} x} - ${params.d}\\right)
\\end{cases}`;
    } else {
      systemLatex = `\\begin{pmatrix} \\dot{x} \\\\ \\dot{y} \\end{pmatrix} = \\begin{pmatrix} ${params.a} & ${params.b} \\\\ ${params.c} & ${params.d} \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix}`;
    }
    steps.push({
      title: '1. Autonomous Non-Linear System Formulation',
      latex: systemLatex,
      note: 'The system describes the dynamic interaction between prey population $x(t)$ and predator population $y(t)$.'
    });

    // Step 2: Equilibrium Point
    steps.push({
      title: '2. Equilibrium Point Evaluation',
      latex: `\\left(x^*, y^*\\right) = \\left(${eq.x.toFixed(4)}, ${eq.y.toFixed(4)}\\right)`,
      note: 'A steady state where population rates of change instantaneously balance to zero: $f(x^*, y^*) = 0$ and $g(x^*, y^*) = 0$.'
    });

    // Step 3: Jacobian Matrix
    const jMatrixLatex = `J(x^*, y^*) = \\begin{pmatrix} \\frac{\\partial f}{\\partial x} & \\frac{\\partial f}{\\partial y} \\\\[8pt] \\frac{\\partial g}{\\partial x} & \\frac{\\partial g}{\\partial y} \\end{pmatrix}_{(x^*, y^*)} = \\begin{pmatrix} ${J11.toFixed(4)} & ${J12.toFixed(4)} \\\\[8pt] ${J21.toFixed(4)} & ${J22.toFixed(4)} \\end{pmatrix}`;
    steps.push({
      title: '3. Jacobian Linearization Matrix',
      latex: jMatrixLatex,
      note: 'Linearizing via Taylor series expansion around $(x^*, y^*)$ gives the linear differential system $\\frac{d\\vec{u}}{dt} = J(x^*, y^*)\\vec{u}$ for perturbations $\\vec{u} = (x - x^*, y - y^*)^T$.'
    });

    // Step 4: Characteristic Equation
    const trLatex = trace.toFixed(4);
    const detLatex = det.toFixed(4);
    const charPolyLatex = `\\det(J - \\lambda I) = 0 \\implies \\lambda^2 - \\tau \\lambda + \\Delta = 0 \\\\[8pt]
\\lambda^2 - (${trLatex})\\lambda + (${detLatex}) = 0`;
    steps.push({
      title: '4. Characteristic Polynomial Formation',
      latex: charPolyLatex,
      note: `Matrix invariants: Trace $\\tau = \\text{Tr}(J) = J_{11} + J_{22} = ${trLatex}$, Determinant $\\Delta = \\det(J) = J_{11}J_{22} - J_{12}J_{21} = ${detLatex}$.`
    });

    // Step 5: Eigenvalue Spectrum
    const discLatex = discriminant.toFixed(4);
    let eigLatex = '';
    if (discriminant >= 0) {
      eigLatex = `\\Delta_{\\text{disc}} = \\tau^2 - 4\\Delta = (${trLatex})^2 - 4(${detLatex}) = ${discLatex} \\ge 0 \\\\[8pt]
\\lambda_{1, 2} = \\frac{\\tau \\pm \\sqrt{\\tau^2 - 4\\Delta}}{2} = \\frac{${trLatex} \\pm \\sqrt{${discLatex}}}{2} \\\\[8pt]
\\lambda_1 = ${lambda1.real.toFixed(4)}, \\quad \\lambda_2 = ${lambda2.real.toFixed(4)}`;
    } else {
      eigLatex = `\\Delta_{\\text{disc}} = \\tau^2 - 4\\Delta = (${trLatex})^2 - 4(${detLatex}) = ${discLatex} < 0 \\\\[8pt]
\\lambda_{1, 2} = \\frac{${trLatex} \\pm i\\sqrt{${Math.abs(discriminant).toFixed(4)}}}{2} = ${lambda1.real.toFixed(4)} \\pm ${Math.abs(lambda1.imag).toFixed(4)} i`;
    }
    steps.push({
      title: '5. Eigenvalues of the Linearized System',
      latex: eigLatex,
      note: 'The real parts of $\\lambda$ govern exponential growth or decay, while the imaginary parts govern the frequency of ecological oscillations.'
    });

    // Step 6: Hartman-Grobman Stability Verdict
    steps.push({
      title: '6. Hartman–Grobman Stability Verdict & Phase Topology',
      latex: `\\mathbf{\\text{Verdict: } ${classification.replace(/_/g, '\\_')}}`,
      note: `${analysis.description}\n\n**Biological Interpretation:** ${analysis.ecologicalMeaning}`
    });

    return steps;
  }
}

// Make accessible globally
if (typeof window !== 'undefined') {
  window.MathEngine = MathEngine;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MathEngine;
}
