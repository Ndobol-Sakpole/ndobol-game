import { createCharacter } from "./characters.js";
import * as THREE from "three";
import { mesh, material, instance, disposeObject } from "../core/procedural.js";
const TYPES = ["duck", "buffalo", "proboscis"];
export function createAnimal(type) {
  if (
    [
      "dog",
      "cat",
      "duck",
      "monkey",
      "pig",
      "squirrel",
      "crocodile",
      "snake",
    ].includes(type)
  )
    return createCharacter(type);
  if (!TYPES.includes(type)) throw new TypeError(`Unknown animal: ${type}`);
  const root = new THREE.Group(),
    body = new THREE.Group(),
    head = new THREE.Group();
  root.add(body);
  body.add(head);
  const ball = new THREE.IcosahedronGeometry(1, 1),
    cone = new THREE.ConeGeometry(1, 1, 7),
    cylinder = new THREE.CylinderGeometry(1, 1, 1, 6);
  const eyes = material("#242b27"),
    white = material("#f1e8c9");
  let tail;
  if (type === "duck") {
    const feather = material("#f4efdb"),
      orange = material("#d6a14e");
    body.add(mesh(ball, feather, [0, 0.25, 0], [0.38, 0.32, 0.62]));
    body.add(mesh(ball, white, [0.28, 0.31, 0.05], [0.15, 0.22, 0.4]));
    head.position.set(0, 0.65, -0.42);
    head.add(
      mesh(ball, feather, [0, 0, 0], [0.27, 0.3, 0.28]),
      mesh(
        cone,
        orange,
        [0, -0.06, -0.3],
        [0.17, 0.38, 0.11],
        [-Math.PI / 2, 0, 0],
      ),
    );
    for (const side of [-1, 1])
      head.add(
        mesh(ball, eyes, [side * 0.235, 0.05, -0.1], [0.04, 0.04, 0.04]),
      );
    tail = mesh(cone, feather, [0, 0.4, 0.5], [0.2, 0.4, 0.17], [0.7, 0, 0]);
    body.add(tail);
  } else if (type === "buffalo") {
    const skin = material("#6e7b76"),
      horn = material("#d7d2b2");
    body.add(mesh(ball, skin, [0, 1.15, 0], [0.75, 0.66, 1.35]));
    const legs = [];
    for (const x of [-0.5, 0.5])
      for (const z of [-0.8, 0.8])
        legs.push({ p: [x, 0.5, z], s: [0.18, 0.9, 0.2] });
    body.add(instance(cylinder, skin, legs));
    head.position.set(0, 1.3, -1.25);
    head.add(
      mesh(ball, skin, [0, 0, 0], [0.55, 0.55, 0.65]),
      mesh(ball, material("#495a55"), [0, -0.17, -0.48], [0.5, 0.28, 0.3]),
    );
    for (const side of [-1, 1]) {
      head.add(
        mesh(
          cone,
          horn,
          [side * 0.65, 0.5, 0],
          [0.16, 1.1, 0.17],
          [0, 0, -side * 0.6],
        ),
      );
      head.add(mesh(ball, eyes, [side * 0.43, 0.1, -0.4], [0.07, 0.07, 0.06]));
      head.add(mesh(ball, skin, [side * 0.6, 0.15, 0], [0.38, 0.12, 0.18]));
    }
    tail = mesh(cylinder, skin, [0, 1, 1.4], [0.06, 1, 0.06], [-0.4, 0, 0]);
    body.add(tail);
  } else {
    const fur = material("#a56d44"),
      face = material("#dfb887");
    body.add(
      mesh(ball, fur, [0, 0.85, 0], [0.43, 0.66, 0.34]),
      mesh(ball, white, [0, 0.8, -0.22], [0.33, 0.43, 0.18]),
    );
    head.position.set(0, 1.55, -0.1);
    head.add(
      mesh(ball, fur, [0, 0, 0], [0.4, 0.4, 0.35]),
      mesh(ball, face, [0, -0.04, -0.23], [0.3, 0.3, 0.19]),
      mesh(ball, material("#ce956e"), [0, -0.2, -0.43], [0.14, 0.26, 0.17]),
    );
    for (const side of [-1, 1]) {
      head.add(
        mesh(ball, eyes, [side * 0.14, 0.04, -0.39], [0.035, 0.045, 0.025]),
      );
      body.add(
        mesh(
          cylinder,
          fur,
          [side * 0.44, 0.8, -0.05],
          [0.12, 0.9, 0.12],
          [0, 0, side * 0.18],
        ),
      );
      body.add(mesh(ball, fur, [side * 0.26, 0.25, 0], [0.22, 0.3, 0.32]));
    }
    tail = mesh(
      new THREE.TorusGeometry(0.6, 0.055, 5, 12, Math.PI * 1.6),
      fur,
      [0, 0.6, 0.5],
      [1, 1, 1],
      [0, Math.PI / 2, 0.6],
    );
    body.add(tail);
  }
  const baseline = body.position.y;
  let reactionAt = -100,
    reactionStrength = 0;
  return {
    type,
    root,
    react(time, strength = 1) {
      reactionAt = time;
      reactionStrength = strength;
    },
    update(time) {
      const reaction =
        Math.max(0, 1 - (time - reactionAt) / 0.65) * reactionStrength;
      body.position.y =
        baseline +
        Math.sin(time * (type === "duck" ? 2 : 1.3)) * 0.04 +
        Math.sin(reaction * Math.PI) * 0.2;
      head.rotation.y = Math.sin(time * 0.8) * 0.16;
      head.rotation.x = Math.sin(time * 1.1) * 0.06 - reaction * 0.15;
      tail.rotation.z = Math.sin(time * 2) * 0.15;
    },
    dispose() {
      disposeObject(root);
    },
  };
}
