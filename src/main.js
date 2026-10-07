import * as THREE from "three";

import "./style.css";


/* =========================================================
   CENA
========================================================= */

const scene = new THREE.Scene();

const camera = new THREE.Camera();


/* =========================================================
   RENDERER
========================================================= */

const renderer = new THREE.WebGLRenderer({
  antialias: false,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio, 1.8)
);

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

renderer.outputColorSpace =
  THREE.SRGBColorSpace;

document
  .querySelector("#app")
  .appendChild(renderer.domElement);


/* =========================================================
   VERTEX SHADER
========================================================= */

const vertexShader = `

varying vec2 vUv;

void main() {

  vUv = uv;

  gl_Position =
    vec4(position.xy, 0.0, 1.0);

}

`;


/* =========================================================
   FRAGMENT SHADER
========================================================= */

const fragmentShader = `

precision highp float;


uniform vec2 uResolution;

uniform float uTime;

uniform vec2 uMouse;

uniform float uZoom;


varying vec2 vUv;


#define PI 3.14159265359


/* =========================================================
   HASH
========================================================= */

float hash21(vec2 p) {

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


/* =========================================================
   NOISE
========================================================= */

float noise(vec2 p) {

  vec2 i =
    floor(p);

  vec2 f =
    fract(p);


  f =
    f *
    f *
    (3.0 - 2.0 * f);


  float a =
    hash21(i);

  float b =
    hash21(
      i +
      vec2(1.0, 0.0)
    );

  float c =
    hash21(
      i +
      vec2(0.0, 1.0)
    );

  float d =
    hash21(
      i +
      vec2(1.0, 1.0)
    );


  return mix(

    mix(
      a,
      b,
      f.x
    ),

    mix(
      c,
      d,
      f.x
    ),

    f.y

  );

}


/* =========================================================
   FBM
========================================================= */

float fbm(vec2 p) {

  float value = 0.0;

  float amplitude = 0.5;


  for (
    int i = 0;
    i < 5;
    i++
  ) {

    value +=
      amplitude *
      noise(p);

    p *= 2.03;

    amplitude *= 0.5;

  }


  return value;

}


/* =========================================================
   MAIN
========================================================= */

void main() {


  /* -------------------------------------------------------
     COORDENADAS
  ------------------------------------------------------- */

  vec2 uv =
    (
      gl_FragCoord.xy -
      0.5 * uResolution.xy
    )
    /
    uResolution.y;


  /* -------------------------------------------------------
     MOVIMENTO DO MOUSE
  ------------------------------------------------------- */

  vec2 mouseOffset =
    (
      uMouse -
      0.5
    )
    *
    vec2(
      0.55,
      0.35
    );


  uv -=
    mouseOffset *
    0.12;


  /* -------------------------------------------------------
     ZOOM
  ------------------------------------------------------- */

  uv /=
    uZoom;


  /* -------------------------------------------------------
     DISTÂNCIA E ÂNGULO
  ------------------------------------------------------- */

  float r =
    length(uv);

  float angle =
    atan(
      uv.y,
      uv.x
    );


  /* =======================================================
     FUNDO
  ======================================================= */

  vec3 color =
    vec3(
      0.0015,
      0.002,
      0.005
    );


  /* -------------------------------------------------------
     ESTRELAS
  ------------------------------------------------------- */

  vec2 starGrid =
    uv * 18.0;

  vec2 starCell =
    floor(starGrid);

  vec2 starLocal =
    fract(starGrid) -
    0.5;


  float starRandom =
    hash21(starCell);


  vec2 starOffset =
    vec2(

      hash21(
        starCell + 3.1
      ),

      hash21(
        starCell + 8.7
      )

    )
    -
    0.5;


  float starShape =
    smoothstep(

      0.055,

      0.0,

      length(
        starLocal -
        starOffset * 0.7
      )

    );


  float star =
    step(
      0.993,
      starRandom
    )
    *
    starShape;


  color +=

    star *
    vec3(
      0.75,
      0.88,
      1.0
    )
    *
    (
      0.72 +
      0.28 *
      sin(
        uTime * 1.7 +
        starRandom * 30.0
      )
    );


  /* =======================================================
     LENTE GRAVITACIONAL
  ======================================================= */

  float gravitationalGlow =

    exp(
      -pow(
        abs(
          r - 0.205
        )
        /
        0.048,

        2.0
      )
    );


  color +=

    gravitationalGlow *
    vec3(
      1.0,
      0.38,
      0.08
    )
    *
    0.38;


  /* =======================================================
     DISCO DE ACREÇÃO
  ======================================================= */


  float diskShape =

    smoothstep(
      0.145,
      0.095,
      abs(
        r - 0.285
      )
    )

    *

    smoothstep(
      0.54,
      0.32,
      r
    );


  /* -------------------------------------------------------
     ESPIRAL

     IMPORTANTE:

     Na versão anterior, o valor de atan() era usado
     diretamente no ruído.

     atan() possui uma mudança brusca entre -PI e PI.

     Isso criava a faixa horizontal.

     Agora transformamos o ângulo em coordenadas
     circulares com COS e SIN.

     Dessa maneira o padrão fica contínuo.
  ------------------------------------------------------- */

  float spiralPhase =

    angle

    +

    2.35 *
    log(
      max(
        r,
        0.035
      )
    )

    -

    uTime *
    0.23;


  vec2 circularNoiseCoordinates =

    vec2(

      cos(
        spiralPhase
      ),

      sin(
        spiralPhase
      )

    )

    *

    5.5;


  circularNoiseCoordinates +=

    vec2(

      r * 23.0,

      r * 7.0

    );


  circularNoiseCoordinates +=

    vec2(

      uTime * 0.035,

      -uTime * 0.02

    );


  /* -------------------------------------------------------
     TURBULÊNCIA
  ------------------------------------------------------- */

  float turbulence =

    fbm(
      circularNoiseCoordinates
    );


  float filaments =

    pow(
      max(
        turbulence - 0.22,
        0.0
      ),

      1.45
    );


  /* -------------------------------------------------------
     REGIÕES QUENTES
  ------------------------------------------------------- */

  float hotZone =

    exp(

      -pow(

        (
          r - 0.225
        )
        /
        0.078,

        2.0

      )

    );


  float innerHotZone =

    exp(

      -pow(

        (
          r - 0.165
        )
        /
        0.035,

        2.0

      )

    );


  /* -------------------------------------------------------
     COR DO DISCO
  ------------------------------------------------------- */

  vec3 diskColor =

    mix(

      vec3(
        0.95,
        0.035,
        0.004
      ),

      vec3(
        1.0,
        0.72,
        0.18
      ),

      hotZone

    );


  diskColor =

    mix(

      diskColor,

      vec3(
        1.0,
        0.96,
        0.72
      ),

      innerHotZone

    );


  /* -------------------------------------------------------
     APLICA DISCO
  ------------------------------------------------------- */

  color +=

    diskShape *

    filaments *

    diskColor *

    (
      0.72 +
      1.45 *
      hotZone
    );


  /* =======================================================
     PARTE EXTERNA DO DISCO
  ======================================================= */

  float outerDisk =

    smoothstep(
      0.55,
      0.34,
      r
    )

    *

    exp(

      -pow(

        (
          r - 0.39
        )
        /
        0.14,

        2.0

      )

    );


  /* -------------------------------------------------------
     RUÍDO EXTERNO CIRCULAR
  ------------------------------------------------------- */

  float outerAngle =
    angle -
    uTime * 0.16;


  vec2 outerCoordinates =

    vec2(

      cos(
        outerAngle
      ),

      sin(
        outerAngle
      )

    )

    *

    4.0;


  outerCoordinates +=

    vec2(
      r * 12.0,
      uTime * 0.015
    );


  float outerNoise =
    fbm(
      outerCoordinates
    );


  color +=

    outerDisk *

    pow(
      outerNoise,
      2.0
    )

    *

    vec3(
      0.42,
      0.018,
      0.002
    )

    *

    0.85;


  /* =======================================================
     HORIZONTE DE EVENTOS
  ======================================================= */

  float horizon =

    smoothstep(
      0.125,
      0.093,
      r
    );


  color *=
    1.0 -
    horizon;


  /* =======================================================
     ANEL DE FÓTONS
  ======================================================= */

  float photonRing =

    exp(

      -pow(

        (
          r - 0.128
        )
        /
        0.0105,

        2.0

      )

    );


  color +=

    photonRing *

    vec3(
      1.0,
      0.52,
      0.14
    )

    *

    1.25;


  /* -------------------------------------------------------
     BRILHO SECUNDÁRIO
  ------------------------------------------------------- */

  float secondaryRing =

    exp(

      -pow(

        (
          r - 0.153
        )
        /
        0.025,

        2.0

      )

    );


  color +=

    secondaryRing *

    vec3(
      0.55,
      0.16,
      0.025
    )

    *

    0.24;


  /* =======================================================
     VINHETA
  ======================================================= */

  color *=

    1.0 -

    smoothstep(
      0.38,
      0.92,
      r
    )

    *

    0.52;


  /* =======================================================
     TONEMAPPING
  ======================================================= */

  color =

    1.0 -
    exp(
      -color * 1.38
    );


  color =

    pow(
      color,
      vec3(0.92)
    );


  gl_FragColor =
    vec4(
      color,
      1.0
    );

}
`;


