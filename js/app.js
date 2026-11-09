/**
 * Predator-Prey Dynamical Systems & Linear Differential Stability Controller
 * Coordinates UI inputs, presets, mathematical engine, phase portrait,
 * bifurcation/Argand diagrams, and time-series Chart.js instance.
 */

class EcosystemApp {
  constructor() {
    this.modelType = 'lotka_volterra';

    // Model parameter sets
    this.params = {
      lotka_volterra: { alpha: 1.0, beta: 0.1, gamma: 1.5, delta: 0.075 },
      logistic: { r: 1.2, K: 35.0, beta: 0.1, gamma: 1.0, delta: 0.05 },
      rosenzweig: { r: 1.5, K: 40.0, a: 0.12, h: 0.1, e: 0.25, d: 0.4 },
      linear: { a: -0.2, b: -1.5, c: 1.2, d: -0.2 }
    };

    // Simulation initial conditions
    this.initialConditions = {
      x0: 15.0,
      y0: 8.0,
      tMax: 60.0,
      dt: 0.04
    };

    this.selectedEquilibriumId = 'coexistence';
    this.additionalTrajectories = [];
    this.timeSeriesChart = null;

    this.presets = {
      classic_lv: {
        name: 'Classic Lotka–Volterra (Neutral Center)',
        model: 'lotka_volterra',
        params: { alpha: 1.0, beta: 0.1, gamma: 1.5, delta: 0.075 },
        ic: { x0: 25.0, y0: 12.0 },
        desc: 'Pure imaginary eigenvalues (λ = ±1.22i). Endless neutrally stable orbits without damping.'
      },
      hare_lynx: {
        name: 'Snowshoe Hare & Canadian Lynx',
        model: 'logistic',
        params: { r: 1.2, K: 40.0, beta: 0.08, gamma: 0.9, delta: 0.045 },
        ic: { x0: 30.0, y0: 10.0 },
        desc: 'Logistic prey carrying capacity creates stable spiral (spiral sink) with damped oscillations.'
      },
      yellowstone: {
        name: 'Yellowstone Wolves & Elk',
        model: 'logistic',
        params: { r: 0.9, K: 50.0, beta: 0.06, gamma: 0.75, delta: 0.03 },
        ic: { x0: 35.0, y0: 8.0 },
        desc: 'Apex predator reintroduction establishing sustainable asymptotic coexistence.'
      },
      aphid_ladybug: {
        name: 'Ladybugs & Aphids (Biocontrol)',
        model: 'logistic',
        params: { r: 1.8, K: 45.0, beta: 0.15, gamma: 1.2, delta: 0.08 },
        ic: { x0: 20.0, y0: 5.0 },
        desc: 'Rapid insect reproduction stabilizing through efficient predator control.'
      },
      hopf_bifurcation: {
        name: 'Paradox of Enrichment (Hopf Bifurcation)',
        model: 'rosenzweig',
        params: { r: 1.5, K: 60.0, a: 0.15, h: 0.12, e: 0.3, d: 0.4 },
        ic: { x0: 15.0, y0: 8.0 },
        desc: 'High carrying capacity triggers a supercritical Hopf bifurcation, destabilizing equilibrium into a stable Limit Cycle!'
      },
      saddle_tipping: {
        name: 'Overpredation / Extinction Tipping Point',
        model: 'logistic',
        params: { r: 0.4, K: 15.0, beta: 0.2, gamma: 1.4, delta: 0.02 },
        ic: { x0: 10.0, y0: 15.0 },
        desc: 'Predator death rate exceeds prey replenishment threshold, driving predator population to extinction.'
      },
      linear_spiral: {
        name: 'Linear System: Damped Stable Spiral',
        model: 'linear',
        params: { a: -0.3, b: -1.8, c: 1.8, d: -0.3 },
        ic: { x0: 8.0, y0: 4.0 },
        desc: 'Tr < 0 and Δ > Tr²/4: Complex conjugate eigenvalues with negative real part.'
      },
      linear_saddle: {
        name: 'Linear System: Unstable Saddle Point',
        model: 'linear',
        params: { a: 1.0, b: 2.0, c: 2.0, d: -1.0 },
        ic: { x0: 5.0, y0: 2.0 },
        desc: 'Det < 0: Real eigenvalues with opposite signs (hyperbolic saddle).'
      }
    };

    this.init();
  }

