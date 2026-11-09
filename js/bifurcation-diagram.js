/**
 * Visualizers for Poincaré Trace-Determinant Diagram (tau-Delta plane)
 * and Complex Eigenvalue Spectrum (Argand Plane).
 */

class BifurcationDiagram {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.traceRange = 4.0;
    this.detRange = 4.0;

    this.currentTrace = 0;
    this.currentDet = 0;
    this.currentCategory = 'neutral';

    this.initCanvas();
  }

  initCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width || 320;
    this.height = rect.height || 180;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize() {
    this.initCanvas();
    this.render();
  }

  update(trace, det, category) {
    this.currentTrace = trace;
    this.currentDet = det;
    this.currentCategory = category;

    // Dynamically expand range if point goes out of default viewport
    const maxVal = Math.max(Math.abs(trace), Math.abs(det), 2.5);
    this.traceRange = maxVal * 1.35;
    this.detRange = maxVal * 1.35;

    this.render();
  }

  toScreen(tau, delta) {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const sx = cx + (tau / this.traceRange) * (this.width / 2 - 20);
    const sy = cy - (delta / this.detRange) * (this.height / 2 - 20);
    return { x: sx, y: sy };
  }

  render() {
    if (!this.canvas) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const cx = this.width / 2;
    const cy = this.height / 2;

    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, this.width, this.height);

    // Shading Stability Regions
    this.drawRegions();

    // Parabola Delta = tau^2 / 4
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const steps = 100;
    let started = false;
    for (let i = 0; i <= steps; i++) {
      const tau = -this.traceRange + (i / steps) * (2 * this.traceRange);
      const delta = (tau * tau) / 4;
      if (delta <= this.detRange * 1.5) {
        const pt = this.toScreen(tau, delta);
        if (!started) {
          ctx.moveTo(pt.x, pt.y);
          started = true;
        } else {
          ctx.lineTo(pt.x, pt.y);
        }
      }
    }
    ctx.stroke();
    ctx.restore();

    // Axes
    ctx.save();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;

    // tau-axis (horizontal)
    ctx.beginPath();
    ctx.moveTo(10, cy);
    ctx.lineTo(this.width - 10, cy);
    ctx.stroke();

    // Delta-axis (vertical)
    ctx.beginPath();
    ctx.moveTo(cx, 10);
    ctx.lineTo(cx, this.height - 10);
    ctx.stroke();

    // Axis Labels
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.fillText('Trace (τ)', this.width - 12, cy - 6);
    ctx.textAlign = 'left';
    ctx.fillText('Det (Δ)', cx + 6, 16);

    // Parabola label
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('Δ = τ²/4', this.width - 55, 30);

    // Region Micro-Labels
    ctx.font = '9px Inter, sans-serif';
    ctx.fillStyle = 'rgba(16, 185, 129, 0.7)';
    ctx.fillText('Stable Spiral', 20, 40);
    ctx.fillText('Stable Node', 20, cy - 14);

    ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
    ctx.fillText('Unstable Spiral', this.width - 80, 40);
    ctx.fillText('Unstable Node', this.width - 76, cy - 14);

    ctx.fillStyle = 'rgba(249, 115, 22, 0.7)';
    ctx.fillText('Saddle Points (Δ < 0)', cx - 50, this.height - 18);

    ctx.restore();

    // Draw Current State Point
    const pt = this.toScreen(this.currentTrace, this.currentDet);
    ctx.save();
    let pointColor = '#38bdf8';
    if (this.currentCategory === 'stable') pointColor = '#10b981';
    else if (this.currentCategory === 'unstable') pointColor = '#ef4444';
    else if (this.currentCategory === 'saddle') pointColor = '#f97316';
    else if (this.currentCategory === 'neutral') pointColor = '#06b6d4';

    ctx.shadowColor = pointColor;
    ctx.shadowBlur = 14;
    ctx.fillStyle = pointColor;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Coordinates tooltip badge
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    const badgeText = `τ=${this.currentTrace.toFixed(2)}, Δ=${this.currentDet.toFixed(2)}`;
    ctx.fillText(badgeText, Math.min(pt.x + 10, this.width - 95), Math.max(pt.y - 10, 22));

    ctx.restore();
  }

  drawRegions() {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Saddle region: bottom half (Delta < 0)
    ctx.fillStyle = 'rgba(234, 88, 12, 0.07)';
    ctx.fillRect(0, cy, this.width, this.height - cy);

    // Left top: Stable zone (tau < 0, Delta > 0)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.fillRect(0, 0, cx, cy);

    // Right top: Unstable zone (tau > 0, Delta > 0)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
    ctx.fillRect(cx, 0, cx, cy);
  }
}

