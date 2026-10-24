import * as THREE from "three";
import {
  instance,
  material,
  mesh,
  rng,
  disposeObject,
} from "../core/procedural.js";
import { foliageGeometry } from "./foliage.js";
import { surface, rockGeometry } from "./materials.js";
import { bankHeight, terrainStrip } from "./terrain.js";
import { sampleCurrent } from "../../../../shared/game/water.js";
import { createCanal } from "./canal.js";
import { waveGLSL } from "./waves.js";

function ribbon(track, inner, outer, height, segments) {
  const positions = [],
    uvs = [],
    indices = [],
    flow = [];
  for (let i = 0; i <= segments; i++) {
    for (const lateral of [inner, outer]) {
      const distance = -35 + (i / segments) * (track.length + 135);
      const p = track.frame(distance, lateral).position;
      positions.push(p.x, height, p.z);
      uvs.push(lateral === inner ? 0 : 1, i / segments);
      flow.push(sampleCurrent(track, distance).strength);
    }
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("flow", new THREE.Float32BufferAttribute(flow, 1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createEnvironment(track, quality) {
  const root = new THREE.Group(),
    random = rng(track.seed),
    palette = track.palette;
  const half = track.width / 2;
  const landMaterial = surface("grass", palette.grass),
    soilMaterial = surface(track.kind === "canal" ? "masonry" : "soil", track.kind === "canal" ? "#a9a58c" : palette.soil);
  landMaterial.side = soilMaterial.side = THREE.DoubleSide;
  landMaterial.vertexColors = soilMaterial.vertexColors = true;
  for (const side of [-1, 1]) {
    root.add(
      mesh(terrainStrip(track, side, -0.6, track.bank.slope), soilMaterial),
    );
    root.add(
      mesh(
        terrainStrip(track, side, track.bank.slope, 65, 180, 14),
        landMaterial,
      ),
    );
  }
  if (track.kind === "canal") root.add(createCanal(track));
  // Terrain receives shadows but must not self-shadow huge coplanar ribbons.
  root.children.forEach((o) => {
    o.castShadow = false;
  });
  const waterMaterial = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(palette.water) },
      uDeep: { value: new THREE.Color(palette.deep) },
      uSky: { value: new THREE.Color(palette.sky) },
      uSun: { value: new THREE.Vector3(-0.5, 0.8, -0.3).normalize() },
      uLight: { value: 1 },
    },
    vertexShader: `uniform float uTime; attribute float flow; varying float vFlow; varying vec3 vWorld; varying vec2 vUv;
      void main(){vUv=uv;vFlow=flow;vec3 p=position;p.y += ${waveGLSL};p.y+=flow*.11*sin(uv.y*700.-uTime*7.);vWorld=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `uniform float uTime;uniform vec3 uColor,uDeep,uSky,uSun;uniform float uLight;varying vec3 vWorld;varying vec2 vUv;varying float vFlow;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
      void main(){
      vec2 q=vec2(vUv.x*24.,vUv.y*300.-uTime*(.1+vFlow*2.));
      float detail=noise(q*2.)*.65+noise(q*7.)*.25+noise(q*19.)*.1;
      vec3 n=normalize(vec3(.045*sin(q.x*3.+detail*5.),1.,.06*cos(q.y*3.)+vFlow*.16*sin(q.y*9.)));
      vec3 viewDir=normalize(cameraPosition-vWorld);float fresnel=pow(1.-max(dot(n,viewDir),0.),4.);
      float shine=pow(max(dot(reflect(-uSun,n),viewDir),0.),90.);
      vec3 color=mix(uDeep,uColor,.45+detail*.55);color=mix(color,uSky,fresnel*.22);color+=vec3(.65,.56,.36)*shine*.18;
      float streak=sin(q.y*6.+noise(q*.5)*6.);float foam=smoothstep(.7,.96,detail)*smoothstep(.05,.8,streak)*vFlow;
      float edge=pow(abs(vUv.x*2.-1.),28.)*smoothstep(.35,.65,detail);
      color=mix(color,vec3(.82,.79,.66),max(foam*.5,edge*.36));
      float fog=1.-exp(-.00010*pow(length(cameraPosition-vWorld),2.));gl_FragColor=vec4(mix(color*uLight,uSky,fog),1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  });
  const water = mesh(
    ribbon(track, -half, half, 0, quality.waterSegments),
    waterMaterial,
  );
  water.castShadow = false;
  root.add(water);

  const bambooTrunks = [],
    bambooNodes = [],
    bambooLeaves = [],
    palmTrunks = [],
    palmLeaves = [],
    coconuts = [],
    grasses = [],
    stones = [],
    hills = [];
  for (let i = 0; i < quality.flora; i++) {
    const side = i % 2 ? -1 : 1,
      distance = 2 + random() * (track.length + 65);
    const lateral = side * (half + 3 + random() * 19),
      base = track.frame(distance, lateral).position;
    const ground = bankHeight(track, distance, lateral);
    const height = 4.5 + random() * 4;
    if (random() < track.flora.bamboo) {
      for (let c = 0; c < 3; c++) {
        const x = base.x + (random() - 0.5) * 1.5,
          z = base.z + (random() - 0.5) * 1.5,
          h = height * (0.75 + random() * 0.3);
        bambooTrunks.push({ p: [x, h / 2 + ground, z], s: [0.11, h, 0.11] });
        for (let j = 1; j < 6; j++)
          bambooNodes.push({
            p: [x, (h * j) / 6 + ground, z],
            s: [0.13, 0.055, 0.13],
          });
        for (let j = 0; j < 3; j++)
          bambooLeaves.push({
            p: [x + (random() - 0.5), ground + h * (0.65 + j * 0.15), z],
            s: [1.5 + random(), 0.6, 1.2],
            r: [0, random() * 6.28, 0.15],
          });
      }
    } else {
      palmTrunks.push({
        p: [base.x, height / 2 + ground, base.z],
        s: [0.3, height, 0.3],
        r: [0, 0, 0.09 * side],
      });
      const topX = base.x - height * 0.09 * side;
      for (let j = 0; j < 7; j++)
        palmLeaves.push({
          p: [topX, height + ground, base.z],
          r: [0, (j * Math.PI * 2) / 7, 0],
          s: [1 + random() * 0.25, 1, 1 + random() * 0.3],
        });
      for (let j = 0; j < 3; j++)
        coconuts.push({
          p: [
            topX + Math.cos(j * 2) * 0.4,
            height + ground,
            base.z + Math.sin(j * 2) * 0.4,
          ],
          s: [0.28, 0.35, 0.28],
        });
    }
    for (let j = 0; j < 5; j++) {
      const grassLateral = side * (half + (track.kind === "canal" ? 4.5 : 1) + random() * 3);
      const p = track.frame(distance + j * 0.4, grassLateral).position;
      grasses.push({
        p: [p.x, bankHeight(track, distance + j * 0.4, grassLateral), p.z],
        s: [0.8, 0.5 + random() * 0.6, 0.8],
        r: [random() * 0.4, random() * 6, random() * 0.5],
      });
    }
    if (i % 3 === 0)
      stones.push({
        p: [base.x + 2, ground, base.z],
        s: [1 + random(), 0.45 + random() * 0.4, 1 + random()],
      });
    if (i % 8 === 0 && track.kind !== "canal") {
      const p = track.frame(distance, side * (half + 50)).position;
      hills.push({ p: [p.x, 4, p.z], s: [18, 13 + random() * 15, 23] });
    }
  }
  const cylinder = new THREE.CylinderGeometry(0.8, 1, 1, 12);
  const leafGeometry = new THREE.BufferGeometry();
  leafGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        0, 0, 0, -0.6, 0.4, -1.5, 0, 0.6, -2, 0, 0, 0, 0, 0.6, -2, 0.6, 0.4,
        -1.5, -0.6, 0.4, -1.5, 0, -0.5, -4, 0, 0.6, -2, 0, 0.6, -2, 0, -0.5, -4,
        0.6, 0.4, -1.5,
      ],
      3,
    ),
  );
  leafGeometry.computeVertexNormals();
  const bambooLeaf = foliageGeometry();
  const leafMaterial = surface("grass", palette.leaf);
  leafMaterial.side = THREE.DoubleSide;
  root.add(
    instance(cylinder, surface("bark", palette.bamboo), bambooTrunks),
    instance(cylinder, material("#a4b576"), bambooNodes),
    instance(bambooLeaf, leafMaterial, bambooLeaves),
  );
  root.add(
    instance(cylinder, surface("bark", "#9b8060"), palmTrunks),
    instance(
      leafGeometry,
      material(palette.leaf, { side: THREE.DoubleSide }),
      palmLeaves,
    ),
    instance(new THREE.IcosahedronGeometry(1), material("#7b6948"), coconuts),
  );
  root.add(
    instance(foliageGeometry(true), leafMaterial, grasses),
    instance(rockGeometry(), surface("rock", "#77786a"), stones),
    instance(
      new THREE.IcosahedronGeometry(1, 1),
      material(palette.leaf),
      hills,
    ),
  );

  const clouds = [];
  for (let i = 0; i < 24; i++)
    clouds.push({
      p: [(random() - 0.5) * 210, 32 + random() * 12, -random() * 350],
      s: [6 + random() * 8, 1.7 + random(), 3 + random() * 3],
    });
  root.add(
    instance(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: "#f7f4df" }),
      clouds,
    ),
  );
  const sun = mesh(
    new THREE.SphereGeometry(5, 16, 12),
    new THREE.MeshBasicMaterial({ color: "#fff0bb" }),
    [-55, 42, -100],
  );
  root.add(sun);
  const ambient = new THREE.HemisphereLight("#f5f3da", "#586b48", 1.65);
  const light = new THREE.DirectionalLight("#fff1c6", 3);
  light.position.set(-30, 45, 20);
  light.castShadow = quality.shadows;
  light.shadow.autoUpdate = false;
  light.shadow.needsUpdate = true;
  let shadowAt = -100;
  light.shadow.mapSize.set(
    quality.flora > 150 ? 2048 : 1024,
    quality.flora > 150 ? 2048 : 1024,
  );
  Object.assign(light.shadow.camera, {
    left: -25,
    right: 25,
    top: 30,
    bottom: -30,
    near: 1,
    far: 100,
  });
  light.shadow.normalBias = 0.04;
  light.shadow.bias = -0.0003;
  root.add(ambient, light, light.target);
  const sky = new THREE.Color(palette.sky),
    evening = new THREE.Color("#edcfad");
  return {
    root,
    sky,
    fog: new THREE.FogExp2(palette.fog, 0.011),
    update(time, focus) {
      const day = (Math.sin(time / 120 - 0.5) + 1) * 0.5;
      sky.set(palette.sky).lerp(evening, day * 0.36);
      waterMaterial.uniforms.uTime.value = time;
      waterMaterial.uniforms.uSky.value.copy(sky);
      waterMaterial.uniforms.uLight.value = 1 - day * 0.12;
      sun.position.set(focus.x - 55 + day * 24, 42 - day * 20, focus.z - 115);
      if (time - shadowAt >= (quality.flora > 150 ? 1 / 30 : 1 / 20)) {
        shadowAt = time;
        light.position.set(focus.x - 30, 45 - day * 15, focus.z + 20);
        light.target.position.copy(focus);
        light.shadow.needsUpdate = true;
      }
      light.intensity = 3 - day * 0.7;
    },
    dispose() {
      light.shadow.dispose();
      disposeObject(root);
    },
  };
}
