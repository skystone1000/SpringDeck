/* ==========================================================================
   three-bg.js — the optional particle background

   Entirely decorative and entirely self-contained. It bails silently on any
   of four conditions and the page is unaffected in all four:

     - Three.js did not load (the CDN is blocked, or the reader is offline)
     - The reader has asked for reduced motion
     - No WebGL context is available
     - The canvas element is missing

   Nothing else in the application calls into this file, and this file calls
   nothing else. That isolation is the point: a decorative dependency that can
   reach into the rest of the app is no longer optional.
   ========================================================================== */

(function () {
    'use strict';

    function initBackground() {
        var canvas = document.getElementById('bgCanvas');
        if (!canvas) return;

        if (typeof THREE === 'undefined') return;

        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            canvas.style.display = 'none';
            return;
        }

        var renderer;
        try {
            renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        } catch (e) {
            return;                       // No WebGL. Nothing to clean up.
        }

        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1400);
        camera.position.z = 420;

        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(window.innerWidth, window.innerHeight, false);

        /* Particle count scales with viewport area so a phone is not asked to
           draw a desktop's worth of geometry. */
        var count = Math.round(Math.min(360, Math.max(90, (window.innerWidth * window.innerHeight) / 5200)));
        var positions = new Float32Array(count * 3);
        var drift = new Float32Array(count);

        for (var i = 0; i < count; i++) {
            positions[i * 3]     = (Math.random() - 0.5) * 1100;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 700;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 500;
            drift[i] = 0.08 + Math.random() * 0.22;
        }

        var geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        /* The particle colour is read from the token layer rather than written
           here, so this file introduces no colour of its own and follows a
           theme change without knowing what a theme is. */
        function accentColour() {
            var value = getComputedStyle(document.documentElement)
                .getPropertyValue('--accent-500').trim();
            try { return new THREE.Color(value || '#6DB33F'); }
            catch (e) { return new THREE.Color('#6DB33F'); }
        }

        var material = new THREE.PointsMaterial({
            size: 2.4,
            color: accentColour(),
            transparent: true,
            opacity: 0.5,
            sizeAttenuation: true
        });

        var points = new THREE.Points(geometry, material);
        scene.add(points);

        var running = true;
        var frame = 0;

        function animate() {
            if (!running) return;
            requestAnimationFrame(animate);
            frame++;

            var array = geometry.attributes.position.array;
            for (var i = 0; i < count; i++) {
                array[i * 3 + 1] += drift[i];
                if (array[i * 3 + 1] > 350) array[i * 3 + 1] = -350;
            }
            geometry.attributes.position.needsUpdate = true;

            points.rotation.y = Math.sin(frame / 2600) * 0.14;
            renderer.render(scene, camera);
        }
        animate();

        /* Stop entirely when the tab is hidden. A background nobody is looking
           at should not be costing them battery. */
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                running = false;
            } else if (!running) {
                running = true;
                animate();
            }
        });

        var resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight, false);
            }, 150);
        });

        /* Follow the theme. MutationObserver rather than a callback from
           theme.js, so theme.js does not need to know this file exists. */
        new MutationObserver(function () {
            material.color = accentColour();
        }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }

    window.initBackground = initBackground;
})();