/* =========================================================
   MATERIAL
========================================================= */

const material =
  new THREE.ShaderMaterial({

    vertexShader,

    fragmentShader,

    uniforms: {

      uResolution: {

        value:
          new THREE.Vector2(
            window.innerWidth,
            window.innerHeight
          )

      },

      uTime: {

        value: 0

      },

      uMouse: {

        value:
          new THREE.Vector2(
            0.5,
            0.5
          )

      },

      uZoom: {

        value: 1.0

      }

    }

  });


/* =========================================================
   PLANO
========================================================= */

const quad =
  new THREE.Mesh(

    new THREE.PlaneGeometry(
      2,
      2
    ),

    material

  );


scene.add(
  quad
);


/* =========================================================
   INTERAÇÃO
========================================================= */

let targetZoom = 1.0;

let zoom = 1.0;


const targetMouse =
  new THREE.Vector2(
    0.5,
    0.5
  );


let dragging = false;

let lastX = 0;

let lastY = 0;


/* ---------------------------------------------------------
   MOUSE DOWN
--------------------------------------------------------- */

renderer.domElement.addEventListener(
  "pointerdown",
  (event) => {

    dragging = true;

    lastX =
      event.clientX;

    lastY =
      event.clientY;


    renderer.domElement
      .setPointerCapture(
        event.pointerId
      );

  }
);


