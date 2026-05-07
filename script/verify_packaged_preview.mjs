import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import {execFileSync} from 'node:child_process';

const appName = process.argv[2] ?? 'Kevlar Codex Desktop';
const screenshotPath = path.join(os.tmpdir(), `kevlar-preview-${process.pid}.png`);

activateApp(appName);
const bounds = getWindowBounds(appName);
execFileSync('screencapture', ['-x', `-R${bounds.join(',')}`, screenshotPath]);

const stats = analyzePng(screenshotPath);
fs.rmSync(screenshotPath, {force: true});

console.log(
  `Preview pixels: ${stats.width}x${stats.height}, avg luminance ${stats.averageLuminance.toFixed(1)}, ` +
    `stddev ${stats.luminanceStdDev.toFixed(1)}, non-black ${(stats.nonBlackRatio * 100).toFixed(2)}%, ` +
    `${stats.uniqueBuckets} color buckets`,
);

if (stats.nonBlackRatio < 0.015 || stats.luminanceStdDev < 5 || stats.uniqueBuckets < 4) {
  throw new Error('Packaged app preview appears blank or black.');
}

function activateApp(name) {
  execFileSync('osascript', ['-e', `tell application "${name}" to activate`]);
  execFileSync('osascript', ['-e', 'delay 1']);
}

function getWindowBounds(name) {
  const output = execFileSync(
    'osascript',
    ['-e', `tell application "System Events" to tell process "${name}" to get position of window 1 & size of window 1`],
    {encoding: 'utf8'},
  )
    .trim()
    .replace(/\s+/g, '');
  const values = output.split(',').map((value) => Number.parseInt(value, 10));
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) {
    throw new Error(`Could not resolve ${name} window bounds: ${output}`);
  }
  return values;
}

function analyzePng(filePath) {
  const file = fs.readFileSync(filePath);
  const png = parsePng(file);
  if (png.bitDepth !== 8 || png.interlace !== 0) {
    throw new Error(`Unsupported PNG format: bitDepth=${png.bitDepth}, interlace=${png.interlace}`);
  }

  const channels = channelsForColorType(png.colorType);
  const bytesPerPixel = channels;
  const rowBytes = png.width * channels;
  const inflated = zlib.inflateSync(Buffer.concat(png.idat));
  const previous = Buffer.alloc(rowBytes);
  const current = Buffer.alloc(rowBytes);
  let offset = 0;
  let sampleCount = 0;
  let luminanceSum = 0;
  let luminanceSquaredSum = 0;
  let nonBlack = 0;
  const buckets = new Set();
  const sampleStride = Math.max(1, Math.floor(Math.min(png.width, png.height) / 80));

  for (let y = 0; y < png.height; y += 1) {
    const filter = inflated[offset++];
    const raw = inflated.subarray(offset, offset + rowBytes);
    offset += rowBytes;
    unfilter(filter, raw, current, previous, bytesPerPixel);

    if (y % sampleStride === 0) {
      for (let x = 0; x < png.width; x += sampleStride) {
        const index = x * channels;
        const [r, g, b, a] = rgbaAt(current, index, png.colorType);
        if (a === 0) continue;
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        sampleCount += 1;
        luminanceSum += luminance;
        luminanceSquaredSum += luminance * luminance;
        if (luminance > 12) nonBlack += 1;
        buckets.add(`${r >> 4},${g >> 4},${b >> 4}`);
      }
    }

    previous.set(current);
  }

  if (sampleCount === 0) throw new Error('No screenshot pixels sampled.');
  const averageLuminance = luminanceSum / sampleCount;
  const variance = luminanceSquaredSum / sampleCount - averageLuminance * averageLuminance;
  return {
    width: png.width,
    height: png.height,
    averageLuminance,
    luminanceStdDev: Math.sqrt(Math.max(0, variance)),
    nonBlackRatio: nonBlack / sampleCount,
    uniqueBuckets: buckets.size,
  };
}

function parsePng(buffer) {
  const signature = '89504e470d0a1a0a';
  if (buffer.subarray(0, 8).toString('hex') !== signature) {
    throw new Error('Screenshot is not a PNG.');
  }
  let offset = 8;
  const idat = [];
  let ihdr = null;

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        interlace: data[12],
      };
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (!ihdr) throw new Error('PNG is missing IHDR.');
  if (idat.length === 0) throw new Error('PNG is missing IDAT.');
  return {...ihdr, idat};
}

function channelsForColorType(colorType) {
  if (colorType === 0) return 1;
  if (colorType === 2) return 3;
  if (colorType === 6) return 4;
  throw new Error(`Unsupported PNG color type: ${colorType}`);
}

function rgbaAt(row, index, colorType) {
  if (colorType === 0) {
    const value = row[index];
    return [value, value, value, 255];
  }
  if (colorType === 2) {
    return [row[index], row[index + 1], row[index + 2], 255];
  }
  return [row[index], row[index + 1], row[index + 2], row[index + 3]];
}

function unfilter(filter, raw, current, previous, bytesPerPixel) {
  for (let index = 0; index < raw.length; index += 1) {
    const left = index >= bytesPerPixel ? current[index - bytesPerPixel] : 0;
    const up = previous[index] ?? 0;
    const upLeft = index >= bytesPerPixel ? previous[index - bytesPerPixel] : 0;
    if (filter === 0) current[index] = raw[index];
    else if (filter === 1) current[index] = (raw[index] + left) & 0xff;
    else if (filter === 2) current[index] = (raw[index] + up) & 0xff;
    else if (filter === 3) current[index] = (raw[index] + Math.floor((left + up) / 2)) & 0xff;
    else if (filter === 4) current[index] = (raw[index] + paeth(left, up, upLeft)) & 0xff;
    else throw new Error(`Unsupported PNG filter: ${filter}`);
  }
}

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  if (upDistance <= upLeftDistance) return up;
  return upLeft;
}