  init() {
    this.initVisualizers();
    this.initTimeSeriesChart();
    this.bindDOMEvents();
    this.loadPreset('classic_lv');
  }

  initVisualizers() {
    this.phasePortrait = new PhasePortrait('phasePortraitCanvas', {
      onCoordinatesHover: (x, y, dx, dy) => this.handleCanvasHover(x, y, dx, dy),
      onAddTrajectory: (x, y) => this.handleAddTrajectory(x, y)
    });

    this.bifurcationDiagram = new BifurcationDiagram('bifurcationCanvas');
    this.argandPlane = new ArgandPlane('argandCanvas');

    window.addEventListener('resize', () => {
      this.phasePortrait.resize();
      this.bifurcationDiagram.resize();
      this.argandPlane.resize();
    });
  }

  initTimeSeriesChart() {
    const ctx = document.getElementById('timeSeriesCanvas').getContext('2d');
    this.timeSeriesChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Prey Population (x)',
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            pointRadius: 0,
            fill: true,
            tension: 0.25,
            data: []
          },
          {
            label: 'Predator Population (y)',
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderWidth: 2,
            pointRadius: 0,
            fill: true,
            tension: 0.25,
            data: []
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: { color: '#cbd5e1', font: { family: 'Inter', size: 12 } }
          },
          tooltip: {
            backgroundColor: '#0d1322',
            titleColor: '#38bdf8',
            bodyColor: '#e2e8f0',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            callbacks: {
              label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Time (t)', color: '#94a3b8' },
            grid: { color: '#162033' },
            ticks: { color: '#64748b', maxTicksLimit: 10 }
          },
          y: {
            title: { display: true, text: 'Population Density', color: '#94a3b8' },
            grid: { color: '#162033' },
            ticks: { color: '#64748b' }
          }
        }
      }
    });
  }

  bindDOMEvents() {
    // Model Select
    const modelSelect = document.getElementById('modelSelect');
    modelSelect.addEventListener('change', (e) => {
      this.modelType = e.target.value;
      this.additionalTrajectories = [];
      this.updateParamControlsVisibility();
      this.recalculate();
    });

    // Preset Select
    const presetSelect = document.getElementById('presetSelect');
    presetSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        this.loadPreset(e.target.value);
      }
    });

    // Equilibrium Selector
    const eqSelect = document.getElementById('equilibriumSelect');
    eqSelect.addEventListener('change', (e) => {
      this.selectedEquilibriumId = e.target.value;
      this.recalculate(false);
    });

    // Reset View Button
    document.getElementById('resetViewBtn').addEventListener('click', () => {
      this.phasePortrait.resetView();
    });

    // Clear Trajectories Button
    document.getElementById('clearTrajBtn').addEventListener('click', () => {
      this.additionalTrajectories = [];
      this.recalculate(false);
    });

    // Export PNG Button
    document.getElementById('exportPngBtn').addEventListener('click', () => {
      this.exportPhasePortraitPNG();
    });

    // Export CSV Button
    document.getElementById('exportCsvBtn').addEventListener('click', () => {
      this.exportTrajectoryCSV();
    });

    // Print Report Button
    document.getElementById('printReportBtn').addEventListener('click', () => {
      window.print();
    });

    // Sliders & Number inputs
    this.bindSliders();
  }

  bindSliders() {
    // Collect all range inputs
    document.querySelectorAll('.param-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const paramName = e.target.dataset.param;
        const val = parseFloat(e.target.value);
        const container = e.target.closest('div');
        const badge = (container && container.querySelector('.mono-badge')) || document.getElementById(`${paramName}_val`);
        if (badge) badge.textContent = val.toFixed(keyIsTime(paramName) ? 2 : 3);

        const currentParams = this.params[this.modelType];
        if (paramName in currentParams) {
          currentParams[paramName] = val;
        } else if (paramName in this.initialConditions) {
          this.initialConditions[paramName] = val;
        }

        this.recalculate();
      });
    });

    function keyIsTime(k) {
      return k === 'tMax' || k === 'dt' || k === 'x0' || k === 'y0';
    }
  }

  loadPreset(presetKey) {
    const preset = this.presets[presetKey];
    if (!preset) return;

    this.modelType = preset.model;
    document.getElementById('modelSelect').value = preset.model;
    document.getElementById('presetSelect').value = presetKey;

    // Apply params
    this.params[preset.model] = { ...preset.params };
    this.initialConditions.x0 = preset.ic.x0;
    this.initialConditions.y0 = preset.ic.y0;

    // Update preset description
    const descEl = document.getElementById('presetDescription');
    if (descEl) descEl.textContent = preset.desc;

    this.additionalTrajectories = [];
    this.updateParamControlsVisibility();
    this.syncSlidersFromState();
    this.recalculate();
  }

  updateParamControlsVisibility() {
    document.querySelectorAll('.param-group').forEach(group => {
      const models = group.dataset.models.split(' ');
      if (models.includes(this.modelType)) {
        group.classList.remove('hidden');
      } else {
        group.classList.add('hidden');
      }
    });

    // Toggle axis labels in UI if linear
    const isLinear = this.modelType === 'linear';
    document.getElementById('x0_label').textContent = isLinear ? 'Initial x (x₀)' : 'Initial Prey (x₀)';
    document.getElementById('y0_label').textContent = isLinear ? 'Initial y (y₀)' : 'Initial Predator (y₀)';
  }

  syncSlidersFromState() {
    const currentParams = this.params[this.modelType];
    const activeGroups = document.querySelectorAll('.param-group:not(.hidden)');
    activeGroups.forEach(group => {
      group.querySelectorAll('.param-slider').forEach(slider => {
        const p = slider.dataset.param;
        if (p in currentParams) {
          slider.value = currentParams[p];
          const badge = slider.closest('div').querySelector('.mono-badge');
          if (badge) badge.textContent = Number(currentParams[p]).toFixed(3);
        }
      });
    });

    // Initial conditions
    for (const [key, val] of Object.entries(this.initialConditions)) {
      const slider = document.querySelector(`.param-slider[data-param="${key}"]`);
      if (slider) {
        slider.value = val;
        const badge = slider.closest('div').querySelector('.mono-badge') || document.getElementById(`${key}_val`);
        if (badge) badge.textContent = Number(val).toFixed(key === 'tMax' || key === 'dt' ? 2 : 1);
      }
    }
  }

  handleCanvasHover(x, y, dx, dy) {
    const coordEl = document.getElementById('hoverCoords');
    if (coordEl) {
      coordEl.innerHTML = `x: <span class="text-emerald-400 font-mono">${x.toFixed(2)}</span>, y: <span class="text-amber-400 font-mono">${y.toFixed(2)}</span> | dx/dt: <span class="text-cyan-400 font-mono">${dx.toFixed(2)}</span>, dy/dt: <span class="text-violet-400 font-mono">${dy.toFixed(2)}</span>`;
    }
  }

  handleAddTrajectory(x, y) {
    const currentParams = this.params[this.modelType];
    const traj = MathEngine.simulateRK4(
      this.modelType,
      currentParams,
      x,
      y,
      this.initialConditions.tMax,
      this.initialConditions.dt
    );
    this.additionalTrajectories.push(traj);
    this.recalculate(false);
  }

  recalculate(recomputeTrajectories = true) {
    const currentParams = this.params[this.modelType];

    // 1. Find Analytical Equilibria
    const equilibria = MathEngine.findEquilibria(this.modelType, currentParams);

    // Populate Equilibrium Dropdown
    const eqSelect = document.getElementById('equilibriumSelect');
    const prevSelected = this.selectedEquilibriumId;
    eqSelect.innerHTML = '';
    equilibria.forEach(eq => {
      const opt = document.createElement('option');
      opt.value = eq.id;
      opt.textContent = eq.name;
      eqSelect.appendChild(opt);
    });

    let selectedEq = equilibria.find(e => e.id === prevSelected) || equilibria[0];
    if (selectedEq) {
      eqSelect.value = selectedEq.id;
      this.selectedEquilibriumId = selectedEq.id;
    }

    // 2. Jacobian Matrix & Stability Analysis at Selected Equilibrium
    let J = { J11: 0, J12: 0, J21: 0, J22: 0 };
    let analysis = {
      trace: 0, det: 0, discriminant: 0,
      lambda1: { real: 0, imag: 0 }, lambda2: { real: 0, imag: 0 },
      eigenvectors: [], classification: 'Undefined', category: 'neutral',
      description: '', ecologicalMeaning: ''
    };

    if (selectedEq) {
      J = MathEngine.computeJacobian(this.modelType, currentParams, selectedEq.x, selectedEq.y);
      analysis = MathEngine.analyzeStability(J);
    }

    // 3. Trajectory Simulation (RK4)
    let primaryTrajectory = [];
    if (recomputeTrajectories) {
      primaryTrajectory = MathEngine.simulateRK4(
        this.modelType,
        currentParams,
        this.initialConditions.x0,
        this.initialConditions.y0,
        this.initialConditions.tMax,
        this.initialConditions.dt
      );
      this.currentPrimaryTrajectory = primaryTrajectory;
    } else {
      primaryTrajectory = this.currentPrimaryTrajectory || [];
    }

    // Dynamic viewport range estimation
    let xMax = 40, yMax = 30;
    if (this.modelType === 'logistic') {
      xMax = Math.max(currentParams.K * 1.25, 30);
      yMax = Math.max((currentParams.r / currentParams.beta) * 1.25, 25);
    } else if (this.modelType === 'rosenzweig') {
      xMax = Math.max(currentParams.K * 1.25, 35);
      yMax = 35;
    } else if (this.modelType === 'linear') {
      xMax = 20;
      yMax = 20;
    }

    // 4. Nullclines
    const nullclines = MathEngine.computeNullclines(this.modelType, currentParams, xMax, yMax);

    // 5. Update Phase Portrait Canvas
    this.phasePortrait.updateData({
      modelType: this.modelType,
      params: currentParams,
      equilibria,
      nullclines,
      primaryTrajectory,
      additionalTrajectories: this.additionalTrajectories,
      selectedEquilibrium: selectedEq,
      xMax,
      yMax
    });

    // 6. Update Bifurcation Diagram & Argand Plane
    this.bifurcationDiagram.update(analysis.trace, analysis.det, analysis.category);
    this.argandPlane.update(analysis.lambda1, analysis.lambda2);

    // 7. Update Metrics Cards HUD
    this.updateMetricsHUD(J, analysis, selectedEq);

    // 8. Update Time-Series Chart
    this.updateTimeSeriesChart(primaryTrajectory);

    // 9. Update Step-by-Step Mathematical Derivations
    if (selectedEq) {
      this.renderDerivations(currentParams, selectedEq, J, analysis);
    }
  }

  updateMetricsHUD(J, analysis, selectedEq) {
    // Stability Verdict Badge
    const verdictEl = document.getElementById('stabilityVerdict');
    const badgeEl = document.getElementById('statusBadge');

    badgeEl.className = `status-indicator ${analysis.category}`;
    verdictEl.textContent = analysis.classification;

    // Jacobian values
    document.getElementById('j11_val').textContent = J.J11.toFixed(3);
    document.getElementById('j12_val').textContent = J.J12.toFixed(3);
    document.getElementById('j21_val').textContent = J.J21.toFixed(3);
    document.getElementById('j22_val').textContent = J.J22.toFixed(3);

    // Trace, Det, Discriminant
    document.getElementById('traceVal').textContent = analysis.trace.toFixed(4);
    document.getElementById('detVal').textContent = analysis.det.toFixed(4);
    document.getElementById('discVal').textContent = analysis.discriminant.toFixed(4);

    // Eigenvalues
    const formatEigenvalue = (lam) => {
      let str = lam.real.toFixed(3);
      if (Math.abs(lam.imag) > 1e-4) {
        str += (lam.imag >= 0 ? ' +' : ' -') + ` ${Math.abs(lam.imag).toFixed(3)}i`;
      }
      return str;
    };
    document.getElementById('lambda1Val').textContent = formatEigenvalue(analysis.lambda1);
    document.getElementById('lambda2Val').textContent = formatEigenvalue(analysis.lambda2);

    // Ecological Summary text
    document.getElementById('ecologicalSummary').textContent = analysis.ecologicalMeaning;
  }

  updateTimeSeriesChart(trajectory) {
    if (!this.timeSeriesChart) return;

    // Subsample for smooth high-speed chart rendering
    const step = Math.max(1, Math.floor(trajectory.length / 150));
    const labels = [];
    const preyData = [];
    const predatorData = [];

    for (let i = 0; i < trajectory.length; i += step) {
      const pt = trajectory[i];
      labels.push(pt.t.toFixed(1));
      preyData.push(pt.x);
      predatorData.push(pt.y);
    }

    this.timeSeriesChart.data.labels = labels;
    this.timeSeriesChart.data.datasets[0].data = preyData;
    this.timeSeriesChart.data.datasets[1].data = predatorData;
    this.timeSeriesChart.update('none');
  }

  renderDerivations(params, selectedEq, J, analysis) {
    const container = document.getElementById('derivationSteps');
    if (!container) return;

    const steps = MathEngine.generateDerivation(this.modelType, params, selectedEq, J, analysis);
    container.innerHTML = '';

    steps.forEach((step, idx) => {
      const div = document.createElement('div');
      div.className = 'derivation-step';

      let renderedMath = '';
      try {
        renderedMath = katex.renderToString(step.latex, {
          displayMode: true,
          throwOnError: false
        });
      } catch (e) {
        renderedMath = `<pre>${step.latex}</pre>`;
      }

      div.innerHTML = `
        <h4 class="text-sm font-semibold text-cyan-400 mb-1">${step.title}</h4>
        <div class="overflow-x-auto py-2 my-1 text-slate-100 bg-[#090d16]/70 rounded px-3 border border-slate-800">${renderedMath}</div>
        <p class="text-xs text-slate-400 mt-1.5 leading-relaxed">${step.note}</p>
      `;
      container.appendChild(div);
    });
  }

  exportPhasePortraitPNG() {
    const link = document.createElement('a');
    link.download = `predator-prey-phase-portrait-${Date.now()}.png`;
    link.href = this.phasePortrait.canvas.toDataURL('image/png');
    link.click();
  }

  exportTrajectoryCSV() {
    if (!this.currentPrimaryTrajectory || this.currentPrimaryTrajectory.length === 0) return;

    let csv = 'time,prey_x,predator_y\n';
    this.currentPrimaryTrajectory.forEach(pt => {
      csv += `${pt.t.toFixed(4)},${pt.x.toFixed(4)},${pt.y.toFixed(4)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `ecosystem-simulation-${Date.now()}.csv`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new EcosystemApp();
});