/* ---------------------------------------------------------
   MOUSE MOVE
--------------------------------------------------------- */

renderer.domElement.addEventListener(
  "pointermove",
  (event) => {

    targetMouse.set(

      event.clientX /
        window.innerWidth,

      1.0 -
        event.clientY /
        window.innerHeight

    );


    if (!dragging) {
      return;
    }


    lastX =
      event.clientX;

    lastY =
      event.clientY;

  }
);


/* ---------------------------------------------------------
   MOUSE UP
--------------------------------------------------------- */

renderer.domElement.addEventListener(
  "pointerup",
  () => {

    dragging = false;

  }
);


renderer.domElement.addEventListener(
  "pointercancel",
  () => {

    dragging = false;

  }
);


/* ---------------------------------------------------------
   ZOOM
--------------------------------------------------------- */

renderer.domElement.addEventListener(

  "wheel",

  (event) => {

    event.preventDefault();


    targetZoom =

      THREE.MathUtils.clamp(

        targetZoom *

        Math.exp(
          -event.deltaY *
          0.0007
        ),

        0.72,

        1.55

      );

  },

  {
    passive: false
  }

);


/* =========================================================
   RESIZE
========================================================= */

window.addEventListener(
  "resize",
  () => {

    renderer.setSize(

      window.innerWidth,
      window.innerHeight

    );


    material
      .uniforms
      .uResolution
      .value
      .set(

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

  const elapsed =
    clock.getElapsedTime();


  material
    .uniforms
    .uTime
    .value =
    elapsed;


  material
    .uniforms
    .uMouse
    .value
    .lerp(
      targetMouse,
      0.035
    );


  zoom =
    THREE.MathUtils.lerp(
      zoom,
      targetZoom,
      0.055
    );


  material
    .uniforms
    .uZoom
    .value =
    zoom;


  renderer.render(
    scene,
    camera
  );


  requestAnimationFrame(
    animate
  );

}


animate();


/* =========================================================
   TELA DE CARREGAMENTO
========================================================= */

setTimeout(
  () => {

    const loading =
      document.querySelector(
        "#loading"
      );


    if (!loading) {
      return;
    }


    loading.style.opacity =
      "0";


    setTimeout(
      () => {

        loading.remove();

      },

      750
    );

  },

  650
);
