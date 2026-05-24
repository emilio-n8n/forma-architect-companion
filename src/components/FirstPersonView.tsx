import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useRef } from "react";

export function FirstPersonView({
  bounds,
  onLockChange,
}: {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  onLockChange?: (locked: boolean) => void;
}) {
  const { camera, gl } = useThree();
  const keys = useRef({ w: false, a: false, s: false, d: false });
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));

  useEffect(() => {
    camera.position.set(
      (bounds.minX + bounds.maxX) / 2,
      1.6,
      (bounds.minZ + bounds.maxZ) / 2
    );
    camera.lookAt(
      (bounds.minX + bounds.maxX) / 2,
      1.6,
      (bounds.minZ + bounds.maxZ) / 2 - 1
    );
    euler.current.setFromQuaternion(camera.quaternion);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const down = e.type === "keydown";
      switch (e.code) {
        case "KeyW": keys.current.w = down; break;
        case "KeyA": keys.current.a = down; break;
        case "KeyS": keys.current.s = down; break;
        case "KeyD": keys.current.d = down; break;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement) return;
      const sensitivity = 0.002;
      euler.current.y -= e.movementX * sensitivity;
      euler.current.x -= e.movementY * sensitivity;
      euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x));
      camera.quaternion.setFromEuler(euler.current);
    };

    const handleLockChange = () => {
      onLockChange?.(document.pointerLockElement === gl.domElement);
    };

    const handlePointerDown = () => {
      const el = gl.domElement;
      if (document.pointerLockElement !== el) {
        el.requestPointerLock();
      } else {
        el.focus();
      }
    };

    gl.domElement.addEventListener("mousedown", handlePointerDown);
    gl.domElement.parentElement?.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleKey);
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("keyup", handleKey);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("pointerlockchange", handleLockChange);
      gl.domElement.removeEventListener("mousedown", handlePointerDown);
      gl.domElement.parentElement?.removeEventListener("mousedown", handlePointerDown);
    };

    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKey);
    document.addEventListener("keydown", handleKey);
    document.addEventListener("keyup", handleKey);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("pointerlockchange", handleLockChange);
    gl.domElement.addEventListener("click", handleClick);
    gl.domElement.parentElement?.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleKey);
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("keyup", handleKey);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("pointerlockchange", handleLockChange);
      gl.domElement.removeEventListener("click", handleClick);
      gl.domElement.parentElement?.removeEventListener("click", handleClick);
    };
  }, [gl, camera, onLockChange]);

  useFrame((_, delta) => {
    if (document.pointerLockElement !== gl.domElement) return;

    const speed = 3.5 * delta;
    const moveVec = new THREE.Vector3();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    forward.y = 0; forward.normalize();
    right.y = 0; right.normalize();

    if (keys.current.w) moveVec.add(forward);
    if (keys.current.s) moveVec.sub(forward);
    if (keys.current.a) moveVec.sub(right);
    if (keys.current.d) moveVec.add(right);

    if (moveVec.length() > 0) {
      moveVec.normalize().multiplyScalar(speed);
      const newPos = camera.position.clone().add(moveVec);
      newPos.x = Math.max(bounds.minX + 0.3, Math.min(bounds.maxX - 0.3, newPos.x));
      newPos.z = Math.max(bounds.minZ + 0.3, Math.min(bounds.maxZ - 0.3, newPos.z));
      newPos.y = 1.6;
      camera.position.copy(newPos);
    }
  });

  return null;
}
