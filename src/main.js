import * as THREE from "three";
import "./style.css";

/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const canvas = document.querySelector("#space");

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio, 2)
);

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

renderer.outputColorSpace = THREE.SRGBColorSpace;

/* =========================================================
   GRUPO PRINCIPAL
========================================================= */

const universe = new THREE.Group();

scene.add(universe);

/* =========================================================
   FUNDO
========================================================= */

scene.background = new THREE.Color(0x000000);

/* =========================================================
   ESTRELAS
========================================================= */

const starCount = 1800;

const starPositions = new Float32Array(
  starCount * 3
);

const starSizes = new Float32Array(
  starCount
);

for (let i = 0; i < starCount; i++) {

  const radius =
    THREE.MathUtils.randFloat(8, 35);

  const theta =
    Math.random() * Math.PI * 2;

  const phi =
    Math.acos(
      THREE.MathUtils.randFloatSpread(2)
    );

  const x =
    radius *
    Math.sin(phi) *
    Math.cos(theta);

  const y =
    radius *
    Math.cos(phi);

  const z =
    radius *
    Math.sin(phi) *
    Math.sin(theta);

  starPositions[i * 3] = x;
  starPositions[i * 3 + 1] = y;
  starPositions[i * 3 + 2] = z;

  starSizes[i] =
    THREE.MathUtils.randFloat(0.4, 2.2);
}

const starsGeometry =
  new THREE.BufferGeometry();

starsGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(
    starPositions,
    3
  )
);

starsGeometry.setAttribute(
  "size",
  new THREE.BufferAttribute(
    starSizes,
    1
  )
);

const starsMaterial =
  new THREE.ShaderMaterial({

    transparent: true,

    depthWrite: false,

    vertexShader: `

      attribute float size;

      void main() {

        vec4 mvPosition =
          modelViewMatrix *
          vec4(position, 1.0);

        gl_PointSize =
          size *
          (180.0 / -mvPosition.z);

        gl_Position =
          projectionMatrix *
          mvPosition;

      }

    `,

    fragmentShader: `

      void main() {

        float distanceToCenter =
          distance(
            gl_PointCoord,
            vec2(0.5)
          );

        float alpha =
          1.0 -
          smoothstep(
            0.0,
            0.5,
            distanceToCenter
          );

        gl_FragColor =
          vec4(
            0.8,
            0.88,
            1.0,
            alpha
          );

      }

    `
  });

const stars =
  new THREE.Points(
    starsGeometry,
    starsMaterial
  );

universe.add(stars);

/* =========================================================
   SHADER DO BURACO NEGRO
========================================================= */

const blackHoleGeometry =
  new THREE.PlaneGeometry(
    2,
    2
  );

