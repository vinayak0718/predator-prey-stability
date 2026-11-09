/**
 * Interactive 2D Phase Portrait & Vector Field Canvas Renderer
 * Supports dynamic grid vector arrows, nullclines, equilibrium markers,
 * eigenvector direction manifolds, click-to-add RK4 trajectories,
 * animated particle stream heads, and smooth pan/zoom.
 */

class PhasePortrait {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    this.options = Object.assign({
      xMax: 40,
      yMax: 30,
      xMin: 0,
      yMin: 0,
      gridResolution: 22,
      onCoordinatesHover: null,
      onAddTrajectory: null
    }, options);

    this.xMin = this.options.xMin;
    this.xMax = this.options.xMax;
    this.yMin = this.options.yMin;
    this.yMax = this.options.yMax;

    this.modelType = 'lotka_volterra';
    this.params = {};
    this.equilibria = [];
    this.selectedEquilibrium = null;
    this.nullclines = { xNullcline: [], yNullcline: [] };
    this.trajectories = []; // Array of trajectory arrays
    this.primaryTrajectory = [];

    // Animation state
    this.animStep = 0;
    this.animId = null;

    // View interaction (pan/zoom)
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.defaultBounds = { xMin: this.xMin, xMax: this.xMax, yMin: this.yMin, yMax: this.yMax };

