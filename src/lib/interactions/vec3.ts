import type { Vec3 } from "@/types/interactions";
import { numClose } from "./math";

/** Math (x,y,z) with z vertical → Three.js Y-up: (x, z, y). */
export function vecToThree([x, y, z]: Vec3): [number, number, number] {
  return [x, z, y];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function mag(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

export function vecNear(a: Vec3, b: Vec3, tol = 0.35): boolean {
  return (
    numClose(a[0], b[0], tol) &&
    numClose(a[1], b[1], tol) &&
    numClose(a[2], b[2], tol)
  );
}

export function cartToCyl([x, y, z]: Vec3): { r: number; theta: number; z: number } {
  return { r: Math.hypot(x, y), theta: Math.atan2(y, x), z };
}

export function cylToCart(r: number, theta: number, z: number): Vec3 {
  return [r * Math.cos(theta), r * Math.sin(theta), z];
}

export function cartToSph([x, y, z]: Vec3): { rho: number; theta: number; phi: number } {
  const rho = Math.hypot(x, y, z);
  if (rho < 1e-9) return { rho: 0, theta: 0, phi: 0 };
  return {
    rho,
    theta: Math.atan2(y, x),
    phi: Math.acos(Math.max(-1, Math.min(1, z / rho))),
  };
}

export function sphToCart(rho: number, theta: number, phi: number): Vec3 {
  const sinPhi = Math.sin(phi);
  return [
    rho * sinPhi * Math.cos(theta),
    rho * sinPhi * Math.sin(theta),
    rho * Math.cos(phi),
  ];
}