const blackHoleMaterial =
  new THREE.ShaderMaterial({

    uniforms: {

      uTime: {
        value: 0
      },

      uMouse: {
        value: new THREE.Vector2(0, 0)
      },

      uZoom: {
        value: 1
      },

      uExplore: {
        value: 0
      }

    },

    vertexShader: `

      varying vec2 vUv;

      void main() {

        vUv = uv;

        gl_Position =
          vec4(
            position,
            1.0
          );

      }

    `,

    fragmentShader: `

      precision highp float;

      uniform float uTime;

      uniform vec2 uMouse;

      uniform float uZoom;

      uniform float uExplore;

      varying vec2 vUv;

      #define PI 3.14159265359

      /* =====================================================
         FUNÇÕES DE RUÍDO
      ===================================================== */

      float hash(vec2 p) {

        p =
          fract(
            p *
            vec2(
              123.34,
              456.21
            )
          );

        p +=
          dot(
            p,
            p + 45.32
          );

        return fract(
          p.x * p.y
        );

      }

      float noise(vec2 p) {

        vec2 i =
          floor(p);

        vec2 f =
          fract(p);

        f =
          f * f *
          (3.0 - 2.0 * f);

        return mix(

          mix(
            hash(i),
            hash(i + vec2(1.0, 0.0)),
            f.x
          ),

          mix(
            hash(i + vec2(0.0, 1.0)),
            hash(i + vec2(1.0, 1.0)),
            f.x
          ),

          f.y
        );

      }

      float fbm(vec2 p) {

        float value = 0.0;

        float amplitude = 0.5;

        for (
          int i = 0;
          i < 5;
          i++
        ) {

          value +=
            noise(p) *
            amplitude;

          p *= 2.0;

          amplitude *= 0.5;

        }

        return value;

      }

      /* =====================================================
         PALETA
      ===================================================== */

      vec3 palette(
        float value
      ) {

        vec3 dark =
          vec3(
            0.12,
            0.005,
            0.001
          );

        vec3 red =
          vec3(
            0.65,
            0.035,
            0.005
          );

        vec3 orange =
          vec3(
            1.0,
            0.25,
            0.015
          );

        vec3 gold =
          vec3(
            1.0,
            0.65,
            0.10
          );

        vec3 white =
          vec3(
            1.0,
            0.91,
            0.66
          );

        vec3 color =
          mix(
            dark,
            red,
            smoothstep(
              0.0,
              0.35,
              value
            )
          );

        color =
          mix(
            color,
            orange,
            smoothstep(
              0.28,
              0.65,
              value
            )
          );

        color =
          mix(
            color,
            gold,
            smoothstep(
              0.55,
              0.82,
              value
            )
          );

        color =
          mix(
            color,
            white,
            smoothstep(
              0.78,
              1.0,
              value
            )
          );

        return color;

      }

      /* =====================================================
         SHADER PRINCIPAL
      ===================================================== */

      void main() {

        vec2 uv =
          vUv * 2.0 -
          1.0;

        /*
          Mantém a proporção visual da tela.
        */

        uv.x *= 1.777;

        /*
          Pequena influência do mouse.
        */

        vec2 mouse =
          uMouse *
          0.15;

        uv += mouse;

        /*
          Velocidade do disco.
        */

        float time =
          uTime *
          (
            0.075 +
            uExplore * 0.13
          );

        /*
          DISTORÇÃO GRAVITACIONAL
        */

        float radius =
          length(uv);

        float safeRadius =
          max(
            radius,
            0.001
          );

        float gravitationalPull =
          (
            0.16 +
            uExplore * 0.055
          ) /
          max(
            radius,
            0.16
          );

        vec2 direction =
          uv /
          safeRadius;

        vec2 warped =
          uv;

        warped +=
          direction *
          gravitationalPull *
          (
            0.16 +
            uExplore * 0.10
          );

        float warpedRadius =
          length(warped);

        float warpedAngle =
          atan(
            warped.y,
            warped.x
          );

        /*
          ====================================================
          DISCO DE ACREÇÃO
          ====================================================
        */

        float diskRadius =
          warpedRadius;

        /*
          Máscara externa do disco.
        */

        float outerDisk =
          smoothstep(
            1.08,
            0.68,
            diskRadius
          );

        /*
          Máscara interna.

          O ponto importante aqui é que o disco NÃO recebe
          iluminação diretamente no centro do buraco negro.
          Isso evita a criação da faixa horizontal.
        */

        float innerDisk =
          smoothstep(
            0.25,
            0.40,
            diskRadius
          );

        float diskMask =
          outerDisk *
          innerDisk;

        /*
          ESPIRAL
        */

        float spiral =
          warpedAngle +
          time +
          diskRadius *
          (
            8.0 +
            uExplore * 3.0
          );

        vec2 spiralUv =
          vec2(
            cos(spiral),
            sin(spiral)
          ) *
          diskRadius;

        /*
          TURBULÊNCIA
        */

        float turbulence =
          fbm(
            warped * 4.0 +
            spiralUv * 2.0 +
            time
          );

        /*
          CAMADAS DO DISCO
        */

        float layers =
          0.5 +
          0.5 *
          sin(
            spiral *
            (
              8.0 +
              uExplore * 2.0
            ) +
            turbulence * 8.0
          );

        layers =
          pow(
            layers,
            2.2
          );

        float disk =
          diskMask *
          (
            turbulence * 0.55 +
            layers * 0.45
          );

        /*
          Suavização adicional no centro.

          Esta região impede que o shader crie uma linha
          iluminada atravessando o horizonte.
        */

        float centerFade =
          smoothstep(
            0.34,
            0.48,
            diskRadius
          );

        disk *=
          centerFade;

        /*
          ====================================================
          ANEL DE LUZ
          ====================================================
        */

        float ringRadius =
          0.38 -
          uExplore * 0.025;

        float ringDistance =
          abs(
            warpedRadius -
            ringRadius
          );

        float ring =
          1.0 -
          smoothstep(
            0.07,
            0.16,
            ringDistance
          );

        ring *=
          smoothstep(
            0.0,
            0.32,
            warpedRadius
          );

        /*
          O anel desaparece suavemente antes de entrar
          completamente no horizonte.
        */

        ring *=
          smoothstep(
            0.28,
            0.39,
            warpedRadius
          );

        /*
          ====================================================
          ANEL INTERNO
          ====================================================
        */

        float innerRingRadius =
          0.43 -
          uExplore * 0.03;

        float innerRing =
          1.0 -
          smoothstep(
            0.035,
            0.085,
            abs(
              warpedRadius -
              innerRingRadius
            )
          );

        /*
          Suavização para impedir uma linha atravessando
          o centro.
        */

        innerRing *=
          smoothstep(
            0.31,
            0.40,
            warpedRadius
          );

        /*
          ====================================================
          HORIZONTE DE EVENTOS
          ====================================================
        */

        float horizonRadius =
          0.33 -
          uExplore * 0.025;

        float eventHorizon =
          1.0 -
          smoothstep(
            horizonRadius,
            horizonRadius + 0.055,
            warpedRadius
          );

        /*
          ====================================================
          CORES
          ====================================================
        */

        vec3 diskColor =
          palette(
            clamp(
              disk +
              turbulence * 0.15,
              0.0,
              1.0
            )
          );

        diskColor *=
          diskMask *
          (
            2.0 +
            uExplore * 0.45
          );

        vec3 ringColor =
          vec3(
            1.0,
            0.55,
            0.08
          ) *
          ring *
          (
            3.0 +
            uExplore * 0.8
          );

        vec3 innerColor =
          vec3(
            1.0,
            0.72,
            0.25
          ) *
          innerRing *
          (
            2.5 +
            uExplore * 0.6
          );

        vec3 color =
          diskColor +
          ringColor +
          innerColor;

        /*
          ====================================================
          BRILHO EXTERNO
          ====================================================
        */

        float glow =
          exp(
            -abs(
              warpedRadius -
              0.5
            ) *
            (
              9.0 -
              uExplore * 2.0
            )
          );

        /*
          Também evitamos que o glow invada o centro.
        */

        float glowMask =
          smoothstep(
            0.28,
            0.48,
            warpedRadius
          );

        color +=
          vec3(
            0.65,
            0.08,
            0.01
          ) *
          glow *
          glowMask *
          (
            0.25 +
            uExplore * 0.15
          );

        /*
          ====================================================
          CENTRO ABSOLUTAMENTE ESCURO
          ====================================================
        */

        color =
          mix(
            color,
            vec3(0.0),
            eventHorizon
          );

        /*
          Pequena proteção adicional contra qualquer
          iluminação residual no centro.
        */

        float centerBlack =
          1.0 -
          smoothstep(
            0.0,
            horizonRadius + 0.015,
            warpedRadius
          );

        color =
          mix(
            color,
            vec3(0.0),
            centerBlack
          );

        /*
          ====================================================
          BORDA
          ====================================================
        */

        float edge =
          smoothstep(
            1.25,
            0.65,
            radius
          );

        color *=
          edge;

        /*
          ====================================================
          EXPOSIÇÃO
          ====================================================
        */

        color =
          1.0 -
          exp(
            -color *
            (
              1.25 +
              uExplore * 0.18
            )
          );

        gl_FragColor =
          vec4(
            color,
            1.0
          );

      }

    `
  });

