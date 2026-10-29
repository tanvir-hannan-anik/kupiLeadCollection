import { site } from "@/config/site";

/**
 * Draws Kupi's official contact card on a canvas. The same drawing is shown on
 * screen and downloaded as a PNG, so what visitors see is exactly what they save.
 * Browser-only (uses canvas, Image and document.fonts).
 */
export const CARD_WIDTH = 1050;
export const CARD_HEIGHT = 600;

const C = {
  night: "#16163A",
  panel: "#1C1A48",
  flame: "#FFB020",
  paper: "#FBF5E9",
  ember: "#E8731A",
};

// Lucide icons (ISC licence), 24×24 viewBox, drawn as strokes.
const ICONS = {
  mail: ["M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", "m22 6-10 7L2 6"],
  phone: [
    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z",
  ],
  globe: [
    "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z",
    "M2 12h20",
    "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
  ],
} as const;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

/** The real font-family names next/font generated for our CSS variables. */
function fontFamily(variable: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value ? `${value}, ${fallback}` : fallback;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function drawIcon(ctx: CanvasRenderingContext2D, paths: readonly string[], x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = C.flame;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const d of paths) ctx.stroke(new Path2D(d));
  ctx.restore();
}

export async function drawKupiCard(canvas: HTMLCanvasElement, opts: { name?: string; scale?: number } = {}) {
  const scale = opts.scale ?? 2;
  const W = CARD_WIDTH;
  const H = CARD_HEIGHT;

  const display = fontFamily("--font-baloo", "sans-serif");
  const sans = fontFamily("--font-anek", "sans-serif");
  const mono = fontFamily("--font-plex-mono", "monospace");

  const [logo, mascot] = await Promise.all([
    loadImage("/brand/logo-on-dark.jpg"),
    loadImage("/brand/shikha-cheer.png"),
    document.fonts.load(`800 52px ${display}`, "বুঝে শেখো Kupi"),
    document.fonts.load(`500 22px ${sans}`, "kupilearn বুঝে"),
    document.fonts.load(`500 16px ${mono}`, "OFFICIAL"),
  ]);

  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported");
  ctx.scale(scale, scale);

  // Card shape
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 36);
  ctx.clip();

  // Background + warm lamp glow + faint notebook (khata) lines
  ctx.fillStyle = C.night;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W - 190, H - 210, 10, W - 190, H - 210, 430);
  glow.addColorStop(0, "rgba(255,176,32,0.32)");
  glow.addColorStop(1, "rgba(255,176,32,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(251,245,233,0.045)";
  ctx.lineWidth = 1;
  for (let y = 36; y < H - 80; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
    ctx.stroke();
  }

  // Logo: the file has a solid dark background. "lighten" keeps only the
  // light artwork, so no box shows over the card's lines and glow.
  const logoH = 62;
  ctx.globalCompositeOperation = "lighten";
  ctx.drawImage(logo, 50, 44, (logo.width / logo.height) * logoH, logoH);
  ctx.globalCompositeOperation = "source-over";

  // "OFFICIAL CARD" tag
  ctx.font = `500 15px ${mono}`;
  ctx.letterSpacing = "3px";
  const tag = "OFFICIAL CARD";
  const tagW = ctx.measureText(tag).width + 36;
  ctx.fillStyle = "rgba(255,176,32,0.12)";
  ctx.beginPath();
  ctx.roundRect(W - 50 - tagW, 56, tagW, 36, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,176,32,0.45)";
  ctx.stroke();
  ctx.fillStyle = C.flame;
  ctx.textBaseline = "middle";
  ctx.fillText(tag, W - 50 - tagW + 18, 75);
  ctx.letterSpacing = "0px";

  // Tagline (from kupi-dzon.onrender.com)
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 54px ${display}`;
  ctx.fillStyle = C.paper;
  ctx.fillText("মুখস্থ নয়, বুঝে শেখো", 50, 205);
  ctx.fillStyle = C.flame;
  ctx.fillText("বুঝলে আলো জ্বলে।", 50, 270);

  ctx.font = `400 21px ${sans}`;
  ctx.fillStyle = "rgba(251,245,233,0.72)";
  ctx.fillText("Your own AI teacher for Class 6–10 · Bangla & English", 50, 328);

  // Contact rows
  const rows: [readonly string[], string][] = [
    [ICONS.mail, site.contact.email],
    [ICONS.phone, site.contact.phoneLabelIntl],
    [ICONS.globe, site.mainUrlLabel],
  ];
  rows.forEach(([icon, text], i) => {
    const y = 370 + i * 48;
    ctx.fillStyle = "rgba(255,176,32,0.14)";
    ctx.beginPath();
    ctx.arc(50 + 19, y + 19, 19, 0, Math.PI * 2);
    ctx.fill();
    drawIcon(ctx, icon, 50 + 9, y + 9, 20);
    ctx.font = `500 23px ${sans}`;
    ctx.fillStyle = C.paper;
    ctx.textBaseline = "middle";
    ctx.fillText(text, 50 + 56, y + 21);
    ctx.textBaseline = "alphabetic";
  });

  // Mascot
  const mascotH = 360;
  const mascotW = (mascot.width / mascot.height) * mascotH;
  ctx.drawImage(mascot, W - mascotW - 40, H - 76 - mascotH + 18, mascotW, mascotH);

  // Bottom band
  const bandH = 76;
  const band = ctx.createLinearGradient(0, 0, W, 0);
  band.addColorStop(0, C.flame);
  band.addColorStop(1, "#FFC24D");
  ctx.fillStyle = band;
  ctx.fillRect(0, H - bandH, W, bandH);
  ctx.fillStyle = C.ember;
  ctx.fillRect(0, H - bandH, W, 4);

  ctx.textBaseline = "middle";
  ctx.fillStyle = C.night;
  ctx.font = `800 26px ${display}`;
  const name = opts.name?.trim();
  const message = name ? `Thank you, ${name}! We'll be in touch soon.` : "Learn by understanding, not memorising.";
  ctx.fillText(fitText(ctx, message, W - 50 - 260), 50, H - bandH / 2 + 3);

  ctx.font = `500 15px ${mono}`;
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(22,22,58,0.75)";
  ctx.fillText(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }), W - 50, H - bandH / 2 + 2);
  ctx.textAlign = "left";
}