    this.initCanvas();
    this.bindEvents();
    this.startAnimation();
  }

  initCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width || 600;
    this.height = rect.height || 440;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize() {
    this.initCanvas();
    this.render();
  }

  bindEvents() {
    // Canvas Hover
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (this.isPanning) {
        const dx = (mouseX - this.panStart.x) * (this.xMax - this.xMin) / this.width;
        const dy = -(mouseY - this.panStart.y) * (this.yMax - this.yMin) / this.height;
        this.xMin -= dx;
        this.xMax -= dx;
        this.yMin -= dy;
        this.yMax -= dy;
        this.panStart = { x: mouseX, y: mouseY };
        this.render();
        return;
      }

      const worldPos = this.screenToWorld(mouseX, mouseY);
      if (this.options.onCoordinatesHover) {
        const derivatives = MathEngine.getDerivatives(this.modelType, this.params, worldPos.x, worldPos.y);
        this.options.onCoordinatesHover(worldPos.x, worldPos.y, derivatives.dx, derivatives.dy);
      }
    });

    // Pan Start
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 1 || e.shiftKey) { // Middle click or Shift+click to pan
        this.isPanning = true;
        const rect = this.canvas.getBoundingClientRect();
        this.panStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        e.preventDefault();
      }
    });

    window.addEventListener('mouseup', () => {
      this.isPanning = false;
    });

    // Click to add trajectory or select initial point
    this.canvas.addEventListener('click', (e) => {
      if (e.shiftKey) return;
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldPos = this.screenToWorld(mouseX, mouseY);

      // Only allow positive populations for biological models
      if (this.modelType !== 'linear') {
        if (worldPos.x < 0 || worldPos.y < 0) return;
      }

      if (this.options.onAddTrajectory) {
        this.options.onAddTrajectory(worldPos.x, worldPos.y);
      }
    });

    // Zoom on wheel
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldPos = this.screenToWorld(mouseX, mouseY);

      const zoomFactor = e.deltaY < 0 ? 0.9 : 1.1;
      const newWidth = (this.xMax - this.xMin) * zoomFactor;
      const newHeight = (this.yMax - this.yMin) * zoomFactor;

      const fracX = (worldPos.x - this.xMin) / (this.xMax - this.xMin);
      const fracY = (worldPos.y - this.yMin) / (this.yMax - this.yMin);

      this.xMin = worldPos.x - fracX * newWidth;
      this.xMax = worldPos.x + (1 - fracX) * newWidth;
      this.yMin = worldPos.y - fracY * newHeight;
      this.yMax = worldPos.y + (1 - fracY) * newHeight;

      this.render();
    }, { passive: false });
  }

  resetView() {
    this.xMin = this.defaultBounds.xMin;
    this.xMax = this.defaultBounds.xMax;
    this.yMin = this.defaultBounds.yMin;
    this.yMax = this.defaultBounds.yMax;
    this.render();
  }

  worldToScreen(x, y) {
    const padding = { left: 48, right: 20, top: 20, bottom: 44 };
    const plotW = this.width - padding.left - padding.right;
    const plotH = this.height - padding.top - padding.bottom;

    const sx = padding.left + ((x - this.xMin) / (this.xMax - this.xMin)) * plotW;
    const sy = this.height - padding.bottom - ((y - this.yMin) / (this.yMax - this.yMin)) * plotH;
    return { x: sx, y: sy };
  }

  screenToWorld(sx, sy) {
    const padding = { left: 48, right: 20, top: 20, bottom: 44 };
    const plotW = this.width - padding.left - padding.right;
    const plotH = this.height - padding.top - padding.bottom;

    const x = this.xMin + ((sx - padding.left) / plotW) * (this.xMax - this.xMin);
    const y = this.yMin + ((this.height - padding.bottom - sy) / plotH) * (this.yMax - this.yMin);
    return { x, y };
  }

  updateData({ modelType, params, equilibria, nullclines, primaryTrajectory, additionalTrajectories, selectedEquilibrium, xMax, yMax }) {
    this.modelType = modelType;
    this.params = params;
    this.equilibria = equilibria || [];
    this.selectedEquilibrium = selectedEquilibrium;
    this.nullclines = nullclines || { xNullcline: [], yNullcline: [] };
    this.primaryTrajectory = primaryTrajectory || [];
    this.trajectories = additionalTrajectories || [];

    if (xMax !== undefined && yMax !== undefined) {
      this.xMax = xMax;
      this.yMax = yMax;
      this.defaultBounds = { xMin: this.xMin, xMax: this.xMax, yMin: this.yMin, yMax: this.yMax };
    }

    this.render();
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const padding = { left: 48, right: 20, top: 20, bottom: 44 };
    const plotW = this.width - padding.left - padding.right;
    const plotH = this.height - padding.top - padding.bottom;

    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, this.width, this.height);

    // Plot Area Background
    ctx.fillStyle = '#0d1322';
    ctx.fillRect(padding.left, padding.top, plotW, plotH);

    // Grid Lines & Ticks
    this.drawGrid(padding, plotW, plotH);

    // Vector Field
    this.drawVectorField(padding, plotW, plotH);

    // Nullclines
    this.drawNullclines();

    // Invariant Manifolds / Eigenvector directions for coexistence equilibrium
    this.drawEigenvectors();

    // Additional Trajectories
    this.drawTrajectories();

    // Primary Trajectory
    this.drawPrimaryTrajectory();

    // Equilibrium Points
    this.drawEquilibria();

    // Plot Border
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding.left, padding.top, plotW, plotH);
  }

  drawGrid(padding, plotW, plotH) {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#162033';
    ctx.lineWidth = 1;

    // Vertical ticks
    const numTicksX = 8;
    for (let i = 0; i <= numTicksX; i++) {
      const val = this.xMin + (i / numTicksX) * (this.xMax - this.xMin);
      const pos = this.worldToScreen(val, 0);

      // Grid line
      ctx.beginPath();
      ctx.moveTo(pos.x, padding.top);
      ctx.lineTo(pos.x, this.height - padding.bottom);
      ctx.stroke();

      // Tick label
      ctx.textAlign = 'center';
      ctx.fillText(val.toFixed(val >= 10 ? 0 : 1), pos.x, this.height - padding.bottom + 16);
    }

    // Horizontal ticks
    const numTicksY = 6;
    for (let j = 0; j <= numTicksY; j++) {
      const val = this.yMin + (j / numTicksY) * (this.yMax - this.yMin);
      const pos = this.worldToScreen(0, val);

      // Grid line
      ctx.beginPath();
      ctx.moveTo(padding.left, pos.y);
      ctx.lineTo(this.width - padding.right, pos.y);
      ctx.stroke();

      // Tick label
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(val >= 10 ? 0 : 1), padding.left - 8, pos.y + 4);
    }

    // Axis Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    const xLabel = this.modelType === 'linear' ? 'x' : 'Prey Population (x)';
    const yLabel = this.modelType === 'linear' ? 'y' : 'Predator Population (y)';
    ctx.fillText(xLabel, padding.left + plotW / 2, this.height - 10);

    ctx.save();
    ctx.translate(14, padding.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    ctx.restore();
  }

  drawVectorField(padding, plotW, plotH) {
    const ctx = this.ctx;
    const res = this.options.gridResolution;

    const xStep = (this.xMax - this.xMin) / res;
    const yStep = (this.yMax - this.yMin) / res;

    // Collect magnitudes to normalize color mapping
    let maxSpeed = 0;
    const vectors = [];

    for (let i = 0; i <= res; i++) {
      for (let j = 0; j <= res; j++) {
        const x = this.xMin + (i + 0.5) * xStep;
        const y = this.yMin + (j + 0.5) * yStep;

        if (this.modelType !== 'linear' && (x < 0 || y < 0)) continue;

        const { dx, dy } = MathEngine.getDerivatives(this.modelType, this.params, x, y);
        const speed = Math.hypot(dx, dy);
        if (speed > maxSpeed) maxSpeed = speed;

        vectors.push({ x, y, dx, dy, speed });
      }
    }

    const arrowLength = Math.min(plotW, plotH) / (res * 1.55);

    vectors.forEach(v => {
      const screenPos = this.worldToScreen(v.x, v.y);
      if (screenPos.x < padding.left || screenPos.x > this.width - padding.right ||
          screenPos.y < padding.top || screenPos.y > this.height - padding.bottom) {
        return;
      }

      if (v.speed < 1e-9) return;

      const angle = Math.atan2(-v.dy, v.dx); // Screen Y is inverted
      const normSpeed = Math.min(v.speed / (maxSpeed * 0.4 || 1), 1);

      // Color mapping from deep slate-blue to cyan-emerald
      const r = Math.floor(30 + normSpeed * 40);
      const g = Math.floor(70 + normSpeed * 150);
      const b = Math.floor(140 + normSpeed * 115);
      const alpha = 0.35 + normSpeed * 0.45;

      ctx.save();
      ctx.translate(screenPos.x, screenPos.y);
      ctx.rotate(angle);

      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.lineWidth = 1.2;

      // Shaft
      ctx.beginPath();
      ctx.moveTo(-arrowLength * 0.45, 0);
      ctx.lineTo(arrowLength * 0.45, 0);
      ctx.stroke();

      // Arrowhead
      const headSize = Math.max(3, arrowLength * 0.3);
      ctx.beginPath();
      ctx.moveTo(arrowLength * 0.45, 0);
      ctx.lineTo(arrowLength * 0.45 - headSize, -headSize * 0.55);
      ctx.lineTo(arrowLength * 0.45 - headSize, headSize * 0.55);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    });
  }

  drawNullclines() {
    const ctx = this.ctx;
    ctx.save();

    // X-Nullcline (dx/dt = 0) in Glowing Emerald
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);

    this.nullclines.xNullcline.forEach(item => {
      if (item.type === 'curve') {
        if (!item.points || item.points.length === 0) return;
        ctx.beginPath();
        const start = this.worldToScreen(item.points[0].x, item.points[0].y);
        ctx.moveTo(start.x, start.y);
        for (let k = 1; k < item.points.length; k++) {
          const pt = this.worldToScreen(item.points[k].x, item.points[k].y);
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      } else {
        const p1 = this.worldToScreen(item.x1, item.y1);
        const p2 = this.worldToScreen(item.x2, item.y2);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    });

    // Y-Nullcline (dy/dt = 0) in Glowing Amber
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);

    this.nullclines.yNullcline.forEach(item => {
      if (item.type === 'curve') {
        if (!item.points || item.points.length === 0) return;
        ctx.beginPath();
        const start = this.worldToScreen(item.points[0].x, item.points[0].y);
        ctx.moveTo(start.x, start.y);
        for (let k = 1; k < item.points.length; k++) {
          const pt = this.worldToScreen(item.points[k].x, item.points[k].y);
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      } else {
        const p1 = this.worldToScreen(item.x1, item.y1);
        const p2 = this.worldToScreen(item.x2, item.y2);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    });

    ctx.restore();
  }

  drawEigenvectors() {
    if (!this.selectedEquilibrium) return;
    const J = MathEngine.computeJacobian(this.modelType, this.params, this.selectedEquilibrium.x, this.selectedEquilibrium.y);
    const analysis = MathEngine.analyzeStability(J);

    if (analysis.eigenvectors && analysis.eigenvectors.length > 0) {
      const ctx = this.ctx;
      ctx.save();
      const origin = this.worldToScreen(this.selectedEquilibrium.x, this.selectedEquilibrium.y);

      analysis.eigenvectors.forEach((ev, idx) => {
        const isStable = ev.lambda < 0;
        ctx.strokeStyle = isStable ? '#38bdf8' : '#f43f5e';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 3]);

        const length = 120;
        const dx = ev.x * length;
        const dy = -ev.y * length; // screen y flipped

        ctx.beginPath();
        ctx.moveTo(origin.x - dx, origin.y - dy);
        ctx.lineTo(origin.x + dx, origin.y + dy);
        ctx.stroke();

        // Direction arrow indicating flow
        const arrowDir = isStable ? -1 : 1;
        const arrowX = origin.x + dx * 0.7 * arrowDir;
        const arrowY = origin.y + dy * 0.7 * arrowDir;
        const angle = Math.atan2(dy * arrowDir, dx * arrowDir);

        ctx.save();
        ctx.translate(arrowX, arrowY);
        ctx.rotate(angle);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-7, -4);
        ctx.lineTo(-7, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      ctx.restore();
    }
  }

  drawTrajectories() {
    const ctx = this.ctx;
    this.trajectories.forEach((traj, idx) => {
      if (!traj || traj.length < 2) return;
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();

      const start = this.worldToScreen(traj[0].x, traj[0].y);
      ctx.moveTo(start.x, start.y);
      for (let k = 1; k < traj.length; k++) {
        const pt = this.worldToScreen(traj[k].x, traj[k].y);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();

      // Initial point marker
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(start.x, start.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  drawPrimaryTrajectory() {
    if (!this.primaryTrajectory || this.primaryTrajectory.length < 2) return;
    const ctx = this.ctx;
    ctx.save();

    // Gradient path for dynamic aesthetic
    const len = this.primaryTrajectory.length;
    for (let i = 0; i < len - 1; i += 2) {
      const p1 = this.worldToScreen(this.primaryTrajectory[i].x, this.primaryTrajectory[i].y);
      const nextIdx = Math.min(i + 2, len - 1);
      const p2 = this.worldToScreen(this.primaryTrajectory[nextIdx].x, this.primaryTrajectory[nextIdx].y);

      const progress = i / len;
      // Fade from cyan (start) to vibrant violet/magenta (end)
      ctx.strokeStyle = `hsl(${185 + progress * 80}, 92%, ${55 + progress * 10}%)`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Initial condition marker (x0, y0)
    const startPt = this.worldToScreen(this.primaryTrajectory[0].x, this.primaryTrajectory[0].y);
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(startPt.x, startPt.y, 5, 0, Math.PI * 2);
    ctx.fill();

    // Pulse head / particle tracer
    if (len > 5) {
      const currentIdx = Math.floor((this.animStep % 180) / 180 * (len - 1));
      const tracePt = this.worldToScreen(this.primaryTrajectory[currentIdx].x, this.primaryTrajectory[currentIdx].y);
      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(tracePt.x, tracePt.y, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawEquilibria() {
    const ctx = this.ctx;
    ctx.save();

    this.equilibria.forEach(eq => {
      const pos = this.worldToScreen(eq.x, eq.y);
      const isSelected = this.selectedEquilibrium && this.selectedEquilibrium.id === eq.id;

      const J = MathEngine.computeJacobian(this.modelType, this.params, eq.x, eq.y);
      const analysis = MathEngine.analyzeStability(J);

      let color = '#38bdf8';
      if (analysis.category === 'stable') color = '#10b981';
      else if (analysis.category === 'unstable') color = '#ef4444';
      else if (analysis.category === 'saddle') color = '#f97316';
      else if (analysis.category === 'neutral') color = '#06b6d4';

      ctx.save();
      ctx.translate(pos.x, pos.y);

      // Selected ring
      if (isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;

      if (analysis.category === 'saddle') {
        // Diamond
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(7, 0);
        ctx.lineTo(0, 7);
        ctx.lineTo(-7, 0);
        ctx.closePath();
        ctx.fill();
      } else if (analysis.category === 'neutral') {
        // Target / Bullseye
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Circle
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Label
      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.shadowBlur = 0;
      ctx.fillText(`(${eq.x.toFixed(1)}, ${eq.y.toFixed(1)})`, 9, -5);

      ctx.restore();
    });

    ctx.restore();
  }

  startAnimation() {
    const loop = () => {
      this.animStep++;
      // Render animated particle pulse every other frame
      if (this.animStep % 2 === 0 && this.primaryTrajectory.length > 5) {
        this.render();
      }
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  stopAnimation() {
    if (this.animId) cancelAnimationFrame(this.animId);
  }
}

// Make accessible globally
if (typeof window !== 'undefined') {
  window.PhasePortrait = PhasePortrait;
}