const blackHole =
  new THREE.Mesh(
    blackHoleGeometry,
    blackHoleMaterial
  );

blackHole.position.z = 0;

universe.add(blackHole);

/* =========================================================
   INTERAÇÃO
========================================================= */

let targetRotationX = 0;
let targetRotationY = 0;

let currentRotationX = 0;
let currentRotationY = 0;

let targetZoom = 1;
let currentZoom = 1;

let targetExplore = 0;
let currentExplore = 0;

let explored = false;

let dragging = false;

let previousMouseX = 0;
let previousMouseY = 0;

const mouse =
  new THREE.Vector2();

/* =========================================================
   ELEMENTOS DA INTERFACE
========================================================= */

const exploreButton =
  document.querySelector(
    "#exploreButton"
  );

const buttonLabel =
  exploreButton.querySelector(
    ".button-label"
  );

const buttonArrow =
  exploreButton.querySelector(
    ".arrow"
  );

const explorePanel =
  document.querySelector(
    "#explorePanel"
  );

/* =========================================================
   MODO EXPLORAÇÃO
========================================================= */

function setExploreMode(
  active
) {

  explored = active;

  targetExplore =
    active ? 1 : 0;

  targetZoom =
    active ? 1.48 : 1;

  targetRotationX =
    active ? -0.04 : 0;

  targetRotationY =
    active
      ? targetRotationY + 0.5
      : 0;

  exploreButton.setAttribute(
    "aria-expanded",
    String(active)
  );

  if (active) {

    buttonLabel.textContent =
      "VOLTAR";

    buttonArrow.textContent =
      "↙";

    explorePanel.classList.add(
      "visible"
    );

    explorePanel.setAttribute(
      "aria-hidden",
      "false"
    );

    document.body.classList.add(
      "exploring"
    );

  } else {

    buttonLabel.textContent =
      "EXPLORAR";

    buttonArrow.textContent =
      "↗";

    explorePanel.classList.remove(
      "visible"
    );

    explorePanel.setAttribute(
      "aria-hidden",
      "true"
    );

    document.body.classList.remove(
      "exploring"
    );

  }

}