class ArgandPlane {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.range = 3.0;
    this.lambda1 = { real: 0, imag: 0 };
    this.lambda2 = { real: 0, imag: 0 };

    this.initCanvas();
  }

  initCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width || 320;
    this.height = rect.height || 180;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize() {
    this.initCanvas();
    this.render();
  }

  update(lambda1, lambda2) {
    this.lambda1 = lambda1;
    this.lambda2 = lambda2;

    const maxVal = Math.max(
      Math.abs(lambda1.real),
      Math.abs(lambda1.imag),
      Math.abs(lambda2.real),
      Math.abs(lambda2.imag),
      1.5
    );
    this.range = maxVal * 1.35;

    this.render();
  }

  toScreen(real, imag) {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const sx = cx + (real / this.range) * (this.width / 2 - 20);
    const sy = cy - (imag / this.range) * (this.height / 2 - 20);
    return { x: sx, y: sy };
  }

  render() {
    if (!this.canvas) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const cx = this.width / 2;
    const cy = this.height / 2;

    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, this.width, this.height);

    // Left Half Plane: Stable (Re < 0)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.fillRect(0, 0, cx, this.height);

    // Right Half Plane: Unstable (Re > 0)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
    ctx.fillRect(cx, 0, cx, this.height);

    // Axes
    ctx.save();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;

    // Real axis
    ctx.beginPath();
    ctx.moveTo(10, cy);
    ctx.lineTo(this.width - 10, cy);
    ctx.stroke();

    // Imaginary axis (Bifurcation boundary!)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, 10);
    ctx.lineTo(cx, this.height - 10);
    ctx.stroke();

    // Axis Labels
    ctx.setLineDash([]);
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.fillText('Re(λ)', this.width - 12, cy - 6);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('Im(λ) [Hopf Boundary]', cx + 6, 16);

    ctx.font = '9px Inter, sans-serif';
    ctx.fillStyle = 'rgba(16, 185, 129, 0.7)';
    ctx.fillText('Stable LHP (Re < 0)', 14, this.height - 14);

    ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
    ctx.fillText('Unstable RHP (Re > 0)', this.width - 110, this.height - 14);

    ctx.restore();

    // Plot lambda1 and lambda2
    const drawEigenvalue = (lam, label, color) => {
      const pt = this.toScreen(lam.real, lam.imag);
      ctx.save();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;

      ctx.beginPath();
      // Draw cross marker
      ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      let text = `${label}: ${lam.real.toFixed(2)}`;
      if (Math.abs(lam.imag) > 1e-4) {
        text += (lam.imag >= 0 ? ' +' : ' -') + ` ${Math.abs(lam.imag).toFixed(2)}i`;
      }
      ctx.fillText(text, Math.min(pt.x + 8, this.width - 110), pt.y - 8);

      ctx.restore();
    };

    drawEigenvalue(this.lambda1, 'λ₁', '#10b981');
    drawEigenvalue(this.lambda2, 'λ₂', '#f59e0b');
  }
}

if (typeof window !== 'undefined') {
  window.BifurcationDiagram = BifurcationDiagram;
  window.ArgandPlane = ArgandPlane;
}
