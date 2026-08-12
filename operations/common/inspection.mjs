import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.cwd());

export async function readJson(relativePath) {
  const fullPath = path.resolve(root, relativePath);
  const data = await fs.readFile(fullPath, "utf8");
  return JSON.parse(data);
}

export async function fileInfo(relativePath) {
  try {
    const fullPath = path.resolve(root, relativePath);
    const stat = await fs.stat(fullPath);
    return {
      path: fullPath,
      exists: true,
      size: stat.size,
      mtime: stat.mtime.toISOString(),
    };
  } catch {
    return {
      path: path.resolve(root, relativePath),
      exists: false,
      size: 0,
      mtime: null,
    };
  }
}

export function countBy(collection, predicate) {
  return collection.reduce((total, item) => total + (predicate(item) ? 1 : 0), 0);
}

export function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function tokenise(value) {
  return normalize(value).match(/[a-z0-9]+/g) ?? [];
}

export function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

