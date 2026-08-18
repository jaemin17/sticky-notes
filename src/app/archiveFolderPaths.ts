type ArchiveFolderPaths = {
  top: string;
  front: string;
};

const CLOSED_TOP: readonly number[] = [4.65, 0, 0, 0, 0, 0, 0, 0, 0];
const OPEN_TOP: readonly number[] = [8.25, -1.22, 0, -2.34, 0.72, -2.92, 1.86, -0.68, 1.4];

const CLOSED_FRONT: readonly number[] = [
  5.1, 10, 13.8, 0.77, 0, 1.4, 0.63, 1.4, 1.4, 0, 5.9, 0, 1.33, -1.07, 2.4,
  -2.4, 2.4, 17.9, 19.7, 6.1, -1.33, 0, -2.4, -1.07, -2.4, -2.4, 0, -5.9,
  0, -0.77, 0.63, -1.4, 1.4, -1.4,
];

const OPEN_FRONT: readonly number[] = [
  6.95, 10.78, 13.68, 0.78, 0, 1.3, 0.62, 1.13, 1.42, -1.25, 4.78, -0.28,
  0.86, -1.08, 2.62, -2.46, 2.7, 18.05, 19.68, 5.65, -1.03, 0, -1.72,
  -0.78, -1.46, -1.72, 1.42, -4.28, 0.34, -1.02, 0.72, -2.28, 1.34, -2.9,
];

function clampProgress(progress: number) {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  return progress;
}

function formatNumber(value: number) {
  if (Object.is(value, -0)) return "0";
  const rounded = Number(value.toFixed(2));
  if (Object.is(rounded, -0)) return "0";
  const text = String(rounded);
  return text.startsWith("0.") ? text.slice(1) : text.startsWith("-0.") ? `-${text.slice(2)}` : text;
}

function interpolateNumber(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

function interpolateNumbers(from: readonly number[], to: readonly number[], progress: number) {
  return from.map((value, index) => formatNumber(interpolateNumber(value, to[index], progress)));
}

function buildTopPath(values: string[]) {
  const [mouthX, c1x, c1y, c2x, c2y, c3x, c3y, lipX, lipY] = values;
  return `M4.65 5.55c0-.72.58-1.3 1.3-1.3h3.18c.38 0 .74.17 .99.45l1.35 1.55h6.58c.72 0 1.3.58 1.3 1.3v1.05H${mouthX}c${c1x} ${c1y} ${c2x} ${c2y} ${c3x} ${c3y}l${lipX} ${lipY}V5.55Z`;
}

function buildFrontPath(values: string[]) {
  const [
    startX,
    startY,
    width,
    c1x,
    c1y,
    c2x,
    c2y,
    c3x,
    c3y,
    sideX,
    sideY,
    bottomC1x,
    bottomC1y,
    bottomC2x,
    bottomC2y,
    bottomC3x,
    bottomC3y,
    lineX,
    lineY,
    leftX,
    leftC1x,
    leftC1y,
    leftC2x,
    leftC2y,
    leftC3x,
    leftC3y,
    lipX,
    lipY,
    closeC1x,
    closeC1y,
    closeC2x,
    closeC2y,
    closeC3x,
    closeC3y,
  ] = values;

  return `M${startX} ${startY}h${width}c${c1x} ${c1y} ${c2x} ${c2y} ${c3x} ${c3y}l${sideX} ${sideY}c${bottomC1x} ${bottomC1y} ${bottomC2x} ${bottomC2y} ${bottomC3x} ${bottomC3y}L${lineX} ${lineY}H${leftX}c${leftC1x} ${leftC1y} ${leftC2x} ${leftC2y} ${leftC3x} ${leftC3y}l${lipX} ${lipY}c${closeC1x} ${closeC1y} ${closeC2x} ${closeC2y} ${closeC3x} ${closeC3y}Z`;
}

export function getArchiveFolderPaths(progress: number): ArchiveFolderPaths {
  const clampedProgress = clampProgress(progress);

  return {
    top: buildTopPath(interpolateNumbers(CLOSED_TOP, OPEN_TOP, clampedProgress)),
    front: buildFrontPath(interpolateNumbers(CLOSED_FRONT, OPEN_FRONT, clampedProgress)),
  };
}
