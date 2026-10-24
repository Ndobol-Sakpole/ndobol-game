import * as THREE from "three";
import { instance, material, disposeObject } from "../core/procedural.js";
const palette = {
  dog: ["#bf853c", "#f3d59d", "#b84638"],
  cat: ["#d88a37", "#f8dba3", "#397aa4"],
  duck: ["#f5e2a3", "#fff3cb", "#668b46"],
  monkey: ["#8c5837", "#d7ae7d", "#d6aa35"],
  pig: ["#dc958d", "#efb8a6", "#875b9e"],
  squirrel: ["#a86838", "#e2b887", "#477f6c"],
  crocodile: ["#60874d", "#c6d18a", "#d2a75c"],
  snake: ["#81a348", "#d7d886", "#ac7040"],
};
/** Rounded clay-like characters. All detail is geometry, vertex colour or a canvas texture. */
export function createCharacter(type) {
  const [skin, cream, accessory] = palette[type],
    root = new THREE.Group(),
    body = new THREE.Group(),
    head = new THREE.Group();
  root.add(body);
  body.add(head);
  const ball = new THREE.SphereGeometry(1, 16, 12),
    cone = new THREE.ConeGeometry(1, 1, 10),
    white = material("#fff", { flatShading: false, roughness: 0.82 });
  const torso = [],
    face = [],
    features = [],
    lids = [],
    bodyCones = [],
    headCones = [];
  const iris = type === "cat" ? "#5b9273" : type === "snake" ? "#c7a652" : "#a67b40";
  const part = (list, p, s, color, r) => list.push({ p, s, color, r });
  const long = type === "crocodile",
    duck = type === "duck",
    snake = type === "snake";
  const feet = [];
  if (snake) {
    const coils = [];
    for (let i = 0; i < 3; i++)
      coils.push({
        p: [0, 0.17 + i * 0.15, 0],
        s: [0.44 - i * 0.075, 0.44 - i * 0.075, 0.44 - i * 0.075],
        r: [Math.PI / 2, 0, i * 0.6],
        color: skin,
      });
    body.add(
      instance(
        new THREE.TorusGeometry(1, 0.33, 8, 24, Math.PI * 1.87),
        white,
        coils,
      ),
    );
    part(torso, [0, 0.75, 0], [0.22, 0.53, 0.22], skin);
  } else {
    part(torso, [0, 0.67, 0], [0.4, 0.5, 0.3], skin);
    part(torso, [0, 0.65, -0.24], [0.3, 0.36, 0.1], cream);
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.23, 0.37, 0);
      body.add(leg);
      leg.add(
        instance(ball, white, [
          { p: [0, -0.13, 0], s: [0.16, 0.24, 0.17], color: skin },
          {
            p: [0, -0.29, -0.12],
            s: [0.2, 0.1, 0.28],
            color: duck ? "#dc913b" : skin,
          },
        ]),
      );
      feet.push(leg);
      // Rounded fingers, knuckles and toes adapted from the local v2 character sheet.
      for (let digit = 0; digit < 3; digit++) {
        part(torso, [side * (0.39 + digit * 0.055), 0.39, -0.12], [0.038, 0.077, 0.045], cream);
        part(torso, [side * 0.23 + (digit - 1) * 0.085, 0.055, -0.33], [0.055, 0.04, 0.07], cream);
      }
      part(torso, [side * 0.42, 0.72, 0], [0.13, 0.3, 0.14], skin, [
        0,
        0,
        -side * 0.18,
      ]);
      part(torso, [side * 0.46, 0.46, -0.06], [0.15, 0.15, 0.15], skin);
    }
  }
  head.position.set(0, 1.27, -0.03);
  part(face, [0, 0, 0], [0.46, 0.43, 0.38], skin);
  if (duck) {
    part(face, [0, -0.12, -0.36], [0.34, 0.12, 0.28], "#dda13c");
    part(face, [0, 0.33, 0], [0.37, 0.15, 0.34], accessory);
    part(face, [0, 0.29, -0.27], [0.43, 0.04, 0.28], accessory);
  } else if (type === "pig") {
    part(face, [0, -0.1, -0.35], [0.27, 0.17, 0.16], "#c9807b");
    for (const x of [-0.09, 0.09])
      part(face, [x, -0.08, -0.5], [0.035, 0.049, 0.012], "#73483e");
  } else if (long) {
    part(face, [0, -0.14, -0.34], [0.3, 0.16, 0.45], skin);
    part(face, [0, -0.25, -0.36], [0.28, 0.06, 0.43], cream);
    for (const side of [-1, 1])
      for (let i = 0; i < 4; i++)
        part(
          headCones,
          [side * 0.24, -0.14, -0.22 - i * 0.13],
          [0.038, 0.13, 0.038],
          "#fff0c9",
          [0, 0, Math.PI],
        );
    for (let i = 0; i < 4; i++)
      part(
        bodyCones,
        [0, 1.05 - i * 0.16, 0.26],
        [0.07, 0.13, 0.07],
        "#3f653c",
      );
  } else if (snake) {
    part(face, [0, -0.11, -0.24], [0.37, 0.16, 0.3], cream);
    part(face, [0, -0.18, -0.49], [0.055, 0.026, 0.14], "#ba5c59");
  } else {
    part(face, [0, -0.16, -0.29], [0.3, 0.19, 0.18], cream);
    part(face, [0, -0.05, -0.46], [0.11, 0.08, 0.085], "#4d3426");
    part(headCones, [0.14, -0.27, -0.42], [0.055, 0.12, 0.06], "#fff3d3", [
      0,
      0,
      Math.PI,
    ]);
  }
  // Deliberately uneven eyes / brows retain the mischievous reference expressions.
  for (const side of [-1, 1]) {
    const x = side * 0.19,
      y = side < 0 ? 0.1 : 0.14,
      z = long ? -0.3 : -0.32;
    part(face, [x, y, z], [0.16, side < 0 ? 0.15 : 0.18, 0.09], "#fff4d9");
    part(face, [x + side * 0.025, y - 0.01, z - 0.075], [0.095, 0.112, 0.037], iris);
    part(lids, [x, y, z - 0.004], [0.164, 0.155, 0.094], skin);
    part(
      face,
      [x + side * 0.025, y - 0.015, z - 0.135],
      [0.049, 0.069, 0.022],
      "#312d27",
    );
    part(
      face,
      [x + side * 0.025 - 0.021, y + 0.018, z - 0.135],
      [0.023, 0.028, 0.01],
      "#fff",
    );
    part(face, [x, y + 0.17, z + 0.018], [0.17, 0.045, 0.07], skin, [
      0,
      0,
      side * 0.16,
    ]);
    if (!duck && !snake && !long) {
      if (type === "monkey") {
        part(face, [side * 0.46, 0.02, 0], [0.2, 0.23, 0.1], skin);
        part(face, [side * 0.48, 0.02, -0.07], [0.12, 0.15, 0.05], cream);
      } else if (type === "dog")
        part(
          face,
          [side * 0.39, side < 0 ? -0.06 : 0.24, 0.03],
          [0.17, side < 0 ? 0.36 : 0.3, 0.1],
          skin,
          [0, 0, side * 0.4],
        );
      else
        part(headCones, [side * 0.31, 0.38, 0], [0.19, 0.37, 0.18], skin, [
          0,
          0,
          -side * 0.22,
        ]);
    }
  }
  if (type === "dog" || type === "pig") {
    part(torso, [0, 1.0, -0.07], [0.36, 0.1, 0.3], accessory);
    part(bodyCones, [0.08, 0.84, -0.33], [0.2, 0.3, 0.04], accessory, [
      0,
      0,
      Math.PI + 0.15,
    ]);
  }
  if (type === "cat") {
    for (const side of [-1, 1])
      part(torso, [side * 0.26, 0.75, -0.18], [0.18, 0.33, 0.18], accessory);
    for (let j = 0; j < 3; j++)
      part(face, [(j - 1) * 0.13, 0.32, -0.17], [0.025, 0.11, 0.06], "#9b542b");
  }
  if (type === "monkey")
    part(torso, [0.2, 0.53, -0.3], [0.23, 0.15, 0.13], accessory);
  if (["dog", "pig", "snake", "crocodile"].includes(type)) {
    const fabric = type === "crocodile" ? "#d17462" : type === "snake" ? "#53a5b6" : accessory;
    if (snake || long) {
      part(torso, [0, 1.01, 0], [0.3, 0.065, 0.25], fabric);
      part(bodyCones, [0.08, 0.87, -0.24], [0.18, 0.25, 0.045], fabric, [0,0,Math.PI]);
    }
    for (let stitch = 0; stitch < 7; stitch++) part(torso, [-0.16 + stitch * 0.047, 1.02, -0.34], [0.012, 0.022, 0.015], "#f2d3a3");
  }
  if (["monkey", "squirrel"].includes(type)) {
    part(torso,[0.17,0.55,-0.31],[0.23,0.15,0.105],"#c49d56");
    part(torso,[0.17,0.58,-0.41],[0.2,0.07,0.025],"#e6c488");
    part(torso,[0.17,0.54,-0.444],[0.039,0.035,0.016],"#725634");
    for (const x of [-0.063,0.063]) part(features,[x,-0.27,-0.46],[0.048,0.105,0.04],"#fff8df");
  }
  if (type === "cat") {
    for (const side of [-1,1]) for (let j=0;j<3;j++) part(features,[side*0.32,-0.13-j*0.05,-0.37],[0.22,0.012,0.015],"#6c4c39",[0,side*0.2,side*(0.16-j*0.14)]);
    part(torso,[0,0.68,-0.323],[0.11,0.14,0.023],accessory);
    for(let i=0;i<5;i++) part(torso,[-0.09+i*0.045,0.78,-0.35],[0.008,0.015,0.008],"#d4d5af");
  }
  if (type === "crocodile") for (let i=0;i<4;i++) part(torso,[0,0.44+i*0.13,-0.33],[0.23-i*0.025,0.014,0.018],"#768452");
  body.add(instance(ball, white, torso));
  head.add(instance(ball, white, face));
  if (bodyCones.length) body.add(instance(cone, white, bodyCones));
  if (headCones.length) head.add(instance(cone, white, headCones));
  if (features.length) head.add(instance(ball, white, features));
  const eyelids = instance(ball, white, lids);
  head.add(eyelids);
  eyelids.visible = false;
  const tail = new THREE.Group();
  tail.position.set(0, 0.46, 0.22);
  body.add(tail);
  const tails = [];
  if (type === "squirrel") {
    part(tails, [0, 0.25, 0.32], [0.36, 0.68, 0.32], skin, [-0.45, 0, 0]);
    part(tails, [0, 0.62, 0.5], [0.32, 0.4, 0.29], cream);
  } else if (type === "crocodile")
    for (let i = 0; i < 5; i++)
      part(
        tails,
        [0, -0.1, 0.16 + i * 0.14],
        [0.2 - i * 0.032, 0.16 - i * 0.025, 0.22],
        skin,
      );
  else if (!snake)
    for (let i = 0; i < 4; i++)
      part(
        tails,
        [Math.sin(i * 0.5) * 0.14, 0.07 + i * 0.1, 0.15 + i * 0.09],
        [0.1, 0.12, 0.12],
        skin,
      );
  if (tails.length) tail.add(instance(ball, white, tails));
  let reactionAt = -100,
    strength = 0;
  return {
    root,
    type,
    react(time, value = 1) {
      reactionAt = time;
      strength = value;
    },
    update(time, pose = {}) {
      const reaction = Math.max(0, 1 - (time - reactionAt) / 0.65) * strength,
        gas = pose.thrustActive ? Math.max(0.65, pose.gas || 0) : pose.gas || 0,
        walk = pose.walk || 0;
      body.position.y =
        Math.sin(time * 2) * 0.015 +
        Math.abs(Math.sin(time * 9)) * walk * 0.035;
      eyelids.visible = Math.sin(time * 0.84 + type.length) > 0.997;
      body.rotation.x = gas * 0.24;
      body.rotation.z = gas * Math.sin(time * 32) * 0.022;
      body.scale.y = 1 - gas * 0.1;
      body.scale.x = 1 + gas * 0.045;
      head.rotation.x =
        Math.sin(time * 1.3) * 0.04 - gas * 0.12 - reaction * 0.1;
      head.rotation.y = Math.sin(time * 0.8) * 0.07;
      feet.forEach((leg, i) => {
        leg.rotation.x = Math.sin(time * 10 + i * Math.PI) * walk * 0.42;
      });
      tail.rotation.z = Math.sin(time * 3) * 0.13 + gas * 0.25;
    },
    dispose() {
      disposeObject(root);
    },
  };
}
