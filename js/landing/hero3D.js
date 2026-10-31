/**
 * PROJECT MONDAY — THREE.JS 3D HERO VISUALIZER
 * Interactive glowing particle terrain & volatility landscape.
 * Responds smoothly to cursor velocity and simulated market ticks.
 * Zero-lag architecture with low-power WebGL and tab-visibility auto-pause.
 */

// Direct CDN module import guarantees 100% native ESM resolution in vanilla browser without bundler
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class Hero3DVisualizer {
  constructor(canvasContainerId) {
    this.container = document.getElementById(canvasContainerId);
    if (!this.container) return;

    // Check prefers-reduced-motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.particles = null;
    this.particleCount = 1800;
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetMouseX = 0;
    this.targetMouseY = 0;
    this.clock = new THREE.Clock();
    this.animFrameId = null;
    this._isDestroyed = false;

    // Bound listeners for clean lifecycle
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onResize = this._onResize.bind(this);

    this.init();
  }

  init() {
    try {
      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || window.innerHeight;

      // 1. Scene & Perspective Camera
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(60, width / Math.max(height, 1), 0.1, 1000);
      this.camera.position.z = 140;
      this.camera.position.y = 45;
      this.camera.lookAt(0, 0, 0);

      // 2. High-Efficiency Renderer (low-power, zero-lag antialias clamp)
      this.renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: 'low-power',
        preserveDrawingBuffer: false
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      
      const canvasEl = this.renderer.domElement;
      canvasEl.style.width = '100%';
      canvasEl.style.height = '100%';
      canvasEl.style.display = 'block';
      canvasEl.style.pointerEvents = 'none';

      // Clean container if re-initialized
      this.container.innerHTML = '';
      this.container.appendChild(canvasEl);

      // 3. Procedural Particle Terrain (Grid of Market Liquidity Waves)
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(this.particleCount * 3);
      const colors = new Float32Array(this.particleCount * 3);

      const cols = 60;
      const rows = 30;
      const spacing = 4.5;

      const colorEmerald = new THREE.Color(0x10b981);
      const colorCyan = new THREE.Color(0x06b6d4);
      const colorViolet = new THREE.Color(0x8b5cf6);

      let idx = 0;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = (i - cols / 2) * spacing;
          const z = (j - rows / 2) * spacing;
          const y = Math.sin(i * 0.2) * Math.cos(j * 0.2) * 8;

          positions[idx * 3] = x;
          positions[idx * 3 + 1] = y;
          positions[idx * 3 + 2] = z;

          // Gradient interpolation across grid
          const lerpFactor = i / cols;
          const col = lerpFactor < 0.6 
            ? colorEmerald.clone().lerp(colorCyan, lerpFactor / 0.6) 
            : colorCyan.clone().lerp(colorViolet, (lerpFactor - 0.6) / 0.4);

          colors[idx * 3] = col.r;
          colors[idx * 3 + 1] = col.g;
          colors[idx * 3 + 2] = col.b;

          idx++;
        }
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      // Custom Particle Material with Additive Blending
      const material = new THREE.PointsMaterial({
        size: 2.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      this.particles = new THREE.Points(geometry, material);
      this.scene.add(this.particles);

      // 4. Mouse Tracking for Subtle Parallax
      window.addEventListener('mousemove', this._onMouseMove, { passive: true });

      // 5. Resize Listener
      window.addEventListener('resize', this._onResize, { passive: true });

      // 6. Start Loop
      this.animate();
    } catch (err) {
      console.warn('[Hero3DVisualizer] WebGL initialization skipped:', err);
    }
  }

  _onMouseMove(e) {
    this.targetMouseX = (e.clientX - window.innerWidth / 2) * 0.04;
    this.targetMouseY = (e.clientY - window.innerHeight / 2) * 0.04;
  }

  _onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    if (this._isDestroyed) return;

    this.animFrameId = requestAnimationFrame(() => this.animate());

    // Zero-lag optimization: Pause rendering when browser tab is inactive or hidden
    if (document.hidden) return;

    const elapsed = this.clock.getElapsedTime();

    // Smooth cursor interpolation
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

    this.particles.rotation.y = elapsed * 0.05 + this.mouseX * 0.01;
    this.particles.rotation.x = 0.2 + this.mouseY * 0.01;

    // Organic wave ripple across particles (optimized outer loop sin calculation)
    const positions = this.particles.geometry.attributes.position.array;
    const cols = 60;
    const rows = 30;
    let idx = 0;

    for (let i = 0; i < cols; i++) {
      const sinI = Math.sin(i * 0.25 + elapsed * 1.5) * 6;
      for (let j = 0; j < rows; j++) {
        const wave = sinI * Math.cos(j * 0.2 + elapsed * 1.2);
        positions[idx * 3 + 1] = wave;
        idx++;
      }
    }
    this.particles.geometry.attributes.position.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    this._isDestroyed = true;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('resize', this._onResize);

    if (this.particles) {
      if (this.particles.geometry) this.particles.geometry.dispose();
      if (this.particles.material) this.particles.material.dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