/* =========================================================
   MOUSE
========================================================= */

window.addEventListener(
  "pointerdown",
  (event) => {

    if (
      event.target.closest(
        "button"
      ) ||
      event.target.closest(
        ".explore-panel"
      )
    ) {
      return;
    }

    dragging = true;

    previousMouseX =
      event.clientX;

    previousMouseY =
      event.clientY;

  }
);

window.addEventListener(
  "pointermove",
  (event) => {

    const normalizedX =
      event.clientX /
      window.innerWidth *
      2 -
      1;

    const normalizedY =
      event.clientY /
      window.innerHeight *
      2 -
      1;

    mouse.x = normalizedX;
    mouse.y = -normalizedY;

    blackHoleMaterial.uniforms.uMouse.value.lerp(
      mouse,
      0.08
    );

    if (!dragging) {
      return;
    }

    const deltaX =
      event.clientX -
      previousMouseX;

    const deltaY =
      event.clientY -
      previousMouseY;

    targetRotationY +=
      deltaX *
      0.001;

    targetRotationX +=
      deltaY *
      0.001;

    targetRotationX =
      THREE.MathUtils.clamp(
        targetRotationX,
        -0.45,
        0.45
      );

    previousMouseX =
      event.clientX;

    previousMouseY =
      event.clientY;

  }
);

window.addEventListener(
  "pointerup",
  () => {

    dragging = false;

  }
);

/* =========================================================
   TOUCH
========================================================= */

window.addEventListener(
  "touchstart",
  (event) => {

    if (
      event.touches.length !== 1
    ) {
      return;
    }

    dragging = true;

    previousMouseX =
      event.touches[0].clientX;

    previousMouseY =
      event.touches[0].clientY;

  },
  {
    passive: true
  }
);

