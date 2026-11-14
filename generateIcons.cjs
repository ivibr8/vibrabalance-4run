const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

function createIcon(size, isMaskable = false) {
  const png = new PNG({ width: size, height: size });
  const center = size / 2;
  const radius = size * (isMaskable ? 0.38 : 0.44);

  // Background dark slate #0f172a
  const bgR = 15, bgG = 23, bgB = 42;
  // Cyan #06b6d4
  // Amber #f59e0b
  // Emerald #10b981
  // Slate circle #334155

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default background
      let r = bgR;
      let g = bgG;
      let b = bgB;
      let a = 255;

      // If not maskable, make outside rounded rect transparent or keep solid
      // Rounded rect boundary
      const cornerRadius = size * 0.22;
      const qx = Math.max(0, Math.abs(dx) - (center - cornerRadius));
      const qy = Math.max(0, Math.abs(dy) - (center - cornerRadius));
      const cornerDist = Math.sqrt(qx * qx + qy * qy);

      if (!isMaskable && cornerDist > cornerRadius) {
        a = 0; // transparent corner
      }

      if (a > 0) {
        // Draw grid concentric dashed circles
        const r1 = radius * 0.4;
        const r2 = radius * 0.7;
        const r3 = radius;

        if (Math.abs(dist - r1) < size * 0.008 || Math.abs(dist - r2) < size * 0.008 || Math.abs(dist - r3) < size * 0.008) {
          // grid circle
          r = 51; g = 65; b = 85;
        }

        // Draw crosshair axes
        if ((Math.abs(dx) < size * 0.007 && Math.abs(dy) < radius * 1.1) ||
            (Math.abs(dy) < size * 0.007 && Math.abs(dx) < radius * 1.1)) {
          r = 71; g = 85; b = 105;
        }

        // Run "O" Circle (radius = r2, centered at center)
        if (Math.abs(dist - r2) < size * 0.016) {
          r = 148; g = 163; b = 184; // #94a3b8
        }

        // Run "T1" (0 deg) circle (center at center + r2, y = center, radius = r2 * 0.9)
        const t1Dx = x - (center + r2 * 0.85);
        const t1Dy = y - center;
        const distT1 = Math.sqrt(t1Dx * t1Dx + t1Dy * t1Dy);
        if (Math.abs(distT1 - r2 * 0.9) < size * 0.016) {
          r = 6; g = 182; b = 212; // #06b6d4 Cyan
        }

        // Run "T2" (120 deg) circle
        const angle120 = (120 * Math.PI) / 180;
        const t2Dx = x - (center + r2 * 0.85 * Math.cos(angle120));
        const t2Dy = y - (center + r2 * 0.85 * Math.sin(angle120));
        const distT2 = Math.sqrt(t2Dx * t2Dx + t2Dy * t2Dy);
        if (Math.abs(distT2 - r2 * 1.05) < size * 0.016) {
          r = 16; g = 185; b = 129; // #10b981 Emerald
        }

        // Run "T3" (240 deg) circle
        const angle240 = (240 * Math.PI) / 180;
        const t3Dx = x - (center + r2 * 0.85 * Math.cos(angle240));
        const t3Dy = y - (center + r2 * 0.85 * Math.sin(angle240));
        const distT3 = Math.sqrt(t3Dx * t3Dx + t3Dy * t3Dy);
        if (Math.abs(distT3 - r2 * 1.8) < size * 0.016) {
          r = 139; g = 92; b = 246; // #8b5cf6 Purple
        }

        // Center pivot dot
        if (dist < size * 0.035) {
          r = 248; g = 250; b = 252;
        }

        // Correction vector line from center to intersection (angle ~ 55 deg)
        // target: center + (cos(55)*r2*0.9, sin(55)*r2*0.9)
        const vecAngle = 55 * Math.PI / 180;
        const targetX = center + r2 * 0.85 * Math.cos(vecAngle);
        const targetY = center - r2 * 0.85 * Math.sin(vecAngle);

        // Vector line
        const vdx = targetX - center;
        const vdy = targetY - center;
        const vLen = Math.sqrt(vdx * vdx + vdy * vdy);
        const proj = (dx * vdx + (-dy) * (-vdy)) / vLen; // projection along vector
        if (proj > 0 && proj < vLen) {
          const perpDist = Math.abs(dx * (-vdy) - (-dy) * vdx) / vLen;
          if (perpDist < size * 0.02) {
            r = 245; g = 158; b = 11; // Amber #f59e0b
          }
        }

        // Target correction mass dot at (targetX, targetY)
        const dtX = x - targetX;
        const dtY = y - targetY;
        const distTarget = Math.sqrt(dtX * dtX + dtY * dtY);
        if (distTarget < size * 0.055) {
          if (distTarget > size * 0.038) {
            r = 255; g = 255; b = 255; // White border
          } else {
            r = 245; g = 158; b = 11; // Amber fill
          }
        }
      }

      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = a;
    }
  }

  return png;
}

const pubDir = path.join(__dirname, '../public');
if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });

// 192x192
const p192 = createIcon(192);
p192.pack().pipe(fs.createWriteStream(path.join(pubDir, 'pwa-192x192.png'))).on('finish', () => console.log('192 done'));

// 512x512
const p512 = createIcon(512);
p512.pack().pipe(fs.createWriteStream(path.join(pubDir, 'pwa-512x512.png'))).on('finish', () => console.log('512 done'));

// maskable 512x512
const pMask = createIcon(512, true);
pMask.pack().pipe(fs.createWriteStream(path.join(pubDir, 'pwa-maskable-512x512.png'))).on('finish', () => console.log('maskable done'));

// apple touch icon 180x180
const pApple = createIcon(180);
pApple.pack().pipe(fs.createWriteStream(path.join(pubDir, 'apple-touch-icon.png'))).on('finish', () => console.log('apple done'));