window.addEventListener(
  "touchmove",
  (event) => {

    if (
      event.touches.length !== 1
    ) {
      return;
    }

    const touch =
      event.touches[0];

    const deltaX =
      touch.clientX -
      previousMouseX;

    const deltaY =
      touch.clientY -
      previousMouseY;

    targetRotationY +=
      deltaX *
      0.001;

    targetRotationX +=
      deltaY *
      0.001;

    targetRotationX =
      THREE.MathUtils.clamp(
        targetRotationX,
        -0.45,
        0.45
      );

    previousMouseX =
      touch.clientX;

    previousMouseY =
      touch.clientY;

  },
  {
    passive: true
  }
);

window.addEventListener(
  "touchend",
  () => {

    dragging = false;

  },
  {
    passive: true
  }
);

/* =========================================================
   SCROLL / ZOOM
========================================================= */

window.addEventListener(
  "wheel",
  (event) => {

    event.preventDefault();

    targetZoom +=
      event.deltaY *
      0.0007;

    const minimumZoom =
      explored ? 1.15 : 0.75;

    const maximumZoom =
      explored ? 1.65 : 1.35;

    targetZoom =
      THREE.MathUtils.clamp(
        targetZoom,
        minimumZoom,
        maximumZoom
      );

  },
  {
    passive: false
  }
);

/* =========================================================
   BOTÃO EXPLORAR
========================================================= */

exploreButton.addEventListener(
  "click",
  () => {

    setExploreMode(
      !explored
    );

    exploreButton.classList.add(
      "active"
    );

    setTimeout(() => {

      exploreButton.classList.remove(
        "active"
      );

    }, 500);

  }
);

/* =========================================================
   ESC PARA VOLTAR
========================================================= */

window.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key === "Escape" &&
      explored
    ) {

      setExploreMode(
        false
      );

    }

  }
);

/* =========================================================
   RESIZE
========================================================= */

window.addEventListener(
  "resize",
  () => {

    camera.aspect =
      window.innerWidth /
      window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        2
      )
    );

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );

  }
);

/* =========================================================
   ANIMAÇÃO
========================================================= */

const clock =
  new THREE.Clock();

function animate() {

  requestAnimationFrame(
    animate
  );

  const elapsed =
    clock.getElapsedTime();

  /*
    SUAVIZA O MODO EXPLORAÇÃO
  */

  currentExplore +=
    (
      targetExplore -
      currentExplore
    ) *
    0.035;

  blackHoleMaterial.uniforms.uTime.value =
    elapsed;

  blackHoleMaterial.uniforms.uZoom.value =
    currentZoom;

  blackHoleMaterial.uniforms.uExplore.value =
    currentExplore;

  /*
    SUAVIZA MOVIMENTO
  */

  currentRotationX +=
    (
      targetRotationX -
      currentRotationX
    ) *
    0.045;

  currentRotationY +=
    (
      targetRotationY -
      currentRotationY
    ) *
    0.045;

  currentZoom +=
    (
      targetZoom -
      currentZoom
    ) *
    0.045;

  /*
    MOVIMENTO DO UNIVERSO
  */

  universe.rotation.x =
    currentRotationX;

  universe.rotation.y =
    currentRotationY;

  /*
    MOVIMENTO DE PROFUNDIDADE
  */

  universe.position.z =
    Math.sin(
      elapsed *
      (
        0.12 +
        currentExplore * 0.12
      )
    ) *
    0.015;

  universe.scale.set(
    currentZoom,
    currentZoom,
    currentZoom
  );

  /*
    MOVIMENTO AUTOMÁTICO
  */

  if (!dragging) {

    targetRotationY +=
      (
        0.00012 +
        currentExplore * 0.00018
      );

  }

  renderer.render(
    scene,
    camera
  );
}

animate();

/* =========================================================
   LOADER
========================================================= */

window.addEventListener(
  "load",
  () => {

    setTimeout(() => {

      const loader =
        document.querySelector(
          "#loader"
        );

      if (loader) {

        loader.classList.add(
          "hidden"
        );

      }

    }, 900);

  }
);
