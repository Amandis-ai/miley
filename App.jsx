import React, { useState, useRef, useEffect, useCallback } from "react";

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; min-width: 0; overflow-wrap: break-word; word-break: break-word; }
html, body { overflow-x: hidden; margin: 0; padding: 0; }
img, svg, video, canvas { max-width: 100%; }
input, select, textarea, button { max-width: 100%; }
.app-viewport-frame { height: 100vh; height: 100dvh; }
input.year-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; border-radius: 999px; background: #16233D; outline: none; }
input.year-slider::-webkit-slider-runnable-track { height: 6px; border-radius: 999px; background: #16233D; }
input.year-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #16233D; border: 3px solid #fff; box-shadow: 0 1px 4px rgba(22,35,61,0.4); margin-top: -7px; cursor: pointer; transition: background 0.15s ease; }
input.year-slider::-moz-range-track { height: 6px; border-radius: 999px; background: #16233D; }
input.year-slider::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: #16233D; border: 3px solid #fff; box-shadow: 0 1px 4px rgba(22,35,61,0.4); cursor: pointer; transition: background 0.15s ease; }
input.year-slider:active::-webkit-slider-thumb { background: #4A6FA5; }
input.year-slider:active::-moz-range-thumb { background: #4A6FA5; }
input.year-slider:disabled { opacity: 0.4; }
@keyframes idleBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
.figure-bounce { transform-box: fill-box; animation: idleBounce 2.6s ease-in-out infinite; }
`;
const colors = {
  ink: "#16233D", paper: "#F3ECDA", paperDim: "#EAE1CB", coral: "#FF6A4D",
  lagoon: "#1E8A82", stampRed: "#B33F3F", ice: "#5B8DB8", sand: "#C9A66B",
  purple: "#7B5EA7", charcoal: "#2B2A28",
};
const serif = "'Fraunces', serif", sans = "'Public Sans', sans-serif", mono = "'IBM Plex Mono', monospace";

function shade(hex, percent) {
  const f = parseInt(hex.slice(1), 16), t = percent < 0 ? 0 : 255, p = Math.abs(percent);
  const R = f >> 16, G = (f >> 8) & 0x00FF, B = f & 0x0000FF;
  return "#" + (0x1000000 + (Math.round((t - R) * p) + R) * 0x10000 + (Math.round((t - G) * p) + G) * 0x100 + (Math.round((t - B) * p) + B)).toString(16).slice(1);
}
function hashString(str) {
  let h = 0;
  for (let i = 0; i < Math.min(str.length, 20000); i += 7) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function dateRange(start, end) {
  const days = []; let d = new Date(start); const last = new Date(end);
  while (d <= last) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
  return days;
}
function fmtDate(d) { return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
function groupPhotosByDay(trip) {
  const days = trip.days || [];
  const groups = days.map((d) => ({ day: d, photos: (trip.photos || []).filter((p) => p.dayId === d.id) }));
  const undated = (trip.photos || []).filter((p) => !p.dayId);
  return { groups, undated };
}
function formatDDMMYY(date) {
  const dd = String(date.getDate()).padStart(2, "0"), mm = String(date.getMonth() + 1).padStart(2, "0"), yy = String(date.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

/* ===========================================================
   AVATAR DATA + SVG
=========================================================== */
const SKIN_TONES = ["#FCEAD9", "#F6DCC4", "#EFC7A0", "#D9A876", "#C6A15B", "#B98354", "#9A6339", "#6E4529", "#4A2E1C"];
const HAIR_COLORS = ["#2E2A27", "#4A342A", "#8B5E34", "#E4C46B", "#E9E4D8", "#A65B3A", "#C1502E", "#BFC3C7"];
const HAIRSTYLES = ["buzz", "short", "bob", "bun", "long", "twintails", "afro"];
const EYE_STYLES = ["Round", "Almond", "Happy", "Sleepy", "Sparkly"];
const BROW_STYLES = ["Curved", "Thin", "Thick", "Raised"];
const EYE_COLORS = ["#6B4226", "#4E93D9", "#5B9A5E", "#A67C4D"];
const GLASSES = [{ key: "none", label: "None" }, { key: "round", label: "Round" }, { key: "square", label: "Square" }, { key: "sun", label: "Sunglasses" }];
const HATS = [{ key: "none", label: "None" }, { key: "cap", label: "Cap" }, { key: "beanie", label: "Beanie" }, { key: "sun", label: "Sun Hat" }, { key: "bucket", label: "Bucket Hat" }];
const OUTFIT_COLORS = [
  { name: "Coral", hex: "#FF6A4D" }, { name: "Lagoon", hex: "#1E8A82" }, { name: "Sand", hex: "#C9A66B" },
  { name: "Sky", hex: "#5B8DB8" }, { name: "Lavender", hex: "#9E8FC1" }, { name: "Charcoal", hex: "#3A4568" },
];
const ACCESSORY_OPTIONS = [
  { key: "backpack", label: "Backpack", emoji: "🎒", x: 34, y: 158, size: 30, behind: true },
  { key: "camera", label: "Camera", emoji: "📷", x: 100, y: 176, size: 24 },
  { key: "luggage", label: "Luggage", emoji: "🧳", x: 168, y: 230, size: 32 },
  { key: "passport", label: "Passport", emoji: "🛂", x: 150, y: 204, size: 20 },
  { key: "waterbottle", label: "Water Bottle", emoji: "🥤", x: 34, y: 214, size: 24 },
  { key: "headphones", label: "Headphones", emoji: "🎧", x: 100, y: 40, size: 30 },
];
const BACKGROUNDS = [
  { key: "peach", label: "Peach", hex: "#FBD9C5" }, { key: "mint", label: "Mint", hex: "#C9EAE0" },
  { key: "sky", label: "Sky", hex: "#CFE6F5" }, { key: "none", label: "None", hex: null },
];
const COUNTRY_OUTFITS = [
  { key: "japan", country: "Japan", flag: "🇯🇵", color: "#B33F3F", zigzag: false, theme: [{ emoji: "🎌", x: 142, y: 20, size: 22 }] },
  { key: "iceland", country: "Iceland", flag: "🇮🇸", color: "#5B8DB8", zigzag: false, theme: [{ emoji: "🧣", x: 100, y: 130, size: 26 }] },
  { key: "hawaii", country: "Hawaii", flag: "🌺", color: "#FF6A4D", zigzag: true, theme: [{ emoji: "🌺", x: 142, y: 24, size: 24 }, { emoji: "🥥", x: 74, y: 168, size: 18 }, { emoji: "🥥", x: 126, y: 168, size: 18 }] },
  { key: "portugal", country: "Portugal", flag: "🇵🇹", color: "#2E7D5B", zigzag: false, theme: [] },
  { key: "thailand", country: "Thailand", flag: "🇹🇭", color: "#C9A66B", zigzag: false, theme: [] },
];
const CX = 100, HEAD_CY = 96, HEAD_R = 58, EYE_Y = 98, EYE_LX = 78, EYE_RX = 122, BROW_Y = 76, MOUTH_Y = HEAD_CY + 26;

function EyeShape({ style, cx, cy, eyeColor }) {
  if (style === "Happy") return <path d={`M ${cx - 11} ${cy + 3} Q ${cx} ${cy - 9} ${cx + 11} ${cy + 3}`} stroke={colors.charcoal} strokeWidth="3.2" fill="none" strokeLinecap="round" />;
  const ry = style === "Sleepy" ? 5 : style === "Almond" ? 9 : 13;
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx="11" ry={ry} fill="#fff" />
      <circle cx={cx} cy={cy} r="7" fill={eyeColor} /><circle cx={cx} cy={cy} r="3" fill="#1a1a1a" />
      <circle cx={cx - 3} cy={cy - 4} r="2" fill="#fff" />
      {style === "Sparkly" && <circle cx={cx + 3} cy={cy + 3} r="1.3" fill="#fff" />}
    </g>
  );
}
function BrowShape({ style, cx, y, hairColor, side }) {
  if (style === "Curved") return <path d={`M ${cx - 10} ${y + 4} Q ${cx} ${y - 4} ${cx + 10} ${y + 4}`} stroke={shade(hairColor, -0.1)} strokeWidth="4" fill="none" strokeLinecap="round" />;
  const angle = style === "Raised" ? (side === "l" ? -10 : 10) : 0;
  const yy = style === "Raised" ? y - 6 : y;
  const w = style === "Thick" ? 22 : 16, h = style === "Thick" ? 6 : 4;
  return <rect x={cx - w / 2} y={yy} width={w} height={h} rx={h / 2} fill={shade(hairColor, -0.1)} transform={`rotate(${angle} ${cx} ${yy})`} />;
}
function HairLayer({ hairstyle, hairFill }) {
  const capTop = <ellipse cx={CX} cy={HEAD_CY - HEAD_R * 0.42} rx={HEAD_R + 3} ry={HEAD_R * 0.56} fill={hairFill} />;
  switch (hairstyle) {
    case "buzz": return <ellipse cx={CX} cy={HEAD_CY - HEAD_R * 0.5} rx={HEAD_R + 1} ry={HEAD_R * 0.3} fill={hairFill} opacity="0.85" />;
    case "short": return <ellipse cx={CX} cy={HEAD_CY - HEAD_R * 0.46} rx={HEAD_R + 2} ry={HEAD_R * 0.42} fill={hairFill} />;
    case "bob": return (<>{capTop}<rect x={CX - HEAD_R - 3} y={HEAD_CY - 6} width="16" height="46" rx="8" fill={hairFill} /><rect x={CX + HEAD_R - 13} y={HEAD_CY - 6} width="16" height="46" rx="8" fill={hairFill} /></>);
    case "bun": return (<>{capTop}<circle cx={CX} cy={HEAD_CY - HEAD_R - 6} r="14" fill={hairFill} /></>);
    case "long": return (<>{capTop}<rect x={CX - HEAD_R - 5} y={HEAD_CY - 10} width="17" height="100" rx="8.5" fill={hairFill} /><rect x={CX + HEAD_R - 12} y={HEAD_CY - 10} width="17" height="100" rx="8.5" fill={hairFill} /></>);
    case "twintails": return (<>{capTop}<circle cx={CX - HEAD_R - 2} cy={HEAD_CY + 10} r="15" fill={hairFill} /><circle cx={CX + HEAD_R + 2} cy={HEAD_CY + 10} r="15" fill={hairFill} /></>);
    case "afro": return <circle cx={CX} cy={HEAD_CY - HEAD_R * 0.25} r={HEAD_R + 20} fill={hairFill} />;
    default: return capTop;
  }
}
function AvatarSVG({ av, scale = 1 }) {
  const torsoW = 92, torsoX = CX - torsoW / 2, torsoY = 156, torsoH = 68;
  const holiday = COUNTRY_OUTFITS.find((c) => c.key === av.holiday);
  const outfitColor = holiday ? holiday.color : av.outfitColor;
  const zigzag = holiday ? holiday.zigzag : false;
  const themeAcc = holiday ? holiday.theme : [];
  const outfitId = "of" + outfitColor.replace("#", "");
  const skinId = "sk" + av.skin.replace("#", "");
  const bg = BACKGROUNDS.find((b) => b.key === av.background) || BACKGROUNDS[0];
  const behindAcc = av.accessories.filter((k) => ACCESSORY_OPTIONS.find((a) => a.key === k)?.behind);
  const frontAcc = av.accessories.filter((k) => !behindAcc.includes(k));
  const getAcc = (k) => ACCESSORY_OPTIONS.find((a) => a.key === k);
  return (
    <svg width={240 * scale} height={280 * scale} viewBox="0 0 200 240" style={{ display: "block" }}>
      <defs>
        <radialGradient id={skinId} cx="35%" cy="30%" r="75%"><stop offset="0%" stopColor={shade(av.skin, 0.22)} /><stop offset="100%" stopColor={shade(av.skin, -0.05)} /></radialGradient>
        <linearGradient id={outfitId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={shade(outfitColor, 0.18)} /><stop offset="100%" stopColor={shade(outfitColor, -0.1)} /></linearGradient>
      </defs>
      {bg.hex && <rect x="0" y="0" width="200" height="240" fill={bg.hex} />}
      <ellipse cx={CX} cy="228" rx="40" ry="7" fill={colors.ink} opacity="0.13" />
      <g className="figure-bounce">
        {behindAcc.map((k) => { const a = getAcc(k); return <text key={k} x={a.x} y={a.y} fontSize={a.size} textAnchor="middle">{a.emoji}</text>; })}
        <rect x={CX - 22} y="182" width="15" height="38" rx="7.5" fill={`url(#${skinId})`} />
        <rect x={CX + 7} y="182" width="15" height="38" rx="7.5" fill={`url(#${skinId})`} />
        <rect x={CX - 25} y="216" width="22" height="10" rx="5" fill="#3B2A20" opacity="0.85" />
        <rect x={CX + 3} y="216" width="22" height="10" rx="5" fill="#3B2A20" opacity="0.85" />
        <ellipse cx={torsoX - 6} cy="184" rx="12" ry="24" fill={`url(#${skinId})`} transform={`rotate(-14 ${torsoX - 6} 160)`} />
        <ellipse cx={torsoX + torsoW + 6} cy="184" rx="12" ry="24" fill={`url(#${skinId})`} transform={`rotate(14 ${torsoX + torsoW + 6} 160)`} />
        {zigzag ? (
          <polygon points={`${torsoX},${torsoY} ${torsoX + torsoW},${torsoY} ${torsoX + torsoW * 0.96},${torsoY + torsoH * 0.82} ${torsoX + torsoW * 0.84},${torsoY + torsoH} ${torsoX + torsoW * 0.72},${torsoY + torsoH * 0.82} ${torsoX + torsoW * 0.6},${torsoY + torsoH} ${torsoX + torsoW * 0.48},${torsoY + torsoH * 0.82} ${torsoX + torsoW * 0.36},${torsoY + torsoH} ${torsoX + torsoW * 0.24},${torsoY + torsoH * 0.82} ${torsoX + torsoW * 0.12},${torsoY + torsoH} ${torsoX + torsoW * 0.02},${torsoY + torsoH * 0.82}`} fill={`url(#${outfitId})`} />
        ) : (
          <rect x={torsoX} y={torsoY} width={torsoW} height={torsoH} rx="28" fill={`url(#${outfitId})`} />
        )}
        {themeAcc.filter((a) => a.y > 100).map((a, i) => <text key={i} x={a.x} y={a.y} fontSize={a.size} textAnchor="middle">{a.emoji}</text>)}
        {frontAcc.filter((k) => getAcc(k).y > 110).map((k) => { const a = getAcc(k); return <text key={k} x={a.x} y={a.y} fontSize={a.size} textAnchor="middle">{a.emoji}</text>; })}
        <circle cx={CX} cy={HEAD_CY} r={HEAD_R} fill={`url(#${skinId})`} />
        <ellipse cx={CX - 36} cy={HEAD_CY + 22} rx="12" ry="7" fill="#FF9E9E" opacity="0.45" />
        <ellipse cx={CX + 36} cy={HEAD_CY + 22} rx="12" ry="7" fill="#FF9E9E" opacity="0.45" />
        <BrowShape style={av.brow} cx={EYE_LX} y={BROW_Y} hairColor={av.hairColor} side="l" />
        <BrowShape style={av.brow} cx={EYE_RX} y={BROW_Y} hairColor={av.hairColor} side="r" />
        <EyeShape style={av.eyes} cx={EYE_LX} cy={EYE_Y} eyeColor={av.eyeColor} />
        <EyeShape style={av.eyes} cx={EYE_RX} cy={EYE_Y} eyeColor={av.eyeColor} />
        <path d={`M ${CX - 14} ${MOUTH_Y} Q ${CX} ${MOUTH_Y + 12} ${CX + 14} ${MOUTH_Y}`} stroke={colors.charcoal} strokeWidth="3" fill="none" strokeLinecap="round" />
        <HairLayer hairstyle={av.hairstyle} hairFill={av.hairColor} />
        {av.glasses !== "none" && (
          <g>
            {av.glasses === "sun" ? (<><rect x={EYE_LX - 15} y={EYE_Y - 10} width="30" height="20" rx="8" fill="#2B2A28" opacity="0.85" /><rect x={EYE_RX - 15} y={EYE_Y - 10} width="30" height="20" rx="8" fill="#2B2A28" opacity="0.85" /><rect x={EYE_LX + 12} y={EYE_Y - 2} width="20" height="3" fill="#2B2A28" opacity="0.85" /></>) : (
              <><rect x={EYE_LX - 14} y={EYE_Y - 12} width="28" height="24" rx={av.glasses === "round" ? 14 : 6} fill="none" stroke="#2B2A28" strokeWidth="3" /><rect x={EYE_RX - 14} y={EYE_Y - 12} width="28" height="24" rx={av.glasses === "round" ? 14 : 6} fill="none" stroke="#2B2A28" strokeWidth="3" /><rect x={EYE_LX + 14} y={EYE_Y - 2} width="16" height="3" fill="#2B2A28" /></>
            )}
          </g>
        )}
        {av.hat !== "none" && (
          <g>
            {av.hat === "cap" && (<><path d={`M ${CX - HEAD_R} ${HEAD_CY - HEAD_R * 0.55} A ${HEAD_R} ${HEAD_R} 0 0 1 ${CX + HEAD_R} ${HEAD_CY - HEAD_R * 0.55} L ${CX + HEAD_R - 6} ${HEAD_CY - HEAD_R * 0.15} L ${CX - HEAD_R + 6} ${HEAD_CY - HEAD_R * 0.15} Z`} fill={outfitColor} /><ellipse cx={CX + HEAD_R * 0.4} cy={HEAD_CY - HEAD_R * 0.1} rx="26" ry="8" fill={shade(outfitColor, -0.1)} /></>)}
            {av.hat === "beanie" && (<><path d={`M ${CX - HEAD_R - 2} ${HEAD_CY - HEAD_R * 0.35} A ${HEAD_R + 2} ${HEAD_R + 2} 0 0 1 ${CX + HEAD_R + 2} ${HEAD_CY - HEAD_R * 0.35} L ${CX + HEAD_R + 2} ${HEAD_CY - HEAD_R * 0.1} L ${CX - HEAD_R - 2} ${HEAD_CY - HEAD_R * 0.1} Z`} fill={outfitColor} /><circle cx={CX} cy={HEAD_CY - HEAD_R - 4} r="7" fill="#fff" opacity="0.85" /></>)}
            {av.hat === "sun" && (<><ellipse cx={CX} cy={HEAD_CY - HEAD_R * 0.3} rx={HEAD_R + 22} ry="10" fill="#E4C46B" /><ellipse cx={CX} cy={HEAD_CY - HEAD_R * 0.55} rx={HEAD_R * 0.75} ry={HEAD_R * 0.4} fill="#D9B45C" /></>)}
            {av.hat === "bucket" && (<><ellipse cx={CX} cy={HEAD_CY - HEAD_R * 0.35} rx={HEAD_R + 14} ry="9" fill={outfitColor} /><path d={`M ${CX - HEAD_R * 0.85} ${HEAD_CY - HEAD_R * 0.35} Q ${CX} ${HEAD_CY - HEAD_R * 1.15} ${CX + HEAD_R * 0.85} ${HEAD_CY - HEAD_R * 0.35} Z`} fill={shade(outfitColor, 0.1)} /></>)}
          </g>
        )}
        {themeAcc.filter((a) => a.y <= 100).map((a, i) => <text key={i} x={a.x} y={a.y} fontSize={a.size} textAnchor="middle">{a.emoji}</text>)}
        {frontAcc.filter((k) => getAcc(k).y <= 110).map((k) => { const a = getAcc(k); return <text key={k} x={a.x} y={a.y} fontSize={a.size} textAnchor="middle">{a.emoji}</text>; })}
      </g>
    </svg>
  );
}
const DEFAULT_AVATAR = {
  skin: SKIN_TONES[1], hairColor: HAIR_COLORS[0], hairstyle: "bob", eyes: "Happy", brow: "Curved",
  eyeColor: EYE_COLORS[0], outfitColor: OUTFIT_COLORS[0].hex, glasses: "none", hat: "none",
  background: "peach", accessories: [], holiday: null, aiAvatarUrl: null, floatingEmojis: [],
};

/* ===========================================================
   GLOBE
=========================================================== */
const GLOBE_SIZE = 190;
const PINS = [
  { name: "London", lon: 0, lat: 34 }, { name: "Tokyo", lon: 70, lat: 38 },
  { name: "Reykjavik", lon: 322, lat: 18 }, { name: "Honolulu", lon: 205, lat: 52 },
];
function ContinentsSVG({ w = GLOBE_SIZE, h = GLOBE_SIZE }) {
  return (
    <svg width={w} height={h} viewBox="0 0 200 200" style={{ display: "block" }}>
      <polygon points="18,35 45,25 60,40 55,70 35,85 15,65" fill="#6E8F57" opacity="0.92" />
      <polygon points="45,95 65,90 70,130 55,160 40,150 35,115" fill="#6E8F57" opacity="0.92" />
      <polygon points="100,25 120,20 125,40 110,50 95,42" fill="#6E8F57" opacity="0.92" />
      <polygon points="95,55 130,50 135,100 115,140 95,120 90,80" fill="#57734A" opacity="0.92" />
      <polygon points="135,20 190,15 195,70 160,95 130,70 125,40" fill="#57734A" opacity="0.92" />
      <polygon points="160,140 190,135 195,160 170,165 155,155" fill="#6E8F57" opacity="0.92" />
    </svg>
  );
}
function Globe({ rotation, onPointerDownRotate, onPinClick }) {
  const norm = (((rotation % 360) + 360) % 360) / 360;
  const scrollOffset = norm * GLOBE_SIZE;
  return (
    <div onMouseDown={onPointerDownRotate} onTouchStart={onPointerDownRotate} className="relative cursor-grab active:cursor-grabbing select-none shrink-0" style={{ width: GLOBE_SIZE, height: GLOBE_SIZE, borderRadius: "50%", boxShadow: "0 10px 24px rgba(22,35,61,0.3)" }}>
      <div className="absolute inset-0 rounded-full overflow-hidden">
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 32% 28%, #7FD4EA 0%, #2E86AB 48%, #123B57 100%)` }} />
        <div className="absolute top-0" style={{ display: "flex", height: GLOBE_SIZE, transform: `translateX(-${scrollOffset}px)` }}><ContinentsSVG /><ContinentsSVG /></div>
        {[20, 50, 80].map((pct, i) => <div key={i} className="absolute top-0 bottom-0 border-l border-white/20" style={{ left: `${pct}%` }} />)}
        <div className="absolute left-0 right-0 border-t border-white/20" style={{ top: "50%" }} />
        <div className="absolute rounded-full" style={{ width: 50, height: 34, top: 20, left: 26, background: "radial-gradient(circle, rgba(255,255,255,0.55), transparent 70%)" }} />
        <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, transparent 55%, rgba(10,20,40,0.55) 100%)" }} />
      </div>
      {PINS.map((pin) => {
        const angle = (((pin.lon + rotation) % 360) + 360) % 360, rad = (angle * Math.PI) / 180;
        const x = Math.sin(rad) * (GLOBE_SIZE * 0.42), depth = Math.cos(rad);
        const opacity = 0.35 + 0.65 * ((depth + 1) / 2), scale = 0.7 + 0.35 * ((depth + 1) / 2);
        return (
          <button key={pin.name} onClick={(e) => { e.stopPropagation(); onPinClick(pin); }} className="absolute flex flex-col items-center" style={{ left: `calc(50% + ${x}px)`, top: `${pin.lat}%`, transform: `translate(-50%, -50%) scale(${scale})`, opacity, zIndex: depth > 0 ? 20 : 5 }}>
            <div className="rounded-full" style={{ width: 10, height: 10, background: colors.coral, border: "2px solid #fff" }} />
            <span className="text-[9px] px-1 rounded mt-0.5 whitespace-nowrap" style={{ background: colors.ink, color: colors.paper, fontFamily: mono }}>{pin.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ===========================================================
   SHARED UI
=========================================================== */
function Chip({ active, onClick, disabled, children }) {
  return <button onClick={onClick} disabled={disabled} className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1" style={{ background: active ? colors.ink : colors.paperDim, color: active ? colors.paper : colors.charcoal, opacity: disabled ? 0.5 : 1 }}>{children}</button>;
}
function Swatch({ hex, active, onClick, label }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1">
      <div className="rounded-full" style={{ width: 26, height: 26, background: hex || "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 8px 8px", border: active ? `2px solid ${colors.coral}` : "2px solid transparent", boxShadow: "0 0 0 1px rgba(0,0,0,0.12)" }} />
      <span className="text-[9px]" style={{ color: colors.charcoal, opacity: 0.65 }}>{label}</span>
    </button>
  );
}
function Section({ title, children }) {
  return <div className="mb-5"><div className="text-xs uppercase tracking-wide mb-2" style={{ color: colors.charcoal, opacity: 0.6, fontFamily: mono }}>{title}</div>{children}</div>;
}
function Heart({ filled }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? colors.coral : "none"} stroke={filled ? colors.coral : colors.charcoal} strokeWidth="2"><path d="M12 21s-7.5-4.8-10-9.4C.5 8.2 2.6 4 6.6 4c2.2 0 3.7 1.2 5.4 3.2C13.7 5.2 15.2 4 17.4 4c4 0 6.1 4.2 4.6 7.6C19.5 16.2 12 21 12 21z" /></svg>;
}

/* ===========================================================
   VISITED COUNTRIES + PROFILE DATA
=========================================================== */
const VISITED_COUNTRIES = [
  { code: "JP", flag: "🇯🇵", name: "Japan", trips: 2, years: [2023, 2026] },
  { code: "IS", flag: "🇮🇸", name: "Iceland", trips: 1, years: [2026] },
  { code: "PT", flag: "🇵🇹", name: "Portugal", trips: 1, years: [2024] },
  { code: "TH", flag: "🇹🇭", name: "Thailand", trips: 3, years: [2022, 2023, 2025] },
  { code: "HI", flag: "🌺", name: "Hawaii", trips: 1, years: [2025] },
  { code: "PE", flag: "🇵🇪", name: "Peru", trips: 1, years: [2021] },
];
const TOTAL_COUNTRIES = 195;
function Badges({ countries, times, percent }) {
  const items = [
    { value: countries, label: "Countries" },
    { value: times, label: "Times Traveled" },
    { value: `${percent}%`, label: "of Earth" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 mb-5">
      {items.map((b, i) => (
        <div key={i} className="rounded-2xl py-3 text-center" style={{ background: "#fff", boxShadow: "0 2px 8px rgba(22,35,61,0.06)" }}>
          <div style={{ fontFamily: serif, color: colors.ink }} className="text-lg font-semibold">{b.value}</div>
          <div className="text-[9px] leading-tight px-1" style={{ color: colors.charcoal, opacity: 0.6 }}>{b.label}</div>
        </div>
      ))}
    </div>
  );
}
const MY_PROFILE_ID = "WF-3305";
const FRIEND_DIRECTORY = [
  {
    id: "WF-4821", name: "Priya Sharma", emoji: "🧕", countries: 9, followers: 210, timesTraveled: 14,
    trips: [
      { id: "f1", name: "Bali Escape", country: "Indonesia", days: [{ id: 1, date: "2026-02-10", city: "Ubud", items: [{ id: 1, name: "Rice terrace walk", category: "Park", hours: "Open 7:00–19:00", thumb: "🌳" }] }], photos: [{ id: 1, thumb: "🏝️", caption: "Rice terraces at golden hour", likes: 14, private: false }, { id: 2, thumb: "🛕", caption: "Uluwatu Temple", likes: 9, private: false }] },
      { id: "f2", name: "Family Trip — Kerala", country: "India", days: [{ id: 1, date: "2025-11-02", city: "Alleppey", items: [{ id: 2, name: "Backwaters cruise", category: "Landmark", hours: "Open 9:00–18:00", thumb: "🌉" }] }], photos: [{ id: 3, thumb: "🛶", caption: "Backwaters cruise", likes: 6, private: true }] },
    ],
  },
  {
    id: "WF-1190", name: "Sam Okafor", emoji: "🧑🏾", countries: 5, followers: 88, timesTraveled: 7,
    trips: [{ id: "f3", name: "Cape Town Road Trip", country: "South Africa", days: [{ id: 1, date: "2026-04-01", city: "Cape Town", items: [{ id: 3, name: "Table Mountain hike", category: "Viewpoint", hours: "Open 8:00–18:00", thumb: "🏔️" }] }], photos: [{ id: 4, thumb: "🏔️", caption: "Table Mountain", likes: 20, private: false }] }],
  },
  {
    id: "WF-7742", name: "Mei Lin", emoji: "👩🏻", countries: 12, followers: 540, timesTraveled: 20,
    trips: [
      { id: "f4", name: "Kyoto in Spring", country: "Japan", days: [{ id: 1, date: "2026-03-30", city: "Kyoto", items: [{ id: 4, name: "Maruyama Park sunrise", category: "Park", hours: "Open 24 hours", thumb: "🌸" }] }], photos: [{ id: 5, thumb: "🌸", caption: "Cherry blossoms at Maruyama Park", likes: 31, private: false, dayId: 1 }], reel: { music: "cinematic", clip: [{ thumb: "🌸", private: false }, { thumb: "⛩️", private: false }, { thumb: "🍡", private: false }] } },
      { id: "f5", name: "Solo trip — Iceland", country: "Iceland", days: [{ id: 1, date: "2026-01-15", city: "Jökulsárlón", items: [{ id: 5, name: "Glacier lagoon boat tour", category: "Viewpoint", hours: "Open 9:00–17:00", thumb: "🧊" }] }], photos: [{ id: 6, thumb: "🧊", caption: "Glacier lagoon", likes: 18, private: true }] },
    ],
  },
];

/* ===========================================================
   PROFILE MODAL + CHAT
=========================================================== */
function ProfileModal({ person, self, status, onToggleFollow, onToggleFriend, onClose, onOpenChat, onViewProfile }) {
  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(22,35,61,0.5)", overflowX: "hidden" }}>
      <div className="w-full max-w-[460px] sm:max-w-[640px] lg:max-w-[820px] rounded-t-3xl" style={{ background: colors.paper, maxHeight: "88%" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${colors.ink}15` }}>
          <div>
            <span style={{ fontFamily: serif, color: colors.ink }} className="text-lg font-semibold">{person.name}</span>
            <div className="text-[10px]" style={{ color: colors.charcoal, opacity: 0.5, fontFamily: mono }}>{person.id}</div>
          </div>
          <button onClick={onClose} className="text-xl">✕</button>
        </div>
        <div className="px-5 lg:px-8 py-4">
          <Badges countries={person.countries} times={person.timesTraveled ?? person.countries} percent={Math.round((person.countries / TOTAL_COUNTRIES) * 100)} />
          {self && (
            <p className="text-[11px] text-center mb-3 px-4" style={{ color: colors.charcoal, opacity: 0.55 }}>This is how others see your public profile.</p>
          )}
          {!self && (
            <>
              <div className="flex gap-2 mb-1.5">
                <button onClick={onToggleFollow} className="flex-1 py-2.5 rounded-full text-sm font-semibold" style={{ background: status === "following" ? colors.paperDim : colors.lagoon, color: status === "following" ? colors.ink : "#fff" }}>{status === "following" ? "Following" : "🌐 Follow"}</button>
                <button onClick={onToggleFriend} className="flex-1 py-2.5 rounded-full text-sm font-semibold" style={{ background: status === "pending" || status === "friends" ? colors.paperDim : colors.coral, color: status === "pending" || status === "friends" ? colors.ink : "#fff" }}>{status === "pending" ? "Requested" : status === "friends" ? "Friends ✓" : "➕ Add friend"}</button>
              </div>
              <p className="text-[11px] mb-4 text-center" style={{ color: colors.charcoal, opacity: 0.55 }}>Following sees public trips & albums. Friends also see private ones. You can only be in one list at a time.</p>
              <button onClick={() => onOpenChat(person)} className="w-full py-2.5 rounded-full text-sm font-semibold mb-3" style={{ background: colors.ink, color: colors.paper }}>💬 Message</button>
            </>
          )}
          <button onClick={() => onViewProfile && onViewProfile()} className="w-full py-2.5 rounded-full text-sm font-semibold mb-5" style={{ background: self ? colors.ink : colors.paperDim, color: self ? colors.paper : colors.ink }}>📖 {self ? "View My Profile" : "View Profile"}</button>
        </div>
      </div>
    </div>
  );
}
function ChatScreen({ person, onBack }) {
  const [messages, setMessages] = useState([{ from: "them", text: `Hey! Saw you were traveling recently 👀` }, { from: "you", text: "Yes! Just got back, it was amazing." }]);
  const [draft, setDraft] = useState("");
  const send = () => { if (!draft.trim()) return; setMessages((m) => [...m, { from: "you", text: draft.trim() }]); setDraft(""); };
  return (
    <div className="absolute inset-0 z-50 flex justify-center" style={{ background: "rgba(22,35,61,0.5)", overflowX: "hidden", width: "100%" }}>
      <div className="max-w-[460px] sm:max-w-[640px] lg:max-w-[820px] flex flex-col" style={{ background: colors.paper, height: "100%", minHeight: 0, width: "100%", boxSizing: "border-box", overflowX: "hidden" }}>
        <div className="flex items-center gap-3 px-5 pt-7 pb-3" style={{ borderBottom: `1px solid ${colors.ink}15`, width: "100%", boxSizing: "border-box", overflowX: "hidden" }}>
          <button onClick={onBack} className="text-xl" style={{ color: colors.ink }}>←</button>
          <div className="flex items-center justify-center rounded-full text-base" style={{ width: 34, height: 34, background: colors.paperDim }}>{person.emoji || "🙂"}</div>
          <span style={{ fontFamily: serif, color: colors.ink }} className="text-lg font-semibold">{person.name}</span>
        </div>
        <div className="flex-1 px-5 py-4 flex flex-col gap-2" style={{ minHeight: 0, overflowY: "auto", overflowX: "hidden", width: "100%", boxSizing: "border-box" }}>
          {messages.map((m, i) => <div key={i} className="max-w-[75%] px-3 py-2 rounded-2xl text-sm" style={{ alignSelf: m.from === "you" ? "flex-end" : "flex-start", background: m.from === "you" ? colors.coral : "#fff", color: m.from === "you" ? "#fff" : colors.charcoal }}>{m.text}</div>)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 20, paddingRight: 20, paddingTop: 12, paddingBottom: 12, borderTop: `1px solid ${colors.ink}15`, width: "100%", boxSizing: "border-box" }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a message..." className="rounded-full text-sm border outline-none" style={{ borderColor: colors.ink + "25", flex: "1 1 auto", minWidth: 0, width: "100%", padding: "8px 12px", boxSizing: "border-box" }} />
          <button onClick={send} className="rounded-full flex items-center justify-center text-white" style={{ width: 38, height: 38, minWidth: 38, flexShrink: 0, background: colors.ink }}>➤</button>
        </div>
      </div>
    </div>
  );
}

/* ===========================================================
   HOME TAB
=========================================================== */
const SPEECH_LIMIT = 60;
const AVATAR_COOLDOWN_MS = 36 * 60 * 60 * 1000; // 36 hours
function formatCooldownRemaining(ms) {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
const TRAVEL_EMOJIS = ["✈️", "🌴", "🧳", "📸", "🗺️", "⛱️", "🏔️", "🎒", "🚂", "🛳️", "🌍", "🧭", "🎫", "🚗", "🏕️", "🍹"];
const MAX_FLOATING_EMOJIS = 4;
function FloatingEmojis({ emojis }) {
  if (!emojis || emojis.length === 0) return null;
  const positions = [
    { top: "-4%", left: "12%" }, { top: "-14%", left: "50%" }, { top: "-4%", left: "88%" }, { top: "16%", left: "97%" },
  ];
  return (
    <>
      {emojis.slice(0, MAX_FLOATING_EMOJIS).map((e, i) => (
        <span key={i} className="absolute figure-bounce" style={{ ...positions[i % positions.length], transform: "translate(-50%,-50%)", fontSize: 22, animationDelay: `${i * 0.3}s`, zIndex: 20, filter: "drop-shadow(0 2px 3px rgba(22,35,61,0.25))" }}>{e}</span>
      ))}
    </>
  );
}
function AvatarDisplay({ av, size = 140, svgScale = 0.8, rounded = "rounded-2xl" }) {
  const isAi = !!av.aiAvatarUrl;
  const w = isAi ? size : 240 * svgScale;
  const h = isAi ? size : 280 * svgScale;
  return (
    <div className="relative inline-block" style={{ width: w, height: h }}>
      {isAi ? (
        <img src={av.aiAvatarUrl} alt="Your avatar" className={rounded} style={{ width: size, height: size, objectFit: "cover" }} />
      ) : (
        <AvatarSVG av={av} scale={svgScale} />
      )}
      <FloatingEmojis emojis={av.floatingEmojis} />
    </div>
  );
}
function AiAvatarSection({ av, setAv }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [, forceTick] = useState(0);
  const fileInputRef = useRef(null);

  const usedThisSession = sessionStorage.getItem("wf_avatar_gen_session") === "1";
  const lastGenAt = parseInt(localStorage.getItem("wf_avatar_last_gen") || "0", 10);
  const cooldownRemaining = Math.max(0, AVATAR_COOLDOWN_MS - (Date.now() - lastGenAt));
  const blocked = usedThisSession || cooldownRemaining > 0;

  const generate = async (file) => {
    if (!file || blocked) return;
    setLoading(true); setError("");
    try {
      const { base64, mediaType } = await fileToBase64(file);
      const res = await fetch("/api/generate-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: mediaType }),
      });
      const raw = await res.text();
      let data;
      try { data = JSON.parse(raw); } catch { data = { error: `The server didn't return a valid response (status ${res.status}). This usually means the generate-avatar function crashed or isn't deployed correctly — check Vercel's Functions logs for details.` }; }
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setAv((s) => ({ ...s, aiAvatarUrl: data.avatarDataUrl }));
      sessionStorage.setItem("wf_avatar_gen_session", "1");
      localStorage.setItem("wf_avatar_last_gen", String(Date.now()));
      forceTick((t) => t + 1);
    } catch (e) {
      setError(e.message || "Couldn't generate an avatar. Try a different photo.");
    }
    setLoading(false);
  };

  return (
    <Section title="✨ AI Avatar — generated from your photo">
      <input ref={fileInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => generate(e.target.files?.[0])} />
      {error && <NoticeBanner notice={{ type: "error", text: error }} />}
      {blocked && !loading && (
        <NoticeBanner notice={{ type: "error", text: usedThisSession && cooldownRemaining <= 0 ? "You've used your generation for this session. Come back next visit." : `You can generate again in ${formatCooldownRemaining(cooldownRemaining)}.` }} />
      )}
      <div className="flex gap-2 mb-1">
        <button onClick={() => fileInputRef.current?.click()} disabled={loading || blocked} className="flex-1 py-2.5 rounded-xl text-xs font-semibold" style={{ background: colors.ink, color: colors.paper, opacity: loading || blocked ? 0.5 : 1 }}>
          {loading ? "Generating…" : av.aiAvatarUrl ? "📷 Regenerate from new photo" : "📷 Generate from a photo"}
        </button>
        {av.aiAvatarUrl && (
          <button onClick={() => setAv((s) => ({ ...s, aiAvatarUrl: null }))} disabled={loading} className="px-3 py-2.5 rounded-xl text-xs font-semibold" style={{ background: colors.paperDim, color: colors.charcoal }}>Remove</button>
        )}
      </div>
      <p className="text-[10px]" style={{ color: colors.charcoal, opacity: 0.5 }}>Limited to 1 generation per visit, and once every 36 hours. Uses AI image generation on a photo you choose, billed to the connected OpenAI account.</p>
    </Section>
  );
}
function AccessorizePanel({ av, setAv, onClose }) {
  const toggleEmoji = (e) => setAv((s) => {
    if (s.floatingEmojis.includes(e)) return { ...s, floatingEmojis: s.floatingEmojis.filter((x) => x !== e) };
    if (s.floatingEmojis.length >= MAX_FLOATING_EMOJIS) return s;
    return { ...s, floatingEmojis: [...s.floatingEmojis, e] };
  });
  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(22,35,61,0.5)", overflowX: "hidden" }}>
      <div className="w-full max-w-[460px] sm:max-w-[640px] lg:max-w-[820px] rounded-t-3xl px-5 py-5" style={{ background: colors.paper, maxHeight: "85%", overflowY: "auto" }}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontFamily: serif, color: colors.ink }} className="text-lg font-semibold">Customize</span>
          <button onClick={onClose} className="text-xl">✕</button>
        </div>
        <div className="flex justify-center mb-4 rounded-2xl py-3" style={{ background: colors.paperDim }}>
          <AvatarDisplay av={av} size={140} svgScale={0.8} />
        </div>
        <p className="text-[11px] mb-4 text-center" style={{ color: colors.charcoal, opacity: 0.5 }}>{av.aiAvatarUrl ? "Using your AI-generated avatar." : "Your look was generated from your one-time facial scan."}</p>
        <AiAvatarSection av={av} setAv={setAv} />
        <Section title="✈️ Travel Emoticons — hover over your avatar">
          <div className="flex flex-wrap gap-2">
            {TRAVEL_EMOJIS.map((e) => (
              <button key={e} onClick={() => toggleEmoji(e)} disabled={!av.floatingEmojis.includes(e) && av.floatingEmojis.length >= MAX_FLOATING_EMOJIS} className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: av.floatingEmojis.includes(e) ? colors.ink : colors.paperDim, opacity: !av.floatingEmojis.includes(e) && av.floatingEmojis.length >= MAX_FLOATING_EMOJIS ? 0.4 : 1 }}>{e}</button>
            ))}
          </div>
          <p className="text-[10px] mt-2" style={{ color: colors.charcoal, opacity: 0.5 }}>Pick up to {MAX_FLOATING_EMOJIS}. They'll float above your avatar wherever it appears.</p>
        </Section>
        <button onClick={onClose} className="w-full py-3 rounded-full text-sm font-semibold mt-2" style={{ background: colors.coral, color: "#fff" }}>Done</button>
      </div>
    </div>
  );
}
function HomeTab({ av, setAv, badgeStats, onOpenSelfProfile, onViewProfile }) {
  const [speech, setSpeech] = useState("Hey there! Just came back from London!");
  const [editing, setEditing] = useState(false);
  const [draftSpeech, setDraftSpeech] = useState(speech);
  const [rotation, setRotation] = useState(20);
  const [showCustomize, setShowCustomize] = useState(false);
  const dragRef = useRef({ dragging: false, lastX: 0 });
  const autoRotateRef = useRef(null);
  const startAutoRotate = useCallback(() => { clearInterval(autoRotateRef.current); autoRotateRef.current = setInterval(() => setRotation((r) => r + 0.15), 40); }, []);
  useEffect(() => { startAutoRotate(); return () => clearInterval(autoRotateRef.current); }, [startAutoRotate]);
  const getClientX = (e) => (e.touches ? e.touches[0].clientX : e.clientX);
  const onPointerMove = useCallback((e) => { if (!dragRef.current.dragging) return; const x = getClientX(e); const delta = x - dragRef.current.lastX; dragRef.current.lastX = x; setRotation((r) => r + delta * 0.6); }, []);
  const onPointerUp = useCallback(() => { dragRef.current.dragging = false; window.removeEventListener("mousemove", onPointerMove); window.removeEventListener("mouseup", onPointerUp); window.removeEventListener("touchmove", onPointerMove); window.removeEventListener("touchend", onPointerUp); setTimeout(startAutoRotate, 600); }, [onPointerMove, startAutoRotate]);
  const onPointerDownRotate = (e) => { dragRef.current = { dragging: true, lastX: getClientX(e) }; clearInterval(autoRotateRef.current); window.addEventListener("mousemove", onPointerMove); window.addEventListener("mouseup", onPointerUp); window.addEventListener("touchmove", onPointerMove); window.addEventListener("touchend", onPointerUp); };
  const onPinClick = (pin) => { const text = `Hey there! Just came back from ${pin.name}!`.slice(0, SPEECH_LIMIT); setSpeech(text); setDraftSpeech(text); };
  const saveSpeech = () => { setSpeech(draftSpeech.trim().slice(0, SPEECH_LIMIT) || speech); setEditing(false); };

  return (
    <div className="px-5 lg:px-8">
      <div className="flex items-center justify-between pt-2 pb-2">
        <div>
          <h1 style={{ fontFamily: serif, color: colors.ink }} className="text-2xl font-semibold">Your Traveler</h1>
          <p className="text-xs mt-1" style={{ color: colors.charcoal, opacity: 0.55 }}>{MY_PROFILE_ID}</p>
        </div>
      </div>
      <div className="relative rounded-3xl flex items-end justify-center gap-3 px-3" style={{ height: 250, background: `linear-gradient(180deg, ${colors.paperDim} 0%, ${colors.paperDim} 65%, ${colors.ink}0d 65%, ${colors.ink}0d 100%)` }}>
        <div className="relative flex flex-col items-center" style={{ width: 110 }}>
          <div className="absolute flex flex-col items-center" style={{ bottom: "calc(100% + 2px)", width: 140, left: "50%", transform: "translateX(-50%)" }}>
            {editing ? (
              <div className="rounded-2xl px-3 py-2 shadow-md w-full" style={{ background: "#fff" }}>
                <input autoFocus value={draftSpeech} maxLength={SPEECH_LIMIT} onChange={(e) => setDraftSpeech(e.target.value.slice(0, SPEECH_LIMIT))} onKeyDown={(e) => e.key === "Enter" && saveSpeech()} onBlur={saveSpeech} className="text-xs w-full outline-none" style={{ color: colors.charcoal }} />
              </div>
            ) : (
              <button onClick={() => { setDraftSpeech(speech); setEditing(true); }} className="text-center rounded-2xl px-3 py-2 shadow-md flex items-center gap-1" style={{ background: "#fff" }}><span className="text-xs" style={{ color: colors.charcoal }}>{speech}</span></button>
            )}
            <div style={{ width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "7px solid #fff", marginTop: -1 }} />
          </div>
          <button onClick={onOpenSelfProfile} className="relative hover:scale-105 transition-transform">
            <AvatarDisplay av={av} size={118} svgScale={0.62} rounded="rounded-full" />
          </button>
          <button onClick={() => setShowCustomize(true)} className="absolute rounded-full flex items-center justify-center" style={{ width: 26, height: 26, background: colors.ink, right: 6, bottom: 8, zIndex: 40 }}>
            <span style={{ fontSize: 12 }}>✏️</span>
          </button>
        </div>
        <div className="pb-2"><Globe rotation={rotation} onPointerDownRotate={onPointerDownRotate} onPinClick={onPinClick} /></div>
      </div>

      <div className="pt-5">
        <Badges countries={badgeStats.countries} times={badgeStats.times} percent={badgeStats.percent} />
        <button onClick={onViewProfile} className="w-full py-2.5 rounded-full text-sm font-semibold mb-6" style={{ background: colors.ink, color: colors.paper }}>📖 View My Profile</button>
      </div>

      {showCustomize && <AccessorizePanel av={av} setAv={setAv} onClose={() => setShowCustomize(false)} />}
    </div>
  );
}

/* ===========================================================
   TRIP MAP OVERVIEW (clustered pins, inspired by wanderlog)
=========================================================== */
const DAY_COLORS = [colors.lagoon, colors.coral, colors.purple, colors.ice, "#2E8B57", colors.stampRed];
function placePos(trip, day, item) {
  const h = hashString(trip.id + "-" + day.id + "-" + item.id);
  return { left: 10 + (h % 78), top: 8 + ((h >> 4) % 76) };
}
function dayCentroid(trip, day) {
  const pts = day.items.map((it) => placePos(trip, day, it));
  return { left: pts.reduce((s, p) => s + p.left, 0) / pts.length, top: pts.reduce((s, p) => s + p.top, 0) / pts.length };
}
function TripMapOverview({ trip, onSelectDay }) {
  const [selectedDayId, setSelectedDayId] = useState(null);
  const daysWithItems = trip.days.filter((d) => d.items.length > 0);
  const selectedIdx = daysWithItems.findIndex((d) => d.id === selectedDayId);
  const selectedDay = selectedIdx >= 0 ? daysWithItems[selectedIdx] : null;
  const selectedColor = selectedIdx >= 0 ? DAY_COLORS[selectedIdx % DAY_COLORS.length] : colors.coral;

  return (
    <div>
      <div className="relative rounded-2xl overflow-hidden mb-3" style={{ height: 300, background: `repeating-linear-gradient(0deg, ${colors.paperDim} 0px, ${colors.paperDim} 22px, #EFE6D2 22px, #EFE6D2 24px), repeating-linear-gradient(90deg, transparent 0px, transparent 22px, #00000006 22px, #00000006 24px)` }}>
        {daysWithItems.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-sm px-8 text-center" style={{ color: colors.charcoal, opacity: 0.5 }}>Add stops in the Itinerary tab to see them plotted here.</div>
        )}

        {!selectedDay ? (
          // Zoomed out: one clustered bubble per day, showing how many stops that day has
          daysWithItems.map((day, di) => {
            const pos = dayCentroid(trip, day);
            const color = DAY_COLORS[di % DAY_COLORS.length];
            return (
              <button key={day.id} onClick={() => setSelectedDayId(day.id)} className="absolute flex flex-col items-center" style={{ left: `${pos.left}%`, top: `${pos.top}%`, transform: "translate(-50%,-50%)", zIndex: 10 }}>
                <div className="rounded-full flex items-center justify-center text-sm font-bold shadow" style={{ width: 38, height: 38, background: color, color: "#fff", border: "3px solid #fff" }}>{day.items.length}</div>
                <span className="text-[9px] px-1 rounded mt-1" style={{ background: colors.ink, color: colors.paper, fontFamily: mono }}>Day {day.id}</span>
              </button>
            );
          })
        ) : (
          <>
            {/* other days fade to plain markers, for context */}
            {daysWithItems.filter((d) => d.id !== selectedDay.id).flatMap((day) => day.items.map((item) => {
              const pos = placePos(trip, day, item);
              return <div key={item.id} className="absolute rounded-full" style={{ left: `${pos.left}%`, top: `${pos.top}%`, width: 10, height: 10, background: colors.charcoal, opacity: 0.25, transform: "translate(-50%,-50%)" }} />;
            }))}

            {/* route line connecting the selected day's stops in itinerary order */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ pointerEvents: "none" }}>
              <polyline
                points={selectedDay.items.map((it) => { const p = placePos(trip, selectedDay, it); return `${p.left},${p.top}`; }).join(" ")}
                fill="none" stroke={selectedColor} strokeWidth="1.4" opacity="0.85" vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/* numbered pins for the selected day, in order */}
            {selectedDay.items.map((item, ii) => {
              const pos = placePos(trip, selectedDay, item);
              return (
                <div key={item.id} className="absolute flex flex-col items-center" style={{ left: `${pos.left}%`, top: `${pos.top}%`, transform: "translate(-50%,-50%)", zIndex: 10 }}>
                  <div className="rounded-full flex items-center justify-center text-xs font-bold shadow" style={{ width: 28, height: 28, background: selectedColor, color: "#fff", border: "2.5px solid #fff" }}>{ii + 1}</div>
                  <span className="text-[8px] px-1 rounded mt-0.5 max-w-[70px] truncate" style={{ background: colors.ink, color: colors.paper, fontFamily: mono }}>{item.name}</span>
                </div>
              );
            })}
          </>
        )}
      </div>

      {selectedDay ? (
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setSelectedDayId(null)} className="text-sm font-medium" style={{ color: colors.lagoon }}>← Zoom out to all days</button>
          <button onClick={() => onSelectDay(selectedDay.id)} className="text-sm font-semibold" style={{ color: colors.coral }}>Edit this day →</button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mb-4">
          {daysWithItems.map((day, di) => (
            <button key={day.id} onClick={() => setSelectedDayId(day.id)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px]" style={{ background: colors.paperDim, color: colors.charcoal }}>
              <div className="rounded-full" style={{ width: 8, height: 8, background: DAY_COLORS[di % DAY_COLORS.length] }} />
              Day {day.id} · {day.city} · {day.items.length} stop{day.items.length !== 1 ? "s" : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===========================================================
   TRIP ITINERARY (day cards, route line, reorder)
=========================================================== */
const CATEGORY_POOL = ["Theme park", "Shopping mall", "Museum", "Botanical garden", "Landmark", "Restaurant", "Temple", "Viewpoint", "Market", "Park"];
const HOURS_POOL = ["Open 8:30–21:30", "Open 9:00–18:00", "Open 10:00–22:00", "Closed Mon", "Open 24 hours", "Open 7:00–19:00"];
const THUMB_POOL = ["🏯", "🏰", "🎡", "🛍️", "🌸", "🏙️", "⛩️", "🖼️", "🌉", "🎢", "🏛️", "🌳"];
const RECOMMENDED_POOL = ["Old Town Market", "Sunset Viewpoint", "City Museum", "Riverside Walk", "Night Food Street"];

function mockPlace(name, id) {
  const h = hashString(name + id);
  return {
    id, name,
    category: CATEGORY_POOL[h % CATEGORY_POOL.length],
    hours: HOURS_POOL[(h >> 3) % HOURS_POOL.length],
    thumb: THUMB_POOL[(h >> 5) % THUMB_POOL.length],
  };
}
function mockTravel(nameA, nameB) {
  const h = hashString(nameA + "|" + nameB);
  const mins = 8 + (h % 45);
  const km = Math.max(1, Math.round(mins * (0.6 + ((h >> 4) % 10) / 10)));
  return { mins, km };
}
function suggestedWebsiteUrl(name) { return `https://www.google.com/search?q=${encodeURIComponent(name + " official site")}`; }
function aiOptimizeRoute(items) {
  // Mock nearest-neighbor heuristic using our mock travel-time function, so "optimize"
  // actually reduces total estimated travel time given the current stops.
  if (items.length < 3) return items;
  const remaining = [...items];
  const route = [remaining.shift()];
  while (remaining.length) {
    const last = route[route.length - 1];
    let bestIdx = 0, bestMins = Infinity;
    remaining.forEach((it, idx) => {
      const t = mockTravel(last.name, it.name).mins;
      if (t < bestMins) { bestMins = t; bestIdx = idx; }
    });
    route.push(remaining.splice(bestIdx, 1)[0]);
  }
  return route;
}
function routeTotals(items) {
  let mins = 0, km = 0;
  for (let i = 0; i < items.length - 1; i++) {
    const t = mockTravel(items[i].name, items[i + 1].name);
    mins += t.mins; km += t.km;
  }
  return { mins, km };
}

function DayCard({ day, allDays, onUpdateDay, onMoveItem, forceOpen }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (forceOpen) setOpen(true); }, [forceOpen]);
  const [placeName, setPlaceName] = useState("");
  const nextId = useRef(Date.now());

  const addPlace = (name) => {
    if (!name.trim()) return;
    const id = nextId.current++;
    onUpdateDay({ ...day, items: [...day.items, mockPlace(name.trim(), id)] });
    setPlaceName("");
  };
  const removeItem = (id) => onUpdateDay({ ...day, items: day.items.filter((it) => it.id !== id) });
  const move = (idx, dir) => { const items = [...day.items]; const j = idx + dir; if (j < 0 || j >= items.length) return; [items[idx], items[j]] = [items[j], items[idx]]; onUpdateDay({ ...day, items }); };
  const optimize = () => onUpdateDay({ ...day, items: aiOptimizeRoute(day.items) });
  const totals = routeTotals(day.items);

  return (
    <div id={`day-${day.id}`} className="mb-3 rounded-2xl overflow-hidden" style={{ background: "#fff", boxShadow: "0 2px 8px rgba(22,35,61,0.06)" }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3">
        <div className="text-left">
          <div className="text-sm font-semibold" style={{ color: colors.ink }}>Day {day.id} · {day.city}</div>
          <div className="text-[11px]" style={{ color: colors.charcoal, opacity: 0.5, fontFamily: mono }}>{day.date} · {day.items.length} stop{day.items.length !== 1 ? "s" : ""}</div>
        </div>
        <span style={{ color: colors.charcoal, opacity: 0.5 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4">
          {day.items.length > 1 && (
            <button onClick={optimize} className="flex items-center gap-1.5 text-sm font-semibold mb-3" style={{ color: colors.coral }}>
              🔀 Optimize route · <span style={{ fontWeight: 400, color: colors.charcoal, opacity: 0.7 }}>{totals.mins} mins, {totals.km} km</span>
            </button>
          )}

          {day.items.map((it, idx) => (
            <React.Fragment key={it.id}>
              <div className="rounded-2xl overflow-hidden mb-1" style={{ background: colors.paperDim }}>
                <div className="flex items-start gap-3 p-3">
                  <div className="rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" style={{ width: 24, height: 24, background: colors.coral, color: "#fff" }}>{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold" style={{ color: colors.ink }}>{it.name}</div>
                    {it.hours && <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: colors.charcoal, opacity: 0.6 }}>🕐 {it.hours}</div>}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {it.category && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: colors.paperDim, border: `1px solid ${colors.ink}20`, color: colors.charcoal }}>{it.category}</span>}
                      <a href={it.website || suggestedWebsiteUrl(it.name)} target="_blank" rel="noopener noreferrer" className="text-[10px]" style={{ color: colors.lagoon }}>🔗 Suggested website</a>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <button onClick={() => move(idx, -1)} className="text-xs" style={{ color: colors.charcoal, opacity: 0.4 }}>↑</button>
                      <button onClick={() => move(idx, 1)} className="text-xs" style={{ color: colors.charcoal, opacity: 0.4 }}>↓</button>
                      {allDays && allDays.length > 1 && (
                        <select
                          value={day.id}
                          onChange={(e) => onMoveItem(it, day.id, Number(e.target.value))}
                          className="text-[10px] rounded-md border px-1 py-0.5"
                          style={{ borderColor: colors.ink + "25", color: colors.charcoal, background: "#fff" }}
                        >
                          {allDays.map((d) => <option key={d.id} value={d.id}>{d.id === day.id ? "This day" : `→ Day ${d.id}`}</option>)}
                        </select>
                      )}
                      <button onClick={() => removeItem(it.id)} className="text-xs" style={{ color: colors.coral }}>Remove</button>
                    </div>
                  </div>
                  <div className="rounded-xl flex items-center justify-center text-3xl shrink-0" style={{ width: 64, height: 64, background: "#fff" }}>{it.thumb}</div>
                </div>
              </div>
              {idx < day.items.length - 1 && (() => {
                const t = mockTravel(it.name, day.items[idx + 1].name);
                return (
                  <div className="flex items-center gap-2 pl-3 py-1.5 text-xs" style={{ color: colors.charcoal, opacity: 0.6 }}>
                    <span>🚗</span><span>{t.mins} mins · {t.km} km</span>
                    <div className="flex-1 border-t border-dashed" style={{ borderColor: colors.ink + "25" }} />
                  </div>
                );
              })()}
            </React.Fragment>
          ))}

          <div className="flex gap-1.5 mt-3">
            <input
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPlace(placeName)}
              placeholder="📍 Add a place"
              className="flex-1 px-3 py-2.5 rounded-xl border text-sm"
              style={{ borderColor: colors.ink + "25" }}
            />
            <button onClick={() => addPlace(placeName)} className="px-4 rounded-xl text-sm font-semibold" style={{ background: colors.ink, color: colors.paper }}>Add</button>
          </div>

          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-wide mb-2" style={{ color: colors.charcoal, opacity: 0.5, fontFamily: mono }}>Recommended places</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {RECOMMENDED_POOL.map((name) => (
                <button key={name} onClick={() => addPlace(name)} className="shrink-0 px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5" style={{ background: colors.paperDim, color: colors.charcoal }}>
                  {name} <span style={{ color: colors.lagoon }}>+</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function NewTripForm({ onCreate, onCancel }) {
  const [name, setName] = useState(""); const [destination, setDestination] = useState(""); const [start, setStart] = useState(""); const [end, setEnd] = useState("");
  const canCreate = name && destination && start && end && start <= end;
  return (
    <div>
      <label className="text-xs uppercase tracking-wide" style={{ color: colors.charcoal, opacity: 0.6, fontFamily: mono }}>Trip name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Japan, Spring 2026" className="w-full px-3 py-2.5 rounded-xl border text-sm mb-4 mt-1" style={{ borderColor: colors.ink + "25" }} />
      <label className="text-xs uppercase tracking-wide" style={{ color: colors.charcoal, opacity: 0.6, fontFamily: mono }}>Destination</label>
      <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Tokyo, Japan" className="w-full px-3 py-2.5 rounded-xl border text-sm mb-4 mt-1" style={{ borderColor: colors.ink + "25" }} />
      <label className="text-xs uppercase tracking-wide" style={{ color: colors.charcoal, opacity: 0.6, fontFamily: mono }}>Start date</label>
      <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border text-sm mb-4 mt-1" style={{ borderColor: colors.ink + "25" }} />
      <label className="text-xs uppercase tracking-wide" style={{ color: colors.charcoal, opacity: 0.6, fontFamily: mono }}>End date</label>
      <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border text-sm mb-5 mt-1" style={{ borderColor: colors.ink + "25" }} />
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-full text-sm font-semibold" style={{ background: colors.paperDim, color: colors.charcoal }}>Cancel</button>
        <button disabled={!canCreate} onClick={() => { const days = dateRange(start, end).map((d, i) => ({ id: i + 1, date: d.toISOString().slice(0, 10), city: destination, items: [] })); onCreate({ id: Date.now(), name, destination, start, end, days, status: "upcoming" }); }} className="flex-1 py-2.5 rounded-full text-sm font-semibold" style={{ background: colors.coral, color: "#fff", opacity: canCreate ? 1 : 0.5 }}>Create trip</button>
      </div>
    </div>
  );
}
const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CNY", "KRW", "MYR", "SGD", "THB", "IDR", "INR", "VND", "PHP", "HKD", "TWD", "AUD", "NZD", "CAD", "CHF", "AED", "SAR", "ZAR", "BRL", "MXN", "ISK", "EGP", "TRY", "PLN", "SEK", "NOK", "DKK"];
const CURRENCY_ALIASES = {
  ringgit: "MYR", rm: "MYR", "malaysian ringgit": "MYR",
  yuan: "CNY", rmb: "CNY", renminbi: "CNY", "chinese yuan": "CNY",
  won: "KRW", "korean won": "KRW",
  baht: "THB", rupiah: "IDR", rupee: "INR", "indian rupee": "INR",
  peso: "PHP", "philippine peso": "PHP", dong: "VND", "vietnamese dong": "VND",
  dollar: "USD", "us dollar": "USD", "usd$": "USD",
  euro: "EUR", pound: "GBP", sterling: "GBP", "british pound": "GBP", yen: "JPY", "japanese yen": "JPY",
  franc: "CHF", "swiss franc": "CHF", real: "BRL", "brazilian real": "BRL",
  lira: "TRY", "turkish lira": "TRY", zloty: "PLN", krona: "SEK", krone: "NOK",
  "hong kong dollar": "HKD", "taiwan dollar": "TWD", "new taiwan dollar": "TWD",
  "singapore dollar": "SGD", "australian dollar": "AUD", "canadian dollar": "CAD",
  "kiwi dollar": "NZD", "new zealand dollar": "NZD", dirham: "AED", riyal: "SAR",
  rand: "ZAR", "south african rand": "ZAR", "mexican peso": "MXN", "egyptian pound": "EGP",
};
const fieldCls = "px-2.5 py-2 rounded-lg border text-xs";
const fieldStyle = { borderColor: colors.ink + "25" };

function computeShare(amount, isGroup, pax, splitMode, manualShare) {
  const amt = parseFloat(amount) || 0;
  if (!isGroup) return amt;
  if (splitMode === "equal") return Number(pax) > 0 ? amt / Number(pax) : amt;
  return parseFloat(manualShare) || 0;
}

function getParticipantPool(trip) {
  return [{ id: "you", name: "You", emoji: "🙂" }, ...(trip.collaborators || []).map((c) => ({ id: c.id, name: c.name, emoji: c.emoji }))];
}
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(",")[1];
      resolve({ base64, mediaType: file.type || "image/jpeg", dataUrl });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
async function extractReceiptWithAI(base64, mediaType) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          {
            type: "text",
            text: `Extract this receipt. Respond with ONLY raw JSON, no markdown fences, no extra text, exactly this shape:
{"merchant": string or null, "date": "YYYY-MM-DD" or null, "currency": "3-letter ISO code or null", "subtotal": number or null, "gst": number or null, "serviceCharge": number or null, "total": number or null, "items": [{"name": string, "quantity": number, "unitPrice": number, "totalPrice": number}]}
If a field isn't visible or you're not confident, use null rather than guessing. Only include items you can clearly read.`,
          },
        ],
      }],
    }),
  });
  if (!res.ok) throw new Error("Request failed");
  const data = await res.json();
  const text = (data.content || []).map((b) => b.text || "").join("");
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}
// Splits item costs + proportional GST/service charge among assigned participants.
// Any participant left with an unassigned/leftover fraction due to rounding gets it absorbed into the largest share.
function computeItemSplitShares(items, gst, serviceCharge, participantIds) {
  const shares = {};
  participantIds.forEach((id) => { shares[id] = 0; });
  let itemsTotal = 0;
  items.forEach((it) => {
    const total = parseFloat(it.totalPrice) || 0;
    itemsTotal += total;
    const assigned = (it.assignedTo || []).filter((id) => participantIds.includes(id));
    if (assigned.length === 0) return;
    const per = total / assigned.length;
    assigned.forEach((id) => { shares[id] = (shares[id] || 0) + per; });
  });
  const extras = (parseFloat(gst) || 0) + (parseFloat(serviceCharge) || 0);
  const activeParticipants = participantIds.filter((id) => (shares[id] || 0) > 0);
  const denom = activeParticipants.length || participantIds.length || 1;
  const extraPer = extras / denom;
  (activeParticipants.length ? activeParticipants : participantIds).forEach((id) => { shares[id] = (shares[id] || 0) + extraPer; });
  return shares;
}
function CostSplitControl({ amount, setAmount, currency, setCurrency, isGroup, setIsGroup, pax, setPax, splitMode, setSplitMode, manualShare, setManualShare, trip, onUpdate }) {
  return (
    <div className="mb-2">
      <div className="flex gap-1.5 mb-2">
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Cost" className={`${fieldCls} flex-1`} style={fieldStyle} />
        <CurrencyPicker value={currency} onChange={setCurrency} trip={trip} onUpdate={onUpdate} />
      </div>
      <div className="flex gap-2 mb-2 p-1 rounded-full" style={{ background: colors.paperDim }}>
        <button type="button" onClick={() => setIsGroup(false)} className="flex-1 py-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1" style={{ background: !isGroup ? colors.ink : "transparent", color: !isGroup ? colors.paper : colors.charcoal }}>🧍 Just me</button>
        <button type="button" onClick={() => setIsGroup(true)} className="flex-1 py-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1" style={{ background: isGroup ? colors.coral : "transparent", color: isGroup ? "#fff" : colors.charcoal }}>👥 Group expense</button>
      </div>
      {isGroup && (
        <div className="rounded-xl p-3" style={{ background: colors.paperDim, border: `1.5px solid ${colors.coral}40` }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs" style={{ color: colors.charcoal }}>Number of pax</span>
            <input type="number" min="1" value={pax} onChange={(e) => setPax(e.target.value)} className={`${fieldCls} w-16`} style={{ ...fieldStyle, background: "#fff" }} />
          </div>
          <div className="flex gap-1.5 mb-2">
            <button type="button" onClick={() => setSplitMode("equal")} className="flex-1 py-1.5 rounded-lg text-xs font-semibold" style={{ background: splitMode === "equal" ? colors.coral : "#fff", color: splitMode === "equal" ? "#fff" : colors.charcoal }}>Split equally</button>
            <button type="button" onClick={() => setSplitMode("manual")} className="flex-1 py-1.5 rounded-lg text-xs font-semibold" style={{ background: splitMode === "manual" ? colors.coral : "#fff", color: splitMode === "manual" ? "#fff" : colors.charcoal }}>Manual</button>
          </div>
          {splitMode === "equal" ? (
            <p className="text-xs" style={{ color: colors.charcoal, opacity: 0.7 }}>Your share: {amount && pax ? (parseFloat(amount) / Number(pax)).toFixed(2) : "0.00"} {currency}</p>
          ) : (
            <input type="number" value={manualShare} onChange={(e) => setManualShare(e.target.value)} placeholder="Your share amount" className={`${fieldCls} w-full`} style={fieldStyle} />
          )}
        </div>
      )}
    </div>
  );
}
function CostSummaryLine({ isGroup, amount, currency, pax, splitMode, myShare }) {
  if (!isGroup) return <div className="text-xs mt-1" style={{ color: colors.charcoal, opacity: 0.75 }}>{amount.toFixed(2)} {currency}</div>;
  return (
    <div className="text-xs mt-1" style={{ color: colors.charcoal, opacity: 0.75 }}>
      Total {amount.toFixed(2)} {currency} ÷ {pax} pax ({splitMode === "equal" ? "split equally" : "manual"}) → <b>Your share: {myShare.toFixed(2)} {currency}</b>
    </div>
  );
}
function useCostSplitState() {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [isGroup, setIsGroup] = useState(false);
  const [pax, setPax] = useState(2);
  const [splitMode, setSplitMode] = useState("equal");
  const [manualShare, setManualShare] = useState("");
  const reset = () => { setAmount(""); setManualShare(""); setIsGroup(false); setSplitMode("equal"); };
  return { amount, setAmount, currency, setCurrency, isGroup, setIsGroup, pax, setPax, splitMode, setSplitMode, manualShare, setManualShare, reset };
}
// Approximate, static reference rates (relative to USD) for prototype estimation only — not a live feed.
const EXCHANGE_RATES = {
  USD: 1, EUR: 0.92, GBP: 0.79, JPY: 157, CNY: 7.25, KRW: 1385, MYR: 4.7, SGD: 1.35, THB: 36.5, IDR: 16200,
  INR: 83.5, VND: 25400, PHP: 58.5, HKD: 7.82, TWD: 32.3, AUD: 1.52, NZD: 1.66, CAD: 1.37, CHF: 0.88,
  AED: 3.67, SAR: 3.75, ZAR: 18.6, BRL: 5.4, MXN: 18.2, ISK: 138, EGP: 48.5, TRY: 34.5, PLN: 4.0, SEK: 10.8, NOK: 11.0, DKK: 6.9,
};
async function lookupCurrencyWithAI(query) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `Someone typed "${query}" trying to find a world currency (could be a name, nickname, symbol, or code). Respond with ONLY raw JSON, no markdown fences, no extra text: {"found": true or false, "code": "3-letter ISO 4217 code or null", "name": "full currency name or null", "approxRateToUSD": number or null (approximately how many units of this currency equal 1 US dollar)}`,
      }],
    }),
  });
  const data = await res.json();
  const text = (data.content || []).map((b) => b.text || "").join("");
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}
function CurrencyPicker({ value, onChange, trip, onUpdate, compact }) {
  const custom = trip.customCurrencies || [];
  const options = [...CURRENCIES, ...custom.map((c) => c.code)];
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tryAdd = async () => {
    const q = query.trim();
    if (!q) return;
    setError("");
    const aliasCode = CURRENCY_ALIASES[q.toLowerCase()];
    const directCode = q.length <= 4 && EXCHANGE_RATES[q.toUpperCase()] ? q.toUpperCase() : null;
    if (aliasCode || directCode) {
      onChange(aliasCode || directCode);
      setAdding(false); setQuery("");
      return;
    }
    setLoading(true);
    try {
      const result = await lookupCurrencyWithAI(q);
      if (result.found && result.code) {
        const code = result.code.toUpperCase();
        if (!options.includes(code)) {
          onUpdate({ ...trip, customCurrencies: [...custom, { code, name: result.name, rate: result.approxRateToUSD || 1 }] });
          if (!(code in EXCHANGE_RATES)) EXCHANGE_RATES[code] = result.approxRateToUSD || 1;
        }
        onChange(code);
        setAdding(false); setQuery("");
      } else {
        setError("Couldn't recognize that currency. Try a code (e.g. MYR) or name (e.g. Ringgit).");
      }
    } catch {
      setError("Couldn't reach currency lookup right now. Try a known code instead.");
    }
    setLoading(false);
  };

  if (adding) {
    return (
      <div className="flex flex-col gap-1 min-w-0" style={compact ? { width: "100%" } : {}}>
        <div className="flex gap-1 min-w-0">
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && tryAdd()} placeholder="e.g. Ringgit, MYR" className={compact ? "text-[10px] rounded-md px-1.5 py-0.5 flex-1 min-w-0" : `${fieldCls} flex-1 min-w-0`} style={compact ? { border: `1px solid ${colors.charcoal}30`, background: "#fff" } : fieldStyle} />
          <button type="button" onClick={tryAdd} disabled={loading} className={compact ? "text-[10px] px-1.5 rounded-md font-semibold shrink-0" : "px-2 rounded-lg text-xs font-semibold shrink-0"} style={{ background: colors.ink, color: colors.paper }}>{loading ? "…" : "Add"}</button>
          <button type="button" onClick={() => { setAdding(false); setError(""); }} className={compact ? "text-[10px] px-1.5 rounded-md shrink-0" : "px-2 rounded-lg text-xs shrink-0"} style={{ background: colors.paperDim, color: colors.charcoal }}>✕</button>
        </div>
        {error && <span className="text-[9px]" style={{ color: compact ? "#E8A57C" : colors.stampRed }}>{error}</span>}
      </div>
    );
  }

  if (compact) {
    return (
      <select value={value} onChange={(e) => { if (e.target.value === "__other__") setAdding(true); else onChange(e.target.value); }} className="text-[10px] rounded-md px-1.5 py-0.5 shrink-0" style={{ background: "rgba(255,255,255,0.15)", color: "inherit", border: "none" }}>
        {options.map((c) => <option key={c} value={c} style={{ color: "#000" }}>{c}</option>)}
        <option value="__other__" style={{ color: "#000" }}>+ Other…</option>
      </select>
    );
  }
  return (
    <select value={value} onChange={(e) => { if (e.target.value === "__other__") setAdding(true); else onChange(e.target.value); }} className={fieldCls} style={{ ...fieldStyle, background: "#fff" }}>
      {options.map((c) => <option key={c} value={c}>{c}</option>)}
      <option value="__other__">+ Other currency…</option>
    </select>
  );
}
function convertAmount(amount, from, to) {
  if (from === to) return amount;
  const usd = amount / (EXCHANGE_RATES[from] || 1);
  return usd * (EXCHANGE_RATES[to] || 1);
}
function convertedGrandTotal(totals, targetCurrency) {
  return Object.entries(totals).reduce((sum, [cur, amt]) => sum + convertAmount(amt, cur, targetCurrency), 0);
}
function computeTripMyTotal(trip) {
  const totals = {};
  (trip.flights || []).forEach((f) => { if (f.amount) totals[f.currency] = (totals[f.currency] || 0) + f.myShare; });
  (trip.accommodations || []).forEach((a) => { if (a.amount) totals[a.currency] = (totals[a.currency] || 0) + a.myShare; });
  (trip.commute || []).forEach((c) => { totals[c.currency] = (totals[c.currency] || 0) + c.myShare; });
  (trip.expenses || []).forEach((e) => { totals[e.currency] = (totals[e.currency] || 0) + e.myShare; });
  return totals;
}
function TotalCard({ totals, label, dark, trip, onUpdate }) {
  const currencies = Object.keys(totals);
  const [displayCurrency, setDisplayCurrency] = useState(currencies[0] || "USD");
  if (currencies.length === 0) return null;
  const converted = convertedGrandTotal(totals, displayCurrency);
  const showBreakdown = currencies.length > 1 || currencies[0] !== displayCurrency;
  const textColor = dark ? colors.paper : colors.ink;
  const labelColor = dark ? colors.paper : colors.charcoal;
  return (
    <div className={dark ? "rounded-2xl p-4 mb-5 text-center" : "rounded-xl p-3 mb-3"} style={{ background: dark ? colors.ink : colors.paperDim }}>
      <div className={`flex items-center ${dark ? "justify-center" : "justify-between"} gap-2 mb-1`}>
        <span className="text-[10px] uppercase tracking-wide" style={{ color: labelColor, opacity: 0.6, fontFamily: mono }}>{label}</span>
        <CurrencyPicker value={displayCurrency} onChange={setDisplayCurrency} trip={trip} onUpdate={onUpdate} compact />
      </div>
      <div style={{ fontFamily: serif, color: textColor }} className={dark ? "text-2xl font-semibold" : "text-lg font-semibold"}>
        {converted.toFixed(2)} {displayCurrency}
      </div>
      {showBreakdown && (
        <div className="text-[10px] mt-1" style={{ color: labelColor, opacity: 0.5, textAlign: dark ? "center" : "left" }}>
          ({Object.entries(totals).map(([c, amt]) => `${amt.toFixed(2)} ${c}`).join(" + ")})
        </div>
      )}
      {dark && <div className="text-[9px] text-center mt-1" style={{ color: colors.paper, opacity: 0.35 }}>Exchange rates are approximate — for estimate purposes only.</div>}
    </div>
  );
}
function TripCostSummary({ trip, onUpdate }) {
  const totals = computeTripMyTotal(trip);
  return <TotalCard totals={totals} label="Your Total Trip Cost" dark trip={trip} onUpdate={onUpdate} />;
}

function LabeledField({ label, children }) {
  return (
    <div>
      <div className="text-[10px] mb-0.5 px-0.5" style={{ color: colors.charcoal, opacity: 0.55 }}>{label}</div>
      {children}
    </div>
  );
}
function useNotice() {
  const [notice, setNotice] = useState(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2200);
    return () => clearTimeout(t);
  }, [notice]);
  return [notice, setNotice];
}
function NoticeBanner({ notice }) {
  if (!notice) return null;
  const isError = notice.type === "error";
  return (
    <div className="rounded-lg px-3 py-2 mb-2 text-xs font-medium text-center" style={{ background: isError ? "#F5DCC0" : colors.lagoon + "22", color: isError ? colors.stampRed : colors.lagoon }}>
      {notice.text}
    </div>
  );
}
function CategorySubtotal({ items, label, trip, onUpdate }) {
  const totals = items.reduce((acc, it) => { if (it.myShare) acc[it.currency] = (acc[it.currency] || 0) + it.myShare; return acc; }, {});
  return <TotalCard totals={totals} label={label} trip={trip} onUpdate={onUpdate} />;
}
const FLIGHT_TYPES = [{ key: "oneway", label: "One way" }, { key: "return", label: "Return" }, { key: "multi", label: "Multi-city" }];
function FlightsSection({ trip, onUpdate }) {
  const flights = trip.flights || [];
  const [tripType, setTripType] = useState("oneway");
  const [airline, setAirline] = useState(""); const [flightNo, setFlightNo] = useState("");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [departDate, setDepartDate] = useState(""); const [departTime, setDepartTime] = useState("");
  const [returnDate, setReturnDate] = useState(""); const [returnTime, setReturnTime] = useState("");
  const cost = useCostSplitState();
  const [notice, setNotice] = useNotice();

  const addFlight = () => {
    if (!airline.trim() || !from.trim() || !to.trim()) {
      setNotice({ type: "error", text: "Please fill in Airline, From, and To." });
      return;
    }
    const myShare = computeShare(cost.amount, cost.isGroup, cost.pax, cost.splitMode, cost.manualShare);
    onUpdate({
      ...trip, flights: [...flights, {
        id: Date.now(), tripType, airline, flightNo, from, to, departDate, departTime,
        returnDate: tripType === "return" ? returnDate : "", returnTime: tripType === "return" ? returnTime : "",
        amount: parseFloat(cost.amount) || 0, currency: cost.currency, isGroup: cost.isGroup, pax: cost.isGroup ? Number(cost.pax) : 1,
        splitMode: cost.isGroup ? cost.splitMode : null, myShare,
      }],
    });
    setAirline(""); setFlightNo(""); setFrom(""); setTo(""); setDepartDate(""); setDepartTime(""); setReturnDate(""); setReturnTime(""); cost.reset();
    setNotice({ type: "success", text: "✓ Flight added!" });
  };
  const removeFlight = (id) => onUpdate({ ...trip, flights: flights.filter((f) => f.id !== id) });

  return (
    <div className="mb-5">
      <div className="text-sm font-semibold mb-2" style={{ color: colors.ink }}>✈️ Flights</div>
      <CategorySubtotal items={flights} label="Your Flights Total" trip={trip} onUpdate={onUpdate} />
      {flights.map((f) => (
        <div key={f.id} className="rounded-xl p-3 mb-2" style={{ background: "#fff", boxShadow: "0 2px 8px rgba(22,35,61,0.06)" }}>
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium" style={{ color: colors.ink }}>{f.airline}{f.flightNo && ` ${f.flightNo}`} <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full ml-1" style={{ background: colors.paperDim, color: colors.charcoal }}>{FLIGHT_TYPES.find((t) => t.key === f.tripType)?.label || "One way"}</span></div>
            <button onClick={() => removeFlight(f.id)} className="text-xs shrink-0" style={{ color: colors.coral }}>Remove</button>
          </div>
          {f.tripType === "return" ? (
            <div className="text-xs" style={{ color: colors.charcoal, opacity: 0.6 }}>
              {f.from} ⇄ {f.to}<br />Depart {f.departDate} {f.departTime} → Return {f.returnDate} {f.returnTime}
            </div>
          ) : (
            <div className="text-xs" style={{ color: colors.charcoal, opacity: 0.6 }}>{f.from} → {f.to}{f.departDate && ` · ${f.departDate}`}{f.departTime && ` ${f.departTime}`}</div>
          )}
          {f.amount > 0 && <CostSummaryLine isGroup={f.isGroup} amount={f.amount} currency={f.currency} pax={f.pax} splitMode={f.splitMode} myShare={f.myShare} />}
        </div>
      ))}

      <div className="flex gap-1.5 mb-2 p-1 rounded-full" style={{ background: colors.paperDim }}>
        {FLIGHT_TYPES.map((t) => (
          <button key={t.key} onClick={() => setTripType(t.key)} className="flex-1 min-w-0 py-1.5 rounded-full text-[11px] font-semibold truncate px-0.5" style={{ background: tripType === t.key ? colors.ink : "transparent", color: tripType === t.key ? colors.paper : colors.charcoal }}>{t.label}</button>
        ))}
      </div>
      {tripType === "multi" && <p className="text-[10px] mb-2 px-0.5" style={{ color: colors.charcoal, opacity: 0.5 }}>Add each city-to-city leg separately below.</p>}

      <NoticeBanner notice={notice} />

      <div className="grid grid-cols-2 gap-1.5 mb-1.5">
        <input value={airline} onChange={(e) => setAirline(e.target.value)} placeholder="Airline" className={fieldCls} style={fieldStyle} />
        <input value={flightNo} onChange={(e) => setFlightNo(e.target.value)} placeholder="Flight no." className={fieldCls} style={fieldStyle} />
        <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="From" className={fieldCls} style={fieldStyle} />
        <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="To" className={fieldCls} style={fieldStyle} />
      </div>
      <div className="flex flex-col gap-1.5 mb-1.5">
        <LabeledField label="Departure date"><input type="date" value={departDate} onChange={(e) => setDepartDate(e.target.value)} className={`${fieldCls} w-full`} style={fieldStyle} /></LabeledField>
        <LabeledField label="Departure time"><input type="time" value={departTime} onChange={(e) => setDepartTime(e.target.value)} className={`${fieldCls} w-full`} style={fieldStyle} /></LabeledField>
        {tripType === "return" && (
          <>
            <LabeledField label="Return date"><input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className={`${fieldCls} w-full`} style={fieldStyle} /></LabeledField>
            <LabeledField label="Return time"><input type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} className={`${fieldCls} w-full`} style={fieldStyle} /></LabeledField>
          </>
        )}
      </div>
      <CostSplitControl {...cost} trip={trip} onUpdate={onUpdate} />
      <button onClick={addFlight} className="w-full py-2 rounded-lg text-sm font-semibold" style={{ background: colors.ink, color: colors.paper }}>+ Add flight</button>
    </div>
  );
}

function AccommodationsSection({ trip, onUpdate }) {
  const stays = trip.accommodations || [];
  const [name, setName] = useState(""); const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState(""); const [address, setAddress] = useState("");
  const cost = useCostSplitState();
  const [notice, setNotice] = useNotice();

  const addStay = () => {
    if (!name.trim()) {
      setNotice({ type: "error", text: "Please enter a hotel / stay name." });
      return;
    }
    const myShare = computeShare(cost.amount, cost.isGroup, cost.pax, cost.splitMode, cost.manualShare);
    onUpdate({
      ...trip, accommodations: [...stays, {
        id: Date.now(), name, checkIn, checkOut, address,
        amount: parseFloat(cost.amount) || 0, currency: cost.currency, isGroup: cost.isGroup, pax: cost.isGroup ? Number(cost.pax) : 1,
        splitMode: cost.isGroup ? cost.splitMode : null, myShare,
      }],
    });
    setName(""); setCheckIn(""); setCheckOut(""); setAddress(""); cost.reset();
    setNotice({ type: "success", text: "✓ Accommodation added!" });
  };
  const removeStay = (id) => onUpdate({ ...trip, accommodations: stays.filter((s) => s.id !== id) });

  return (
    <div className="mb-5">
      <div className="text-sm font-semibold mb-2" style={{ color: colors.ink }}>🏨 Accommodations</div>
      <CategorySubtotal items={stays} label="Your Accommodations Total" trip={trip} onUpdate={onUpdate} />
      {stays.map((s) => (
        <div key={s.id} className="rounded-xl p-3 mb-2" style={{ background: "#fff", boxShadow: "0 2px 8px rgba(22,35,61,0.06)" }}>
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium" style={{ color: colors.ink }}>{s.name}</div>
            <button onClick={() => removeStay(s.id)} className="text-xs shrink-0" style={{ color: colors.coral }}>Remove</button>
          </div>
          <div className="text-xs" style={{ color: colors.charcoal, opacity: 0.6 }}>{s.checkIn}{s.checkOut && ` → ${s.checkOut}`}{s.address && ` · ${s.address}`}</div>
          {s.amount > 0 && <CostSummaryLine isGroup={s.isGroup} amount={s.amount} currency={s.currency} pax={s.pax} splitMode={s.splitMode} myShare={s.myShare} />}
        </div>
      ))}
      <NoticeBanner notice={notice} />
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Hotel / stay name" className={`${fieldCls} w-full mb-1.5`} style={fieldStyle} />
      <div className="flex flex-col gap-1.5 mb-1.5">
        <LabeledField label="Check-in"><input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={`${fieldCls} w-full`} style={fieldStyle} /></LabeledField>
        <LabeledField label="Check-out"><input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className={`${fieldCls} w-full`} style={fieldStyle} /></LabeledField>
      </div>
      <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address (optional)" className={`${fieldCls} w-full mb-1.5`} style={fieldStyle} />
      <CostSplitControl {...cost} trip={trip} onUpdate={onUpdate} />
      <button onClick={addStay} className="w-full py-2 rounded-lg text-sm font-semibold" style={{ background: colors.ink, color: colors.paper }}>+ Add accommodation</button>
    </div>
  );
}

const COMMUTE_MODES = [{ key: "taxi", label: "🚕 Taxi" }, { key: "train", label: "🚆 Train" }, { key: "bus", label: "🚌 Bus" }, { key: "rental", label: "🚗 Rental" }, { key: "ferry", label: "⛴️ Ferry" }, { key: "other", label: "🚶 Other" }];
function CommuteSection({ trip, onUpdate }) {
  const commutes = trip.commute || [];
  const [mode, setMode] = useState("taxi");
  const [description, setDescription] = useState("");
  const [dayId, setDayId] = useState(trip.days[0]?.id || "");
  const cost = useCostSplitState();
  const [notice, setNotice] = useNotice();
  const dayLabel = (id) => { const d = trip.days.find((d) => d.id === Number(id)); return d ? `Day ${d.id} · ${d.city}` : ""; };
  const modeLabel = (key) => COMMUTE_MODES.find((m) => m.key === key)?.label || "🚶 Other";

  const addCommute = () => {
    if (!cost.amount) {
      setNotice({ type: "error", text: "Please enter a cost." });
      return;
    }
    const myShare = computeShare(cost.amount, cost.isGroup, cost.pax, cost.splitMode, cost.manualShare);
    onUpdate({
      ...trip, commute: [...commutes, {
        id: Date.now(), mode, description, dayId: Number(dayId),
        amount: parseFloat(cost.amount), currency: cost.currency, isGroup: cost.isGroup, pax: cost.isGroup ? Number(cost.pax) : 1,
        splitMode: cost.isGroup ? cost.splitMode : null, myShare,
      }],
    });
    setDescription(""); cost.reset();
    setNotice({ type: "success", text: "✓ Commute added!" });
  };
  const removeCommute = (id) => onUpdate({ ...trip, commute: commutes.filter((c) => c.id !== id) });

  return (
    <div className="mb-5">
      <div className="text-sm font-semibold mb-2" style={{ color: colors.ink }}>🚕 Commute</div>
      <CategorySubtotal items={commutes} label="Your Commute Total" trip={trip} onUpdate={onUpdate} />
      {commutes.map((c) => (
        <div key={c.id} className="rounded-xl p-3 mb-2" style={{ background: "#fff", boxShadow: "0 2px 8px rgba(22,35,61,0.06)" }}>
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium" style={{ color: colors.ink }}>{modeLabel(c.mode)}{c.description && ` — ${c.description}`}</div>
            <button onClick={() => removeCommute(c.id)} className="text-xs shrink-0" style={{ color: colors.coral }}>Remove</button>
          </div>
          <div className="text-xs" style={{ color: colors.charcoal, opacity: 0.6 }}>{dayLabel(c.dayId)}</div>
          <CostSummaryLine isGroup={c.isGroup} amount={c.amount} currency={c.currency} pax={c.pax} splitMode={c.splitMode} myShare={c.myShare} />
        </div>
      ))}

      <NoticeBanner notice={notice} />
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {COMMUTE_MODES.map((m) => (
          <button key={m.key} onClick={() => setMode(m.key)} className="px-2.5 py-1.5 rounded-full text-[11px] font-medium" style={{ background: mode === m.key ? colors.ink : colors.paperDim, color: mode === m.key ? colors.paper : colors.charcoal }}>{m.label}</button>
        ))}
      </div>
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Route or notes (optional)" className={`${fieldCls} w-full mb-1.5`} style={fieldStyle} />
      <select value={dayId} onChange={(e) => setDayId(e.target.value)} className={`${fieldCls} w-full mb-1.5`} style={{ ...fieldStyle, background: "#fff" }}>
        {trip.days.map((d) => <option key={d.id} value={d.id}>Day {d.id} · {d.city}</option>)}
      </select>
      <CostSplitControl {...cost} trip={trip} onUpdate={onUpdate} />
      <button onClick={addCommute} className="w-full py-2 rounded-lg text-sm font-semibold" style={{ background: colors.ink, color: colors.paper }}>+ Add commute</button>
    </div>
  );
}
function DebtorsPanel({ expense, trip, onUpdate }) {
  const [open, setOpen] = useState(false);
  const debtors = expense.debtors || [];
  if (debtors.length === 0) return null;

  const updateDebtor = (participantId, patch) => {
    const updated = debtors.map((d) => (d.participantId === participantId ? { ...d, ...patch } : d));
    const expenses = trip.expenses.map((e) => (e.id === expense.id ? { ...e, debtors: updated } : e));
    onUpdate({ ...trip, expenses });
  };
  const setPaid = (d, amountPaid) => {
    const owed = d.amountOwed;
    const paid = Math.max(0, Math.min(amountPaid, owed));
    const status = paid >= owed - 0.005 ? "paid" : paid > 0 ? "partial" : "unpaid";
    updateDebtor(d.participantId, { amountPaid: paid, outstandingBalance: Math.max(0, owed - paid), status });
  };
  const statusLabel = { unpaid: "Unpaid", partial: "Partially Paid", paid: "Paid" };
  const statusColor = { unpaid: colors.stampRed, partial: colors.coral, paid: colors.lagoon };
  const totalOwed = debtors.reduce((s, d) => s + d.amountOwed, 0);
  const totalOutstanding = debtors.reduce((s, d) => s + d.outstandingBalance, 0);

  return (
    <div className="mt-2">
      <button onClick={() => setOpen(!open)} className="text-xs font-semibold flex items-center gap-1" style={{ color: colors.lagoon }}>
        {open ? "▲" : "▼"} Debtors {totalOutstanding > 0 ? `· ${totalOutstanding.toFixed(2)} ${expense.currency} outstanding` : "· settled"}
      </button>
      {open && (
        <div className="mt-2 rounded-xl overflow-hidden" style={{ border: `1px solid ${colors.ink}12` }}>
          {debtors.map((d) => (
            <div key={d.participantId} className="p-2.5" style={{ borderBottom: `1px solid ${colors.ink}10` }}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold min-w-0 truncate" style={{ color: colors.ink }}>{d.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0" style={{ background: statusColor[d.status] + "22", color: statusColor[d.status] }}>{statusLabel[d.status]}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] mb-1.5" style={{ color: colors.charcoal, opacity: 0.7 }}>
                <span>Owes {d.amountOwed.toFixed(2)} {expense.currency}</span>
                <span>Outstanding {d.outstandingBalance.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input type="number" defaultValue={d.amountPaid} onBlur={(e) => setPaid(d, parseFloat(e.target.value) || 0)} placeholder="Amount paid" className={`${fieldCls} flex-1`} style={fieldStyle} />
                <button onClick={() => setPaid(d, d.amountOwed)} className="text-[10px] px-2.5 py-2 rounded-lg font-semibold shrink-0" style={{ background: colors.ink, color: colors.paper }}>Mark Paid</button>
              </div>
            </div>
          ))}
          <div className="p-2.5 text-[10px]" style={{ color: colors.charcoal, opacity: 0.5 }}>Total owed to you: {totalOwed.toFixed(2)} {expense.currency}</div>
        </div>
      )}
    </div>
  );
}

function ReceiptExpenseModal({ trip, onUpdate, onClose }) {
  const [step, setStep] = useState("entry"); // entry | scanning | review | split
  const [scanError, setScanError] = useState("");
  const fileInputRef = useRef(null);
  const pool = getParticipantPool(trip);

  const [receipt, setReceipt] = useState({ merchant: "", date: "", currency: "USD", subtotal: "", gst: "", serviceCharge: "", total: "", receiptImage: null });
  const [items, setItems] = useState([]);
  const [dayId, setDayId] = useState(trip.days[0]?.id || "");
  const [activityId, setActivityId] = useState(trip.days[0]?.items?.[0]?.id || "");

  const [splitMethod, setSplitMethod] = useState("equal");
  const [equalParticipants, setEqualParticipants] = useState(["you"]);
  const [paidBy, setPaidBy] = useState("you");

  const selectedDay = trip.days.find((d) => d.id === Number(dayId));

  const onPickFile = async (file) => {
    if (!file) return;
    setStep("scanning"); setScanError("");
    try {
      const { base64, mediaType, dataUrl } = await fileToBase64(file);
      const extracted = await extractReceiptWithAI(base64, mediaType);
      setReceipt({
        merchant: extracted.merchant || "", date: extracted.date || "", currency: (extracted.currency || "USD").toUpperCase(),
        subtotal: extracted.subtotal ?? "", gst: extracted.gst ?? "", serviceCharge: extracted.serviceCharge ?? "", total: extracted.total ?? "",
        receiptImage: dataUrl,
      });
      setItems((extracted.items || []).map((it, i) => ({ id: i + 1, name: it.name || "", quantity: it.quantity || 1, unitPrice: it.unitPrice || 0, totalPrice: it.totalPrice || 0, assignedTo: [] })));
      setStep("review");
    } catch {
      setScanError("Couldn't read that receipt clearly. You can enter the details manually below instead.");
      setReceipt({ merchant: "", date: "", currency: "USD", subtotal: "", gst: "", serviceCharge: "", total: "", receiptImage: null });
      setItems([]);
      setStep("review");
    }
  };
  const startManual = () => {
    setReceipt({ merchant: "", date: "", currency: "USD", subtotal: "", gst: "", serviceCharge: "", total: "", receiptImage: null });
    setItems([]);
    setStep("review");
  };
  const addItem = () => setItems((its) => [...its, { id: Date.now(), name: "", quantity: 1, unitPrice: 0, totalPrice: 0, assignedTo: [] }]);
  const updateItem = (id, patch) => setItems((its) => its.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const removeItem = (id) => setItems((its) => its.filter((it) => it.id !== id));
  const toggleItemAssignee = (id, pid) => setItems((its) => its.map((it) => it.id === id ? { ...it, assignedTo: it.assignedTo.includes(pid) ? it.assignedTo.filter((x) => x !== pid) : [...it.assignedTo, pid] } : it));
  const toggleEqualParticipant = (pid) => setEqualParticipants((ps) => ps.includes(pid) ? ps.filter((x) => x !== pid) : [...ps, pid]);

  const itemsSum = items.reduce((s, it) => s + (parseFloat(it.totalPrice) || 0), 0);
  const subtotalNum = parseFloat(receipt.subtotal) || 0;
  const gstNum = parseFloat(receipt.gst) || 0;
  const serviceNum = parseFloat(receipt.serviceCharge) || 0;
  const totalNum = parseFloat(receipt.total) || 0;
  const itemsMismatch = items.length > 0 && receipt.subtotal !== "" && Math.abs(itemsSum - subtotalNum) > 0.05;
  const totalsMismatch = receipt.subtotal !== "" && receipt.total !== "" && Math.abs((subtotalNum + gstNum + serviceNum) - totalNum) > 0.05;

  const itemParticipantIds = [...new Set(items.flatMap((it) => it.assignedTo))];
  const previewShares = splitMethod === "equal"
    ? Object.fromEntries(equalParticipants.map((pid) => [pid, equalParticipants.length ? totalNum / equalParticipants.length : 0]))
    : computeItemSplitShares(items, gstNum, serviceNum, itemParticipantIds.length ? itemParticipantIds : ["you"]);

  const canSave = totalNum > 0 && (splitMethod === "equal" ? equalParticipants.length > 0 : itemParticipantIds.length > 0);

  const save = () => {
    if (!canSave) return;
    const participantIds = splitMethod === "equal" ? equalParticipants : itemParticipantIds;
    const shares = previewShares;
    const debtors = participantIds.filter((pid) => pid !== paidBy).map((pid) => {
      const p = pool.find((x) => x.id === pid);
      const owed = shares[pid] || 0;
      return { participantId: pid, name: p?.name || pid, amountOwed: owed, amountPaid: 0, outstandingBalance: owed, status: "unpaid" };
    });
    const myShare = paidBy === "you" ? (shares.you || 0) : 0;
    const expense = {
      id: Date.now(), dayId: Number(dayId), activityId: activityId ? Number(activityId) : null,
      merchant: receipt.merchant || "Expense", description: receipt.merchant || "Expense",
      date: receipt.date, currency: receipt.currency, subtotal: subtotalNum, gst: gstNum, serviceCharge: serviceNum, total: totalNum,
      receiptImage: receipt.receiptImage, items, splitMethod, participantIds, paidBy, shares, debtors,
      amount: totalNum, myShare,
    };
    onUpdate({ ...trip, expenses: [...(trip.expenses || []), expense] });
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(22,35,61,0.5)", overflowX: "hidden", width: "100%" }}>
      <div className="w-full max-w-[460px] sm:max-w-[640px] lg:max-w-[820px] rounded-t-3xl px-5 py-5" style={{ background: colors.paper, maxHeight: "88%", overflowY: "auto", overflowX: "hidden", boxSizing: "border-box" }}>
        <div className="flex items-center justify-between mb-4">
          <span style={{ fontFamily: serif, color: colors.ink }} className="text-lg font-semibold">Add Expense</span>
          <button onClick={onClose} className="text-xl">✕</button>
        </div>

        {step === "entry" && (
          <div className="flex flex-col gap-2.5">
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPickFile(e.target.files?.[0])} />
            <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2" style={{ background: colors.ink, color: colors.paper }}>📷 Scan Receipt</button>
            <button onClick={startManual} className="w-full py-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2" style={{ background: colors.paperDim, color: colors.charcoal }}>✍️ Add Manually</button>
          </div>
        )}

        {step === "scanning" && (
          <div className="py-10 text-center">
            <p className="text-3xl mb-3">🧾</p>
            <p className="text-sm" style={{ color: colors.charcoal, opacity: 0.7 }}>Reading your receipt…</p>
          </div>
        )}

        {step === "review" && (
          <div>
            {scanError && <NoticeBanner notice={{ type: "error", text: scanError }} />}
            {receipt.receiptImage && <img src={receipt.receiptImage} alt="Receipt" className="w-full rounded-xl mb-3" style={{ maxHeight: 160, objectFit: "cover" }} />}
            <input value={receipt.merchant} onChange={(e) => setReceipt({ ...receipt, merchant: e.target.value })} placeholder="Merchant name" className={`${fieldCls} w-full mb-1.5`} style={fieldStyle} />
            <div className="grid grid-cols-2 gap-1.5 mb-1.5">
              <LabeledField label="Receipt date"><input type="date" value={receipt.date} onChange={(e) => setReceipt({ ...receipt, date: e.target.value })} className={`${fieldCls} w-full`} style={fieldStyle} /></LabeledField>
              <LabeledField label="Currency"><CurrencyPicker value={receipt.currency} onChange={(c) => setReceipt({ ...receipt, currency: c })} trip={trip} onUpdate={onUpdate} /></LabeledField>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mb-1.5">
              <LabeledField label="Subtotal"><input type="number" value={receipt.subtotal} onChange={(e) => setReceipt({ ...receipt, subtotal: e.target.value })} className={`${fieldCls} w-full`} style={fieldStyle} /></LabeledField>
              <LabeledField label="GST / Tax"><input type="number" value={receipt.gst} onChange={(e) => setReceipt({ ...receipt, gst: e.target.value })} className={`${fieldCls} w-full`} style={fieldStyle} /></LabeledField>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <LabeledField label="Service charge"><input type="number" value={receipt.serviceCharge} onChange={(e) => setReceipt({ ...receipt, serviceCharge: e.target.value })} className={`${fieldCls} w-full`} style={fieldStyle} /></LabeledField>
              <LabeledField label="Total"><input type="number" value={receipt.total} onChange={(e) => setReceipt({ ...receipt, total: e.target.value })} className={`${fieldCls} w-full`} style={fieldStyle} /></LabeledField>
            </div>
            {totalsMismatch && <NoticeBanner notice={{ type: "error", text: `Subtotal + GST + service charge (${(subtotalNum + gstNum + serviceNum).toFixed(2)}) doesn't match Total (${totalNum.toFixed(2)}). Check the numbers.` }} />}
            {itemsMismatch && <NoticeBanner notice={{ type: "error", text: `Items add up to ${itemsSum.toFixed(2)}, which doesn't match Subtotal (${subtotalNum.toFixed(2)}).` }} />}

            <div className="text-xs font-semibold mt-2 mb-1.5" style={{ color: colors.ink }}>Items</div>
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-1.5 mb-1.5">
                <input value={it.name} onChange={(e) => updateItem(it.id, { name: e.target.value })} placeholder="Item name" className={`${fieldCls} flex-1 min-w-0`} style={fieldStyle} />
                <input type="number" value={it.quantity} onChange={(e) => updateItem(it.id, { quantity: e.target.value })} placeholder="Qty" className={`${fieldCls} w-14 shrink-0`} style={fieldStyle} />
                <input type="number" value={it.totalPrice} onChange={(e) => updateItem(it.id, { totalPrice: e.target.value })} placeholder="Total" className={`${fieldCls} w-20 shrink-0`} style={fieldStyle} />
                <button onClick={() => removeItem(it.id)} className="text-xs shrink-0" style={{ color: colors.coral }}>✕</button>
              </div>
            ))}
            <button onClick={addItem} className="text-xs font-semibold mb-3" style={{ color: colors.lagoon }}>+ Add item</button>

            <div className="grid grid-cols-2 gap-1.5 mb-3">
              <select value={dayId} onChange={(e) => { setDayId(e.target.value); const d = trip.days.find((d) => d.id === Number(e.target.value)); setActivityId(d?.items?.[0]?.id || ""); }} className={fieldCls} style={{ ...fieldStyle, background: "#fff" }}>
                {trip.days.map((d) => <option key={d.id} value={d.id}>Day {d.id}</option>)}
              </select>
              {(selectedDay?.items || []).length > 0 && (
                <select value={activityId} onChange={(e) => setActivityId(e.target.value)} className={fieldCls} style={{ ...fieldStyle, background: "#fff" }}>
                  {selectedDay.items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                </select>
              )}
            </div>

            <button onClick={() => setStep("split")} disabled={totalNum <= 0} className="w-full py-2.5 rounded-xl text-sm font-semibold" style={{ background: colors.ink, color: colors.paper, opacity: totalNum > 0 ? 1 : 0.5 }}>Continue to Split →</button>
          </div>
        )}

        {step === "split" && (
          <div>
            <p className="text-sm font-semibold mb-2" style={{ color: colors.ink }}>How would you like to split this expense?</p>
            <div className="flex gap-2 mb-3 p-1 rounded-full" style={{ background: colors.paperDim }}>
              <button onClick={() => setSplitMethod("equal")} className="flex-1 py-2 rounded-full text-xs font-semibold" style={{ background: splitMethod === "equal" ? colors.ink : "transparent", color: splitMethod === "equal" ? colors.paper : colors.charcoal }}>Split Equally</button>
              <button onClick={() => setSplitMethod("items")} disabled={items.length === 0} className="flex-1 py-2 rounded-full text-xs font-semibold" style={{ background: splitMethod === "items" ? colors.ink : "transparent", color: splitMethod === "items" ? colors.paper : colors.charcoal, opacity: items.length === 0 ? 0.4 : 1 }}>Split by Items</button>
            </div>

            <div className="mb-3">
              <span className="text-xs" style={{ color: colors.charcoal, opacity: 0.7 }}>Who paid?</span>
              <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className={`${fieldCls} w-full mt-1`} style={{ ...fieldStyle, background: "#fff" }}>
                {pool.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {splitMethod === "equal" ? (
              <div className="mb-3">
                <span className="text-xs font-semibold" style={{ color: colors.ink }}>Participants</span>
                {pool.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 py-1.5">
                    <input type="checkbox" checked={equalParticipants.includes(p.id)} onChange={() => toggleEqualParticipant(p.id)} />
                    <span className="text-sm">{p.emoji} {p.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="mb-3">
                {items.map((it) => (
                  <div key={it.id} className="rounded-xl p-2.5 mb-2" style={{ background: colors.paperDim }}>
                    <div className="text-xs font-semibold mb-1.5" style={{ color: colors.ink }}>{it.name || "Item"} — {(parseFloat(it.totalPrice) || 0).toFixed(2)} {receipt.currency}</div>
                    <div className="flex flex-wrap gap-2">
                      {pool.map((p) => (
                        <label key={p.id} className="flex items-center gap-1 text-xs">
                          <input type="checkbox" checked={it.assignedTo.includes(p.id)} onChange={() => toggleItemAssignee(it.id, p.id)} />
                          {p.emoji} {p.name.split(" ")[0]}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="text-[10px]" style={{ color: colors.charcoal, opacity: 0.5 }}>GST and service charge are split equally among everyone assigned to at least one item.</p>
              </div>
            )}

            <div className="rounded-xl p-3 mb-3" style={{ background: colors.paperDim }}>
              <div className="text-xs font-semibold mb-1.5" style={{ color: colors.ink }}>Amount Owed</div>
              {Object.entries(previewShares).map(([pid, amt]) => {
                const p = pool.find((x) => x.id === pid);
                return <div key={pid} className="flex items-center justify-between text-xs py-0.5"><span>{p?.emoji} {p?.name || pid}</span><span className="font-semibold">{amt.toFixed(2)} {receipt.currency}</span></div>;
              })}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep("review")} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: colors.paperDim, color: colors.charcoal }}>← Back</button>
              <button onClick={save} disabled={!canSave} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: colors.lagoon, color: "#fff", opacity: canSave ? 1 : 0.5 }}>Save Expense</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function computeBalances(trip) {
  const owedToMe = {}; // participantId -> { name, emoji, byCurrency: {cur: amount} }
  const iOwe = {};
  const pool = getParticipantPool(trip);
  (trip.expenses || []).forEach((e) => {
    if (!e.debtors || e.debtors.length === 0) return;
    if (e.paidBy === "you") {
      e.debtors.forEach((d) => {
        if (d.outstandingBalance <= 0.005) return;
        const p = pool.find((x) => x.id === d.participantId);
        if (!owedToMe[d.participantId]) owedToMe[d.participantId] = { name: d.name, emoji: p?.emoji || "🙂", byCurrency: {} };
        owedToMe[d.participantId].byCurrency[e.currency] = (owedToMe[d.participantId].byCurrency[e.currency] || 0) + d.outstandingBalance;
      });
    } else {
      const myDebt = e.debtors.find((d) => d.participantId === "you");
      if (myDebt && myDebt.outstandingBalance > 0.005) {
        const payer = pool.find((p) => p.id === e.paidBy);
        if (!iOwe[e.paidBy]) iOwe[e.paidBy] = { name: payer?.name || e.paidBy, emoji: payer?.emoji || "🙂", byCurrency: {} };
        iOwe[e.paidBy].byCurrency[e.currency] = (iOwe[e.paidBy].byCurrency[e.currency] || 0) + myDebt.outstandingBalance;
      }
    }
  });
  return { owedToMe, iOwe };
}
function computeGlobalBalances(trips) {
  const owedToMe = {};
  const iOwe = {};
  const mergeInto = (target, entries) => {
    Object.entries(entries).forEach(([id, val]) => {
      if (!target[id]) target[id] = { name: val.name, emoji: val.emoji, byCurrency: {} };
      Object.entries(val.byCurrency).forEach(([cur, amt]) => {
        target[id].byCurrency[cur] = (target[id].byCurrency[cur] || 0) + amt;
      });
    });
  };
  trips.forEach((trip) => {
    const b = computeBalances(trip);
    mergeInto(owedToMe, b.owedToMe);
    mergeInto(iOwe, b.iOwe);
  });
  return { owedToMe, iOwe };
}
function BalancesCard({ owedToMe, iOwe, title }) {
  const owedToMeEntries = Object.values(owedToMe);
  const iOweEntries = Object.values(iOwe);
  if (owedToMeEntries.length === 0 && iOweEntries.length === 0) return null;
  const fmt = (byCurrency) => Object.entries(byCurrency).map(([c, amt]) => `${amt.toFixed(2)} ${c}`).join(" + ");

  return (
    <div className="rounded-2xl p-3 mb-3" style={{ background: "#fff", boxShadow: "0 2px 8px rgba(22,35,61,0.06)" }}>
      <div className="text-xs font-semibold mb-2" style={{ color: colors.ink }}>⚖️ {title}</div>
      {owedToMeEntries.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: colors.charcoal, opacity: 0.5, fontFamily: mono }}>Owed to you</div>
          {owedToMeEntries.map((p, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-1">
              <span>{p.emoji} {p.name}</span>
              <span className="font-semibold" style={{ color: colors.lagoon }}>{fmt(p.byCurrency)}</span>
            </div>
          ))}
        </div>
      )}
      {iOweEntries.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: colors.charcoal, opacity: 0.5, fontFamily: mono }}>You owe</div>
          {iOweEntries.map((p, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-1">
              <span>{p.emoji} {p.name}</span>
              <span className="font-semibold" style={{ color: colors.stampRed }}>{fmt(p.byCurrency)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function BalancesSummary({ trip }) {
  const { owedToMe, iOwe } = computeBalances(trip);
  return <BalancesCard owedToMe={owedToMe} iOwe={iOwe} title="Balances" />;
}
function GlobalBalancesSummary({ trips }) {
  const { owedToMe, iOwe } = computeGlobalBalances(trips);
  return <BalancesCard owedToMe={owedToMe} iOwe={iOwe} title="Balances — All Trips" />
}
function ExpensesSection({ trip, onUpdate }) {
  const expenses = trip.expenses || [];
  const [showAdd, setShowAdd] = useState(false);
  const dayLabel = (id) => { const d = trip.days.find((d) => d.id === Number(id)); return d ? `Day ${d.id} · ${d.city}` : ""; };
  const activityLabel = (dId, aId) => {
    if (!aId) return "";
    const d = trip.days.find((d) => d.id === Number(dId));
    const it = d?.items.find((it) => it.id === Number(aId));
    return it ? ` · ${it.name}` : "";
  };
  const removeExpense = (id) => onUpdate({ ...trip, expenses: expenses.filter((e) => e.id !== id) });

  return (
    <div className="mb-5">
      <div className="text-sm font-semibold mb-2" style={{ color: colors.ink }}>💰 Expenses</div>
      <CategorySubtotal items={expenses} label="Your Total Personal Expenses" trip={trip} onUpdate={onUpdate} />
      <BalancesSummary trip={trip} />
      {expenses.map((e) => {
        const isRich = !!e.splitMethod;
        return (
          <div key={e.id} className="rounded-xl p-3 mb-2" style={{ background: "#fff", boxShadow: "0 2px 8px rgba(22,35,61,0.06)" }}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium min-w-0 truncate" style={{ color: colors.ink }}>{isRich ? (e.merchant || "Expense") : e.description}</div>
              <button onClick={() => removeExpense(e.id)} className="text-xs shrink-0" style={{ color: colors.coral }}>Remove</button>
            </div>
            <div className="text-xs" style={{ color: colors.charcoal, opacity: 0.6 }}>{dayLabel(e.dayId)}{activityLabel(e.dayId, e.activityId)}{isRich && e.date ? ` · ${e.date}` : ""}</div>
            {isRich ? (
              <>
                {e.receiptImage && <img src={e.receiptImage} alt="Receipt" className="rounded-lg mt-1.5" style={{ width: "100%", maxHeight: 100, objectFit: "cover" }} />}
                <div className="text-xs mt-1.5" style={{ color: colors.charcoal, opacity: 0.75 }}>
                  Total {e.total.toFixed(2)} {e.currency} · split {e.splitMethod === "items" ? "by items" : "equally"} among {e.participantIds.length} {e.participantIds.length === 1 ? "person" : "people"} → <b>Your share: {(e.myShare || 0).toFixed(2)} {e.currency}</b>
                </div>
                <DebtorsPanel expense={e} trip={trip} onUpdate={onUpdate} />
              </>
            ) : (
              <CostSummaryLine isGroup={e.isGroup} amount={e.amount} currency={e.currency} pax={e.pax} splitMode={e.splitMode} myShare={e.myShare} />
            )}
          </div>
        );
      })}

      <button onClick={() => setShowAdd(true)} className="w-full py-2.5 rounded-lg text-sm font-semibold" style={{ background: colors.ink, color: colors.paper }}>+ Add Expense</button>
      {showAdd && <ReceiptExpenseModal trip={trip} onUpdate={onUpdate} onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function InviteFriendsModal({ trip, onUpdate, onClose }) {
  const collaborators = trip.collaborators || [];
  const isInvited = (id) => collaborators.some((c) => c.id === id);
  const getPermission = (id) => collaborators.find((c) => c.id === id)?.permission || "view";

  const toggleInvite = (f) => {
    let newCollabs;
    if (isInvited(f.id)) {
      newCollabs = collaborators.filter((c) => c.id !== f.id);
    } else {
      newCollabs = [...collaborators, { id: f.id, name: f.name, emoji: f.emoji, permission: "view" }];
    }
    const justCreated = collaborators.length === 0 && newCollabs.length > 0;
    onUpdate({
      ...trip,
      collaborators: newCollabs,
      groupChat: justCreated ? { messages: [{ from: "system", text: `Group chat created for ${trip.name}` }] } : trip.groupChat,
    });
  };
  const setPermission = (id, permission) => onUpdate({ ...trip, collaborators: collaborators.map((c) => (c.id === id ? { ...c, permission } : c)) });

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(22,35,61,0.5)", overflowX: "hidden" }}>
      <div className="w-full max-w-[460px] sm:max-w-[640px] lg:max-w-[820px] rounded-t-3xl px-5 py-5" style={{ background: colors.paper, maxHeight: "82%", overflowY: "auto" }}>
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontFamily: serif, color: colors.ink }} className="text-lg font-semibold">Invite Friends</span>
          <button onClick={onClose} className="text-xl">✕</button>
        </div>
        <p className="text-xs mb-4" style={{ color: colors.charcoal, opacity: 0.6 }}>Invited travelers can see this trip and join its shared group chat. Choose View only or Can edit for each person.</p>
        {FRIEND_DIRECTORY.map((f) => {
          const invited = isInvited(f.id);
          return (
            <div key={f.id} className="flex items-center gap-2.5 py-2.5" style={{ borderBottom: `1px solid ${colors.ink}12` }}>
              <div className="rounded-full flex items-center justify-center text-xl shrink-0" style={{ width: 40, height: 40, background: colors.paperDim }}>{f.emoji}</div>
              <div className="flex-1 text-sm font-semibold min-w-0 truncate" style={{ color: colors.ink }}>{f.name}</div>
              {invited && (
                <select value={getPermission(f.id)} onChange={(e) => setPermission(f.id, e.target.value)} className="text-[11px] rounded-lg border px-1.5 py-1 shrink-0" style={{ borderColor: colors.ink + "25", background: "#fff", color: colors.charcoal }}>
                  <option value="view">View only</option>
                  <option value="edit">Can edit</option>
                </select>
              )}
              <button onClick={() => toggleInvite(f)} className="text-xs px-3 py-1.5 rounded-full font-semibold shrink-0" style={{ background: invited ? colors.paperDim : colors.coral, color: invited ? colors.charcoal : "#fff" }}>
                {invited ? "Remove" : "Invite"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function GroupChatScreen({ trip, onUpdate, onBack }) {
  const messages = trip.groupChat?.messages || [];
  const [draft, setDraft] = useState("");
  const participants = [{ id: "me", name: "You", emoji: "🙂" }, ...(trip.collaborators || [])];
  const send = () => {
    if (!draft.trim()) return;
    onUpdate({ ...trip, groupChat: { messages: [...messages, { from: "you", text: draft.trim() }] } });
    setDraft("");
  };
  return (
    <div className="absolute inset-0 z-50 flex justify-center" style={{ background: "rgba(22,35,61,0.5)", overflowX: "hidden", width: "100%" }}>
      <div className="max-w-[460px] sm:max-w-[640px] lg:max-w-[820px] flex flex-col" style={{ background: colors.paper, height: "100%", minHeight: 0, width: "100%", boxSizing: "border-box", overflowX: "hidden" }}>
        <div className="px-5 lg:px-8 pt-7 pb-3" style={{ borderBottom: `1px solid ${colors.ink}15`, width: "100%", boxSizing: "border-box", overflowX: "hidden" }}>
          <div className="flex items-center gap-3 mb-2">
            <button onClick={onBack} className="text-xl" style={{ color: colors.ink }}>←</button>
            <span style={{ fontFamily: serif, color: colors.ink }} className="text-lg font-semibold">{trip.name}</span>
          </div>
          <div className="flex items-center gap-1.5 pl-8 flex-wrap">
            {participants.map((p) => (
              <div key={p.id} className="rounded-full flex items-center justify-center text-sm shrink-0" style={{ width: 26, height: 26, background: colors.paperDim }} title={p.name}>{p.emoji}</div>
            ))}
            <span className="text-[11px] ml-1" style={{ color: colors.charcoal, opacity: 0.5 }}>{participants.length} in this trip chat</span>
          </div>
        </div>
        <div className="flex-1 px-5 py-4 flex flex-col gap-2" style={{ minHeight: 0, overflowY: "auto", overflowX: "hidden", width: "100%", boxSizing: "border-box" }}>
          {messages.map((m, i) => m.from === "system" ? (
            <div key={i} className="text-[11px] text-center py-1" style={{ color: colors.charcoal, opacity: 0.5 }}>{m.text}</div>
          ) : (
            <div key={i} className="max-w-[75%] px-3 py-2 rounded-2xl text-sm" style={{ alignSelf: m.from === "you" ? "flex-end" : "flex-start", background: m.from === "you" ? colors.coral : "#fff", color: m.from === "you" ? "#fff" : colors.charcoal }}>{m.text}</div>
          ))}
          {messages.length === 0 && <p className="text-sm text-center py-6" style={{ color: colors.charcoal, opacity: 0.5 }}>No messages yet — say hi to the group!</p>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 20, paddingRight: 20, paddingTop: 12, paddingBottom: 12, borderTop: `1px solid ${colors.ink}15`, width: "100%", boxSizing: "border-box" }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Message the group..." className="rounded-full text-sm border outline-none" style={{ borderColor: colors.ink + "25", flex: "1 1 auto", minWidth: 0, width: "100%", padding: "8px 12px", boxSizing: "border-box" }} />
          <button onClick={send} className="rounded-full flex items-center justify-center text-white" style={{ width: 38, height: 38, minWidth: 38, flexShrink: 0, background: colors.ink }}>➤</button>
        </div>
      </div>
    </div>
  );
}
function TripDetail({ trip, onUpdate, onBack }) {
  const [view, setView] = useState("overview"); // overview | itinerary | expenses
  const [focusDay, setFocusDay] = useState(null);
  const [draftDays, setDraftDays] = useState(trip.days);
  const [showInvite, setShowInvite] = useState(false);
  const [financeTab, setFinanceTab] = useState("flights");
  const [showGroupChat, setShowGroupChat] = useState(false);
  const dirty = JSON.stringify(draftDays) !== JSON.stringify(trip.days);
  const collaborators = trip.collaborators || [];

  const updateDay = (updatedDay) => setDraftDays((ds) => ds.map((d) => (d.id === updatedDay.id ? updatedDay : d)));
  const toggleStatus = () => onUpdate({ ...trip, days: draftDays, status: trip.status === "completed" ? "upcoming" : "completed" });
  const selectDay = (id) => { setFocusDay(id); setView("itinerary"); setTimeout(() => document.getElementById(`day-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50); };
  const moveItem = (item, fromDayId, toDayId) => {
    if (fromDayId === toDayId) return;
    setDraftDays((ds) => ds.map((d) => {
      if (d.id === fromDayId) return { ...d, items: d.items.filter((i) => i.id !== item.id) };
      if (d.id === toDayId) return { ...d, items: [...d.items, item] };
      return d;
    }));
  };
  const aiSuggestFullTrip = () => setDraftDays((ds) => ds.map((d) => ({ ...d, items: aiOptimizeRoute(d.items) })));
  const saveItinerary = () => onUpdate({ ...trip, days: draftDays });
  const liveTrip = { ...trip, days: draftDays };

  return (
    <div>
      <button onClick={onBack} className="text-sm mb-3" style={{ color: colors.lagoon }}>← All trips</button>
      <div className="rounded-2xl p-4 mb-4" style={{ background: colors.ink, color: colors.paper }}>
        <div className="flex items-center justify-between mb-1 gap-2">
          <div className="text-xs uppercase tracking-widest opacity-70 truncate min-w-0" style={{ fontFamily: mono }}>✈️ {trip.destination}</div>
          <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0" style={{ background: trip.status === "completed" ? colors.lagoon : colors.coral, color: "#fff" }}>{trip.status === "completed" ? "Completed" : "Upcoming"}</span>
        </div>
        <div style={{ fontFamily: serif }} className="text-xl font-semibold">{trip.name}</div>
        <div className="text-xs opacity-70 mt-0.5">{fmtDate(new Date(trip.start))} – {fmtDate(new Date(trip.end))} · {trip.days.length} days</div>
        <button onClick={toggleStatus} className="text-xs mt-3 px-3 py-1.5 rounded-full font-medium" style={{ background: "rgba(255,255,255,0.15)", color: colors.paper }}>{trip.status === "completed" ? "↺ Mark as upcoming" : "✓ Mark trip as completed"}</button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setShowInvite(true)} className="flex-1 py-2.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-1.5" style={{ background: colors.paperDim, color: colors.ink }}>
          👥 Invite Friends {collaborators.length > 0 && `(${collaborators.length})`}
        </button>
        {collaborators.length > 0 && (
          <button onClick={() => setShowGroupChat(true)} className="flex-1 py-2.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-1.5" style={{ background: colors.lagoon, color: "#fff" }}>
            💬 Group Chat
          </button>
        )}
      </div>
      {collaborators.length > 0 && (
        <div className="flex items-center gap-1.5 mb-4 -mt-2 flex-wrap">
          {collaborators.map((c) => (
            <span key={c.id} className="text-[10px] px-2 py-1 rounded-full flex items-center gap-1" style={{ background: colors.paperDim, color: colors.charcoal }}>
              {c.emoji} {c.name.split(" ")[0]} · <span style={{ color: c.permission === "edit" ? colors.coral : colors.lagoon }}>{c.permission === "edit" ? "Can edit" : "View only"}</span>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-4 p-1 rounded-full" style={{ background: colors.paperDim }}>
        {[["overview", "Overview"], ["itinerary", "Itinerary"], ["expenses", "Expenses"]].map(([key, label]) => (
          <button key={key} onClick={() => setView(key)} className="flex-1 min-w-0 py-2 rounded-full text-sm font-medium truncate px-0.5" style={{ background: view === key ? colors.ink : "transparent", color: view === key ? colors.paper : colors.charcoal }}>{label}</button>
        ))}
      </div>
      {view === "overview" && <TripMapOverview trip={liveTrip} onSelectDay={selectDay} />}
      {view === "itinerary" && (
        <>
          {draftDays.length > 1 && (
            <button onClick={aiSuggestFullTrip} className="w-full py-2.5 rounded-2xl text-sm font-semibold mb-3" style={{ background: colors.coral, color: "#fff" }}>✨ AI suggest full itinerary rearrangement</button>
          )}
          {draftDays.map((day) => <DayCard key={day.id} day={day} allDays={draftDays} onUpdateDay={updateDay} onMoveItem={moveItem} forceOpen={focusDay === day.id} />)}

          {dirty && <p className="text-[11px] mt-1 mb-2 text-center" style={{ color: colors.coral }}>You have unsaved changes to this itinerary.</p>}
          <button
            onClick={saveItinerary}
            disabled={!dirty}
            className="w-full py-3 rounded-2xl text-sm font-semibold mt-1 mb-6"
            style={{ background: dirty ? colors.lagoon : colors.paperDim, color: dirty ? "#fff" : colors.charcoal, opacity: dirty ? 1 : 0.6 }}
          >
            💾 {dirty ? "Save itinerary" : "Saved"}
          </button>
        </>
      )}
      {view === "expenses" && (
        <>
          <TripCostSummary trip={trip} onUpdate={onUpdate} />
          <div className="flex gap-1 mb-4 p-1 rounded-full" style={{ background: colors.paperDim }}>
            {[["flights", "✈️ Flights"], ["stay", "🏨 Stay"], ["commute", "🚕 Commute"], ["expenses", "💰 Expenses"]].map(([key, label]) => (
              <button key={key} onClick={() => setFinanceTab(key)} className="flex-1 min-w-0 py-2 rounded-full text-[11px] font-semibold truncate px-0.5" style={{ background: financeTab === key ? colors.ink : "transparent", color: financeTab === key ? colors.paper : colors.charcoal }}>{label}</button>
            ))}
          </div>
          {financeTab === "flights" && <FlightsSection trip={trip} onUpdate={onUpdate} />}
          {financeTab === "stay" && <AccommodationsSection trip={trip} onUpdate={onUpdate} />}
          {financeTab === "commute" && <CommuteSection trip={trip} onUpdate={onUpdate} />}
          {financeTab === "expenses" && <ExpensesSection trip={trip} onUpdate={onUpdate} />}
        </>
      )}
      {showInvite && <InviteFriendsModal trip={trip} onUpdate={onUpdate} onClose={() => setShowInvite(false)} />}
      {showGroupChat && <GroupChatScreen trip={trip} onUpdate={onUpdate} onBack={() => setShowGroupChat(false)} />}
    </div>
  );
}
function TripsTab({ trips, setTrips }) {
  const [mode, setMode] = useState("list");
  const [activeId, setActiveId] = useState(null);
  const activeTrip = trips.find((t) => t.id === activeId);
  const createTrip = (trip) => { setTrips((t) => [...t, trip]); setActiveId(trip.id); setMode("detail"); };
  const updateTrip = (updated) => setTrips((t) => t.map((tr) => (tr.id === updated.id ? updated : tr)));
  if (mode === "new") return <div className="px-5 lg:px-8"><NewTripForm onCreate={createTrip} onCancel={() => setMode("list")} /></div>;
  if (mode === "detail" && activeTrip) return <div className="px-5 lg:px-8"><TripDetail key={activeTrip.id} trip={activeTrip} onUpdate={updateTrip} onBack={() => setMode("list")} /></div>;
  return (
    <div className="px-5 lg:px-8">
      <h1 style={{ fontFamily: serif, color: colors.ink }} className="text-2xl font-semibold pt-2 pb-3">Trip Planner</h1>
      <GlobalBalancesSummary trips={trips} />
      <button onClick={() => setMode("new")} className="w-full py-3 rounded-2xl text-sm font-semibold mb-4 border-2 border-dashed" style={{ borderColor: colors.ink + "40", color: colors.ink }}>+ Plan a new trip</button>
      {trips.length === 0 && <p className="text-sm text-center mt-8" style={{ color: colors.charcoal, opacity: 0.5 }}>No trips yet — plan your first one above.</p>}
      {trips.map((trip) => (
        <button key={trip.id} onClick={() => { setActiveId(trip.id); setMode("detail"); }} className="w-full text-left rounded-2xl p-4 mb-3" style={{ background: "#fff", boxShadow: "0 2px 8px rgba(22,35,61,0.06)" }}>
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold" style={{ color: colors.ink }}>{trip.name}</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: trip.status === "completed" ? colors.lagoon + "22" : colors.coral + "22", color: trip.status === "completed" ? colors.lagoon : colors.coral }}>{trip.status === "completed" ? "Completed" : "Upcoming"}</span>
          </div>
          <div className="text-xs mt-0.5" style={{ color: colors.charcoal, opacity: 0.6 }}>{trip.destination} · {fmtDate(new Date(trip.start))} – {fmtDate(new Date(trip.end))} · {trip.days.length} days</div>
        </button>
      ))}
    </div>
  );
}

/* ===========================================================
   ALBUM TAB
=========================================================== */
const MAX_ALBUM_ITEMS = 1000;
const PLACEHOLDER_THUMBS = ["🏯", "🌊", "🗻", "🎎", "🥥", "🌌"];
const INITIAL_ALBUM = [
  { id: 1, type: "photo", thumb: "🏯", caption: "Fushimi Inari before sunrise", date: "140326", likes: 24, likedByMe: false, duplicateOf: null },
  { id: 2, type: "photo", thumb: "🏯", caption: "Another shot of the shrine gates", date: "140326", likes: 5, likedByMe: false, duplicateOf: 1 },
  { id: 3, type: "video", thumb: "🎥", caption: "Walking through Gion at night", date: "150326", likes: 41, likedByMe: true, duplicateOf: null },
];
const MUSIC_TRACKS = [
  { key: "upbeat", label: "🎉 Upbeat" }, { key: "chill", label: "🌊 Chill" },
  { key: "cinematic", label: "🎬 Cinematic" }, { key: "acoustic", label: "🎸 Acoustic" },
];
function ReelCard({ photos, reel, onSave, readOnly, canSeePrivate = true }) {
  const [music, setMusic] = useState("upbeat");
  const [generating, setGenerating] = useState(false);
  const [posted, setPosted] = useState(null);
  const [replayIdx, setReplayIdx] = useState(null);
  const replayTimer = useRef(null);

  const generate = () => {
    setGenerating(true);
    const shuffled = [...photos].sort(() => Math.random() - 0.5).slice(0, 5);
    setTimeout(() => {
      onSave && onSave({ music, clip: shuffled });
      setGenerating(false);
    }, 1400);
  };
  const repost = (p) => { setPosted(p); setTimeout(() => setPosted(null), 2000); };
  const replay = () => {
    if (!reel || reel.clip.length === 0) return;
    clearInterval(replayTimer.current);
    let i = 0;
    setReplayIdx(0);
    replayTimer.current = setInterval(() => {
      i++;
      if (i >= reel.clip.length) { clearInterval(replayTimer.current); setReplayIdx(null); return; }
      setReplayIdx(i);
    }, 450);
  };
  const musicLabel = MUSIC_TRACKS.find((m) => m.key === reel?.music)?.label || "";

  if (!reel && readOnly) {
    return (
      <div className="rounded-2xl p-4 mb-4 text-center" style={{ background: colors.paperDim }}>
        <span className="text-xs" style={{ color: colors.charcoal, opacity: 0.55 }}>🎬 No reel yet for this album.</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: colors.ink }}>
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontFamily: serif, color: colors.paper }} className="text-base font-semibold">🎬 AI Reel</span>
        {!reel && photos.length === 0 && <span className="text-[10px]" style={{ color: colors.paper, opacity: 0.5 }}>Add photos first</span>}
      </div>

      {reel ? (
        <>
          <div className="flex gap-1.5 mb-3 overflow-x-auto">
            {reel.clip.map((p, i) => {
              const hidden = p.private && !canSeePrivate;
              const active = replayIdx === i;
              return (
                <div
                  key={i}
                  className="rounded-xl flex items-center justify-center text-2xl shrink-0 transition-transform"
                  style={{ width: 52, height: 52, background: active ? colors.coral : "rgba(255,255,255,0.1)", transform: active ? "scale(1.12)" : "scale(1)" }}
                >
                  {hidden ? "🔒" : p.thumb}
                </div>
              );
            })}
          </div>
          <p className="text-xs mb-3" style={{ color: colors.paper, opacity: 0.75 }}>60s reel · {musicLabel} soundtrack{readOnly ? " · view only" : ""}</p>
          {readOnly ? (
            <button onClick={replay} className="w-full py-2.5 rounded-full text-sm font-semibold" style={{ background: "rgba(255,255,255,0.12)", color: colors.paper }}>▶ Replay</button>
          ) : (
            <div className="flex gap-2 mb-1">
              {[{ label: "Instagram", emoji: "📸" }, { label: "TikTok", emoji: "🎵" }, { label: "Facebook", emoji: "📘" }].map((p) => (
                <button key={p.label} onClick={() => repost(p.label)} className="flex-1 py-2 rounded-full text-[11px] font-semibold" style={{ background: "rgba(255,255,255,0.12)", color: colors.paper }}>{p.emoji} {p.label}</button>
              ))}
            </div>
          )}
          {posted && <p className="text-xs text-center mt-2" style={{ color: colors.lagoon }}>✓ Reposted to {posted}!</p>}
        </>
      ) : (
        <>
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {MUSIC_TRACKS.map((m) => (
              <button key={m.key} onClick={() => setMusic(m.key)} className="px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: music === m.key ? colors.coral : "rgba(255,255,255,0.12)", color: colors.paper }}>{m.label}</button>
            ))}
          </div>
          <button
            onClick={generate}
            disabled={photos.length === 0 || generating}
            className="w-full py-2.5 rounded-full text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: colors.coral, color: "#fff", opacity: photos.length === 0 ? 0.5 : 1 }}
          >
            {generating ? (
              <><span className="rounded-full animate-spin" style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", display: "inline-block" }} /> Editing your reel...</>
            ) : "✨ Generate 60s reel"}
          </button>
          <p className="text-[10px] text-center mt-2" style={{ color: colors.paper, opacity: 0.4 }}>One reel per album — this can't be regenerated once created.</p>
        </>
      )}
    </div>
  );
}
function DuplicateReview({ album, setAlbum, onClose }) {
  const pairs = album.filter((a) => a.duplicateOf);
  const originalOf = (id) => album.find((a) => a.id === id);
  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(22,35,61,0.55)", overflowX: "hidden" }}>
      <div className="w-full max-w-[460px] sm:max-w-[640px] lg:max-w-[820px] rounded-t-3xl px-5 py-5" style={{ background: colors.paper, maxHeight: "80%", overflowY: "auto" }}>
        <div className="flex items-center justify-between mb-4"><span style={{ fontFamily: serif, color: colors.ink }} className="text-lg font-semibold">Possible duplicates</span><button onClick={onClose} className="text-xl">✕</button></div>
        {pairs.map((dup) => { const orig = originalOf(dup.duplicateOf); return (
          <div key={dup.id} className="mb-4 pb-4" style={{ borderBottom: `1px solid ${colors.ink}12` }}>
            <div className="flex gap-3 mb-3">{[orig, dup].map((item) => item && <div key={item.id} className="flex-1 rounded-xl flex flex-col items-center py-4" style={{ background: colors.paperDim }}><span className="text-3xl mb-1">{item.thumb}</span><span className="text-[10px] text-center px-1" style={{ color: colors.charcoal, opacity: 0.7 }}>{item.caption}</span></div>)}</div>
            <div className="flex gap-2">
              <button onClick={() => setAlbum((prev) => prev.filter((a) => a.id !== dup.id))} className="flex-1 py-2 rounded-full text-xs font-semibold" style={{ background: colors.stampRed, color: "#fff" }}>🗑️ Delete similar one</button>
              <button onClick={() => setAlbum((prev) => prev.map((a) => (a.id === dup.id ? { ...a, duplicateOf: null } : a)))} className="flex-1 py-2 rounded-full text-xs font-semibold" style={{ background: colors.paperDim, color: colors.charcoal }}>Keep both</button>
            </div>
          </div>
        ); })}
      </div>
    </div>
  );
}
function TripAlbumCard({ trip, onClick }) {
  const photos = trip.photos || [];
  const cover = photos[0];
  return (
    <button onClick={onClick} className="rounded-2xl overflow-hidden text-left" style={{ background: "#fff", boxShadow: "0 2px 8px rgba(22,35,61,0.08)" }}>
      <div className="flex items-center justify-center text-4xl" style={{ height: 100, background: colors.paperDim }}>{cover ? cover.thumb : "📷"}</div>
      <div className="px-2.5 py-2">
        <div className="text-xs font-semibold truncate" style={{ color: colors.ink }}>{trip.name}</div>
        <div className="text-[10px]" style={{ color: colors.charcoal, opacity: 0.55 }}>{photos.length} photo{photos.length !== 1 ? "s" : ""}</div>
      </div>
    </button>
  );
}
function DayBanner({ title, subtitle, count, emoji, onClick, tone }) {
  return (
    <button onClick={onClick} className="w-full rounded-2xl overflow-hidden mb-3 text-left relative" style={{ height: 84, background: tone || colors.ink }}>
      <div className="absolute inset-0 flex items-center justify-between px-5">
        <div>
          <div style={{ fontFamily: serif, color: colors.paper }} className="text-base font-semibold">{title}</div>
          <div className="text-xs mt-0.5" style={{ color: colors.paper, opacity: 0.7, fontFamily: mono }}>{subtitle} · {count} photo{count !== 1 ? "s" : ""}</div>
        </div>
        <span className="text-3xl opacity-80">{emoji}</span>
      </div>
    </button>
  );
}
function TripAlbumDetail({ trip, onUpdateTrip, onBack }) {
  const [tabView, setTabView] = useState("view"); // view | upload | itinerary
  const [uploadMode, setUploadMode] = useState("mass");
  const [editingId, setEditingId] = useState(null);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [openDayId, setOpenDayId] = useState(null);
  const [viewAll, setViewAll] = useState(false);
  const nextId = useRef(Date.now());
  const photos = trip.photos || [];
  const duplicateCount = photos.filter((p) => p.duplicateOf).length;
  const { groups, undated } = groupPhotosByDay(trip);
  const hasDayOrg = groups.some((g) => g.photos.length > 0);

  const setPhotos = (updater) => onUpdateTrip({ ...trip, photos: typeof updater === "function" ? updater(photos) : updater });
  const addPhotos = (dayId, count = 1) => {
    const room = MAX_ALBUM_ITEMS - photos.length;
    const n = Math.max(0, Math.min(count, room));
    if (n === 0) return;
    const newItems = Array.from({ length: n }, (_, i) => {
      const id = nextId.current++;
      return { id, type: "photo", thumb: PLACEHOLDER_THUMBS[(photos.length + i) % PLACEHOLDER_THUMBS.length], caption: "", date: formatDDMMYY(new Date()), likes: 0, likedByMe: false, duplicateOf: null, dayId: dayId || null, private: false };
    });
    setPhotos((prev) => [...newItems, ...prev]);
    setEditingId(newItems[0].id);
    setTabView("view");
    setOpenDayId(dayId || null);
    setViewAll(!dayId);
  };
  const updateCaption = (id, caption) => setPhotos((prev) => prev.map((a) => (a.id === id ? { ...a, caption } : a)));
  const toggleLike = (id) => setPhotos((prev) => prev.map((a) => (a.id === id ? { ...a, likedByMe: !a.likedByMe, likes: a.likes + (a.likedByMe ? -1 : 1) } : a)));
  const togglePrivate = (id) => setPhotos((prev) => prev.map((a) => (a.id === id ? { ...a, private: !a.private } : a)));
  const saveReel = (reel) => onUpdateTrip({ ...trip, reel });

  const PhotoCard = (item) => (
    <div key={item.id} className="rounded-2xl overflow-hidden relative" style={{ background: "#fff", boxShadow: "0 2px 8px rgba(22,35,61,0.08)" }}>
      {item.duplicateOf && <div className="absolute top-2 left-2 z-10 rounded-full px-1.5 py-0.5" style={{ background: colors.stampRed }}><span className="text-[10px]">⚠️</span></div>}
      <button onClick={() => togglePrivate(item.id)} className="absolute top-2 right-2 z-10 rounded-full px-1.5 py-0.5 text-[10px] flex items-center gap-0.5" style={{ background: item.private ? colors.stampRed : "rgba(255,255,255,0.9)", color: item.private ? "#fff" : colors.charcoal }}>
        {item.private ? "🔒 Private" : "🌐 Public"}
      </button>
      <div className="flex items-center justify-center text-4xl relative" style={{ height: 100, background: colors.paperDim }}>{item.thumb}{item.type === "video" && <span className="absolute bottom-1 right-1 text-[10px] bg-black/60 text-white px-1 rounded">▶ video</span>}</div>
      <div className="px-2.5 pt-2 pb-2.5">
        <div className="text-[10px] mb-1" style={{ color: colors.charcoal, opacity: 0.5, fontFamily: mono }}>{item.date}</div>
        {editingId === item.id ? <input autoFocus value={item.caption} onChange={(e) => updateCaption(item.id, e.target.value)} onBlur={() => setEditingId(null)} onKeyDown={(e) => e.key === "Enter" && setEditingId(null)} placeholder="Write a caption..." className="text-xs w-full outline-none border-b pb-0.5 mb-1" style={{ color: colors.charcoal, borderColor: colors.ink + "30" }} /> : <button onClick={() => setEditingId(item.id)} className="text-left w-full mb-1"><span className="text-xs" style={{ color: item.caption ? colors.charcoal : colors.charcoal + "80" }}>{item.caption || "Add a caption..."}</span></button>}
        <button onClick={() => toggleLike(item.id)} className="flex items-center gap-1 mt-1"><Heart filled={item.likedByMe} /><span className="text-[11px]" style={{ color: colors.charcoal }}>{item.likes}</span></button>
      </div>
    </div>
  );

  const openDayGroup = groups.find((g) => g.day.id === openDayId);
  const openDayPhotos = openDayId === "undated" ? undated : (openDayGroup?.photos || []);
  const allPhotosChrono = [...groups.flatMap((g) => g.photos), ...undated];

  return (
    <div className="px-5 lg:px-8">
      <button onClick={onBack} className="text-sm mb-3" style={{ color: colors.lagoon }}>← My Albums</button>
      <div className="flex items-center justify-between pb-3">
        <h1 style={{ fontFamily: serif, color: colors.ink }} className="text-xl font-semibold">{trip.name}</h1>
        <span className="text-[11px]" style={{ color: colors.charcoal, opacity: 0.55, fontFamily: mono }}>{photos.length}/{MAX_ALBUM_ITEMS}</span>
      </div>

      <ReelCard photos={photos} reel={trip.reel} onSave={saveReel} readOnly={false} />

      <div className="flex gap-2 mb-4 p-1 rounded-full" style={{ background: colors.paperDim }}>
        {[["view", "View"], ["upload", "Upload"], ["itinerary", "Itinerary"]].map(([key, label]) => (
          <button key={key} onClick={() => { setTabView(key); setOpenDayId(null); setViewAll(false); }} className="flex-1 py-2 rounded-full text-sm font-medium" style={{ background: tabView === key ? colors.ink : "transparent", color: tabView === key ? colors.paper : colors.charcoal }}>{label}</button>
        ))}
      </div>

      {tabView === "itinerary" && (
        <div className="pb-10">
          {trip.days.map((day) => (
            <div key={day.id} className="mb-3 rounded-2xl p-3" style={{ background: "#fff", boxShadow: "0 2px 8px rgba(22,35,61,0.06)" }}>
              <div className="text-sm font-semibold mb-2" style={{ color: colors.ink }}>Day {day.id} · {day.city} <span className="text-[11px] font-normal" style={{ color: colors.charcoal, opacity: 0.5, fontFamily: mono }}>{day.date}</span></div>
              {day.items.length === 0 && <p className="text-xs" style={{ color: colors.charcoal, opacity: 0.45 }}>No stops added yet.</p>}
              {day.items.map((it) => (
                <div key={it.id} className="flex items-center gap-2 py-1">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: colors.lagoon }} />
                  <div className="text-sm" style={{ color: colors.charcoal }}>{it.name}{it.category && <span style={{ opacity: 0.5 }}> — {it.category}</span>}</div>
                </div>
              ))}
            </div>
          ))}
          <p className="text-[11px] text-center mt-2" style={{ color: colors.charcoal, opacity: 0.45 }}>Edit stops from "View My Profile" → My Trips.</p>
        </div>
      )}

      {tabView === "upload" && (
        <>
          <div className="flex gap-2 mb-4 p-1 rounded-full" style={{ background: colors.paperDim }}>
            {[["mass", "Mass Upload"], ["day", "By Day"]].map(([key, label]) => (
              <button key={key} onClick={() => setUploadMode(key)} className="flex-1 py-2 rounded-full text-sm font-medium" style={{ background: uploadMode === key ? colors.ink : "transparent", color: uploadMode === key ? colors.paper : colors.charcoal }}>{label}</button>
            ))}
          </div>
          {uploadMode === "mass" ? (
            <button onClick={() => addPhotos(null, 3)} className="w-full py-3 rounded-2xl text-sm font-semibold mb-4 border-2 border-dashed" style={{ borderColor: colors.ink + "40", color: colors.ink }}>📷 Choose files — uploads into the album, unsorted</button>
          ) : (
            <div className="mb-4">
              <p className="text-[11px] mb-2" style={{ color: colors.charcoal, opacity: 0.5 }}>Select multiple files per day — they'll be tagged and shown chronologically.</p>
              {trip.days.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2.5" style={{ borderBottom: `1px solid ${colors.ink}12` }}>
                  <div><div className="text-sm font-medium" style={{ color: colors.ink }}>Day {d.id} · {d.city}</div><div className="text-xs" style={{ color: colors.charcoal, opacity: 0.55, fontFamily: mono }}>{d.date}</div></div>
                  <button onClick={() => addPhotos(d.id, 3)} className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: colors.lagoon, color: "#fff" }}>📷 Mass upload</button>
                </div>
              ))}
            </div>
          )}
          {duplicateCount > 0 && <button onClick={() => setShowDuplicates(true)} className="w-full py-2.5 rounded-xl text-xs font-medium mb-3" style={{ background: "#F5DCC0", color: colors.stampRed }}>⚠️ {duplicateCount} possibly similar photo{duplicateCount > 1 ? "s" : ""} found — Review</button>}
        </>
      )}

      {tabView === "view" && (
        <div className="pb-10">
          {!hasDayOrg ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{allPhotosChrono.map(PhotoCard)}</div>
          ) : openDayId ? (
            <>
              <button onClick={() => setOpenDayId(null)} className="text-sm mb-3" style={{ color: colors.lagoon }}>← All days</button>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{openDayPhotos.map(PhotoCard)}</div>
            </>
          ) : viewAll ? (
            <>
              <button onClick={() => setViewAll(false)} className="text-sm mb-3" style={{ color: colors.lagoon }}>← Back to days</button>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{allPhotosChrono.map(PhotoCard)}</div>
            </>
          ) : (
            <>
              {groups.filter((g) => g.photos.length > 0).map(({ day, photos: dayPhotos }) => (
                <DayBanner key={day.id} title={`Day ${day.id} · ${day.city}`} subtitle={day.date} count={dayPhotos.length} emoji={dayPhotos[0]?.thumb || "📷"} onClick={() => setOpenDayId(day.id)} />
              ))}
              {undated.length > 0 && (
                <DayBanner title="Other Photos" subtitle="Unsorted" count={undated.length} emoji={undated[0]?.thumb || "📷"} tone={colors.charcoal} onClick={() => setOpenDayId("undated")} />
              )}
              {photos.length > 0 && <button onClick={() => setViewAll(true)} className="text-sm mt-1" style={{ color: colors.lagoon }}>View all photos →</button>}
            </>
          )}
          {photos.length === 0 && <p className="text-sm text-center py-6" style={{ color: colors.charcoal, opacity: 0.5 }}>No photos yet — switch to Upload to add some.</p>}
        </div>
      )}

      {showDuplicates && <DuplicateReview album={photos} setAlbum={setPhotos} onClose={() => setShowDuplicates(false)} />}
    </div>
  );
}
function AllAlbumsView({ trips, onOpenTrip, onBack }) {
  return (
    <div className="px-5 lg:px-8">
      <button onClick={onBack} className="text-sm mb-3" style={{ color: colors.lagoon }}>← My Albums</button>
      <div className="flex items-center justify-between pb-3">
        <h1 style={{ fontFamily: serif, color: colors.ink }} className="text-xl font-semibold">All Albums</h1>
        <span className="text-[11px]" style={{ color: colors.charcoal, opacity: 0.55, fontFamily: mono }}>{trips.length} total</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-10">
        {trips.map((trip) => <TripAlbumCard key={trip.id} trip={trip} onClick={() => onOpenTrip(trip.id)} />)}
        {trips.length === 0 && <p className="col-span-2 text-sm text-center py-8" style={{ color: colors.charcoal, opacity: 0.5 }}>No albums yet — plan a trip to start one.</p>}
      </div>
    </div>
  );
}
function AlbumTab({ trips, setTrips }) {
  const [openTripId, setOpenTripId] = useState(null);
  const [viewAll, setViewAll] = useState(false);
  const years = trips.map(getTripYear);
  const [year, setYear] = useState(() => (years.length ? Math.max(...years) : new Date().getFullYear()));
  useEffect(() => {
    if (years.length === 0) return;
    const newestYear = Math.max(...years);
    if (newestYear > year) setYear(newestYear);
  }, [trips.length]);
  const filteredTrips = trips.filter((t) => getTripYear(t) === year);

  const openTrip = trips.find((t) => t.id === openTripId);
  if (openTrip) {
    return <TripAlbumDetail trip={openTrip} onUpdateTrip={(updated) => setTrips((ts) => ts.map((t) => (t.id === updated.id ? updated : t)))} onBack={() => setOpenTripId(null)} />;
  }
  if (viewAll) return <AllAlbumsView trips={trips} onOpenTrip={(id) => { setViewAll(false); setOpenTripId(id); }} onBack={() => setViewAll(false)} />;

  return (
    <div className="px-5 lg:px-8">
      <h1 style={{ fontFamily: serif, color: colors.ink }} className="text-2xl font-semibold pt-2 pb-1">My Albums</h1>
      <p className="text-xs mb-4" style={{ color: colors.charcoal, opacity: 0.55 }}>Organized by trip — one album per trip</p>

      <button onClick={() => setViewAll(true)} className="w-full rounded-2xl p-3 mb-4 flex items-center justify-between" style={{ background: colors.ink, color: colors.paper }}>
        <span className="text-sm font-semibold">🗂️ View All Albums</span>
        <span className="text-xs opacity-70">{trips.length} total</span>
      </button>

      {trips.length > 0 && <YearSlider years={years} year={year} setYear={setYear} />}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-10">
        {filteredTrips.map((trip) => <TripAlbumCard key={trip.id} trip={trip} onClick={() => setOpenTripId(trip.id)} />)}
        {trips.length > 0 && filteredTrips.length === 0 && <p className="col-span-2 text-sm text-center py-8" style={{ color: colors.charcoal, opacity: 0.5 }}>No albums from {year}.</p>}
        {trips.length === 0 && <p className="col-span-2 text-sm text-center py-8" style={{ color: colors.charcoal, opacity: 0.5 }}>Plan a trip first to start an album for it.</p>}
      </div>
    </div>
  );
}

/* ===========================================================
   SOCIAL TAB — find friends by unique ID
=========================================================== */
function SocialTab({ onOpenProfile, relationships, onSimulateAccept }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const statusOf = (id) => relationships[id]?.status || "none";
  const friends = FRIEND_DIRECTORY.filter((f) => statusOf(f.id) === "friends");
  const following = FRIEND_DIRECTORY.filter((f) => statusOf(f.id) === "following");
  const pending = FRIEND_DIRECTORY.filter((f) => statusOf(f.id) === "pending");

  const search = () => {
    const found = FRIEND_DIRECTORY.find((f) => f.id.toLowerCase() === query.trim().toLowerCase());
    setResult(found || null);
    setNotFound(!found && query.trim().length > 0);
  };

  const PersonRow = ({ f, tag, tagColor, extra }) => (
    <div className="w-full rounded-2xl p-3 mb-2 flex items-center gap-3" style={{ background: "#fff", boxShadow: "0 2px 8px rgba(22,35,61,0.06)" }}>
      <button onClick={() => onOpenProfile(f)} className="flex items-center gap-3 flex-1 text-left">
        <div className="rounded-full flex items-center justify-center text-xl" style={{ width: 40, height: 40, background: colors.paperDim }}>{f.emoji}</div>
        <div className="flex-1">
          <div className="text-sm font-semibold" style={{ color: colors.ink }}>{f.name}</div>
          <div className="text-[10px]" style={{ color: colors.charcoal, opacity: 0.5 }}>{f.countries} countries</div>
        </div>
      </button>
      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: tagColor + "22", color: tagColor }}>{tag}</span>
      {extra}
    </div>
  );

  return (
    <div className="px-5 lg:px-8">
      <h1 style={{ fontFamily: serif, color: colors.ink }} className="text-2xl font-semibold pt-2 pb-1">Find Friends</h1>
      <p className="text-xs mb-4" style={{ color: colors.charcoal, opacity: 0.55 }}>Your ID: <span style={{ fontFamily: mono }}>{MY_PROFILE_ID}</span> — share it so friends can find you</p>
      <div className="flex gap-2 mb-4">
        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Enter a Profile ID e.g. WF-4821" className="flex-1 px-3 py-2.5 rounded-xl border text-sm" style={{ borderColor: colors.ink + "25" }} />
        <button onClick={search} className="px-4 rounded-xl text-sm font-semibold" style={{ background: colors.ink, color: colors.paper }}>Search</button>
      </div>
      {notFound && <p className="text-xs mb-4" style={{ color: colors.stampRed }}>No profile found with that ID.</p>}
      {result && (
        <button onClick={() => onOpenProfile(result)} className="w-full text-left rounded-2xl p-4 mb-5 flex items-center gap-3" style={{ background: "#fff", boxShadow: "0 2px 8px rgba(22,35,61,0.06)" }}>
          <div className="rounded-full flex items-center justify-center text-2xl" style={{ width: 48, height: 48, background: colors.paperDim }}>{result.emoji}</div>
          <div>
            <div className="text-sm font-semibold" style={{ color: colors.ink }}>{result.name}</div>
            <div className="text-[11px]" style={{ color: colors.charcoal, opacity: 0.55 }}>{result.countries} countries · {result.followers} followers</div>
          </div>
        </button>
      )}

      <Section title="Friends — see everything, including private">
        {friends.length === 0 && <p className="text-sm" style={{ color: colors.charcoal, opacity: 0.5 }}>No friends yet.</p>}
        {friends.map((f) => <PersonRow key={f.id} f={f} tag="Friend" tagColor={colors.coral} />)}
      </Section>

      <Section title="Following — see everything except private">
        {following.length === 0 && <p className="text-sm" style={{ color: colors.charcoal, opacity: 0.5 }}>Not following anyone yet — search for a Profile ID above.</p>}
        {following.map((f) => <PersonRow key={f.id} f={f} tag="Following" tagColor={colors.lagoon} />)}
      </Section>

      <Section title="Pending Requests — sent, not yet accepted">
        {pending.length === 0 && <p className="text-sm" style={{ color: colors.charcoal, opacity: 0.5 }}>No pending requests.</p>}
        {pending.map((f) => (
          <PersonRow
            key={f.id} f={f} tag="Pending" tagColor={colors.sand}
            extra={<button onClick={() => onSimulateAccept(f.id)} className="text-[10px] ml-1 underline" style={{ color: colors.charcoal, opacity: 0.55 }}>simulate accept</button>}
          />
        ))}
      </Section>
    </div>
  );
}

/* ===========================================================
   COUNTRY TIMELINE — year slider + filtered passport stamps
   (used on My Profile and on other users' profiles)
=========================================================== */
const COUNTRY_META = {
  Japan: { code: "JP", flag: "🇯🇵" }, Iceland: { code: "IS", flag: "🇮🇸" }, Portugal: { code: "PT", flag: "🇵🇹" },
  Thailand: { code: "TH", flag: "🇹🇭" }, Hawaii: { code: "HI", flag: "🌺" }, Peru: { code: "PE", flag: "🇵🇪" },
  Indonesia: { code: "ID", flag: "🇮🇩" }, India: { code: "IN", flag: "🇮🇳" }, "South Africa": { code: "ZA", flag: "🇿🇦" },
};
function countryMeta(name) { return COUNTRY_META[name] || { code: name.slice(0, 2).toUpperCase(), flag: "🌍" }; }
function deriveCountryStamps(trips) {
  const map = {};
  (trips || []).forEach((trip) => {
    const year = trip.days?.[0]?.date ? new Date(trip.days[0].date).getFullYear() : null;
    if (!trip.country || !year) return;
    if (!map[trip.country]) map[trip.country] = { name: trip.country, years: new Set(), trips: 0 };
    map[trip.country].years.add(year);
    map[trip.country].trips += 1;
  });
  return Object.values(map).map((c) => ({ ...countryMeta(c.name), name: c.name, years: [...c.years], trips: c.trips }));
}
function getTripYear(trip) {
  const d = trip.start || trip.days?.[0]?.date;
  return d ? new Date(d).getFullYear() : new Date().getFullYear();
}
function YearSlider({ years, year, setYear }) {
  const minYear = years.length ? Math.min(...years) : new Date().getFullYear();
  const maxYear = years.length ? Math.max(...years) : new Date().getFullYear();
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs uppercase tracking-wide" style={{ color: colors.charcoal, opacity: 0.6, fontFamily: mono }}>Timeline</span>
        <span style={{ fontFamily: serif, color: colors.ink }} className="text-lg font-semibold">{year}</span>
      </div>
      <input type="range" min={minYear} max={maxYear} value={year} onChange={(e) => setYear(Number(e.target.value))} disabled={minYear === maxYear} className="w-full year-slider" />
    </div>
  );
}
function PassportStamps({ countries, title = "Passport Stamps" }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 style={{ fontFamily: serif, color: colors.ink }} className="text-lg font-semibold">{title}</h3>
        <span className="text-xs" style={{ color: colors.lagoon }}>{countries.length} total</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {countries.map((c) => (
          <div key={c.code} className="flex flex-col items-center gap-1.5">
            <div className="flex items-center justify-center rounded-full border-2" style={{ width: 66, height: 66, borderStyle: "double", borderWidth: 4, borderColor: colors.stampRed, fontSize: 24 }}>{c.flag}</div>
            <span className="text-xs text-center" style={{ color: colors.charcoal }}>{c.name}</span>
            <span className="text-[10px]" style={{ color: colors.charcoal, opacity: 0.5 }}>{c.trips} trip{c.trips > 1 ? "s" : ""}</span>
          </div>
        ))}
        {countries.length === 0 && <p className="col-span-3 text-sm text-center py-4" style={{ color: colors.charcoal, opacity: 0.5 }}>No countries visited yet.</p>}
      </div>
    </div>
  );
}

/* ===========================================================
   MY PROFILE PAGE — all trips (with itineraries) + picture albums
=========================================================== */
function MyProfilePage({ myProfile, badgeStats, trips, onBack, onOpenAlbumTab, onOpenTripsTab }) {
  const albumYears = trips.map(getTripYear);
  const [albumYear, setAlbumYear] = useState(() => (albumYears.length ? Math.max(...albumYears) : new Date().getFullYear()));
  useEffect(() => {
    if (albumYears.length === 0) return;
    const newestYear = Math.max(...albumYears);
    if (newestYear > albumYear) setAlbumYear(newestYear);
  }, [trips.length]);
  const filteredAlbumTrips = trips.filter((t) => getTripYear(t) === albumYear);
  const totalPhotos = trips.reduce((s, t) => s + (t.photos || []).length, 0);

  return (
    <div className="absolute inset-0 z-50 overflow-y-auto" style={{ background: colors.paper, overflowX: "hidden" }}>
      <div className="w-full max-w-[460px] sm:max-w-[640px] lg:max-w-[820px] mx-auto pb-16">
        <div className="flex items-center gap-3 px-5 pt-7 pb-3">
          <button onClick={onBack} className="text-xl" style={{ color: colors.ink }}>←</button>
          <div>
            <h1 style={{ fontFamily: serif, color: colors.ink }} className="text-xl font-semibold">My Profile</h1>
            <div className="text-[10px]" style={{ color: colors.charcoal, opacity: 0.5, fontFamily: mono }}>{myProfile.id}</div>
          </div>
        </div>
        <div className="px-5 lg:px-8">
          <Badges countries={badgeStats.countries} times={badgeStats.times} percent={badgeStats.percent} />
        </div>

        <div className="px-5 lg:px-8 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 style={{ fontFamily: serif, color: colors.ink }} className="text-lg font-semibold">My Trips</h3>
            <button onClick={onOpenTripsTab} className="text-xs" style={{ color: colors.lagoon }}>Manage in Planner →</button>
          </div>
          {trips.length === 0 && <p className="text-sm" style={{ color: colors.charcoal, opacity: 0.5 }}>No trips yet — plan one in the Trips tab.</p>}
          {trips.map((trip) => (
            <div key={trip.id} className="rounded-2xl p-3 mb-2" style={{ background: "#fff", boxShadow: "0 2px 8px rgba(22,35,61,0.06)" }}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold" style={{ color: colors.ink }}>{trip.name}</div>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: trip.status === "completed" ? colors.lagoon + "22" : colors.coral + "22", color: trip.status === "completed" ? colors.lagoon : colors.coral }}>{trip.status === "completed" ? "Completed" : "Upcoming"}</span>
              </div>
              <div className="text-xs mt-0.5" style={{ color: colors.charcoal, opacity: 0.6 }}>{trip.destination} · {fmtDate(new Date(trip.start))} – {fmtDate(new Date(trip.end))}</div>
            </div>
          ))}
        </div>

        <div className="px-5 lg:px-8 mt-2 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 style={{ fontFamily: serif, color: colors.ink }} className="text-lg font-semibold">My Albums</h3>
            <button onClick={onOpenAlbumTab} className="text-xs" style={{ color: colors.lagoon }}>Manage in Album →</button>
          </div>
          <button onClick={onOpenAlbumTab} className="w-full rounded-2xl p-3 mb-3 flex items-center justify-between" style={{ background: colors.ink, color: colors.paper }}>
            <span className="text-sm font-semibold">🗂️ View All Albums</span>
            <span className="text-xs opacity-70">{trips.length} total</span>
          </button>
          {trips.length > 0 && <YearSlider years={albumYears} year={albumYear} setYear={setAlbumYear} />}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-2">
            {filteredAlbumTrips.map((trip) => <TripAlbumCard key={trip.id} trip={trip} onClick={onOpenAlbumTab} />)}
            {trips.length > 0 && filteredAlbumTrips.length === 0 && <p className="col-span-2 text-sm text-center py-6" style={{ color: colors.charcoal, opacity: 0.5 }}>No albums from {albumYear}.</p>}
            {trips.length === 0 && <p className="col-span-2 text-sm text-center py-6" style={{ color: colors.charcoal, opacity: 0.5 }}>No albums yet — plan a trip to start one.</p>}
          </div>
        </div>

        <div className="px-5 lg:px-8"><PassportStamps countries={VISITED_COUNTRIES} /></div>
      </div>
    </div>
  );
}

/* ===========================================================
   THEIR PROFILE PAGE — friends' trips + albums, gated by relationship
=========================================================== */
function TheirTripView({ trip, friendStatus, onBack }) {
  const [tabView, setTabView] = useState("photos"); // photos | itinerary
  const [likes, setLikes] = useState({}); // ephemeral local likes for viewing
  const [openDayId, setOpenDayId] = useState(null);
  const [viewAll, setViewAll] = useState(false);
  const canSeePrivate = friendStatus === "friends";
  const toggleLike = (id) => setLikes((l) => ({ ...l, [id]: !l[id] }));
  const { groups, undated } = groupPhotosByDay(trip);
  const hasDayOrg = groups.some((g) => g.photos.length > 0);
  const allPhotosChrono = [...groups.flatMap((g) => g.photos), ...undated];
  const openDayGroup = groups.find((g) => g.day.id === openDayId);
  const openDayPhotos = openDayId === "undated" ? undated : (openDayGroup?.photos || []);

  const PhotoTile = (p) => {
    const hidden = p.private && !canSeePrivate;
    const liked = !!likes[p.id];
    return (
      <div key={p.id} className="rounded-2xl overflow-hidden" style={{ background: "#fff", boxShadow: "0 2px 8px rgba(22,35,61,0.08)" }}>
        <div className="flex items-center justify-center text-4xl relative" style={{ height: 100, background: colors.paperDim }}>
          {hidden ? <span className="text-2xl">🔒</span> : p.thumb}
        </div>
        <div className="px-2.5 py-2">
          <div className="text-xs mb-1" style={{ color: colors.charcoal }}>{hidden ? "Private — friends only" : p.caption}</div>
          {!hidden && (
            <button onClick={() => toggleLike(p.id)} className="flex items-center gap-1"><Heart filled={liked} /><span className="text-[11px]" style={{ color: colors.charcoal }}>{(p.likes || 0) + (liked ? 1 : 0)}</span></button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="px-5 lg:px-8">
      <button onClick={onBack} className="text-sm mb-3" style={{ color: colors.lagoon }}>← Trips &amp; Albums</button>
      <h2 style={{ fontFamily: serif, color: colors.ink }} className="text-lg font-semibold mb-3">{trip.name}</h2>

      <ReelCard photos={trip.photos || []} reel={trip.reel} readOnly canSeePrivate={canSeePrivate} />

      <div className="flex gap-2 mb-4 p-1 rounded-full" style={{ background: colors.paperDim }}>
        {[["photos", "Photos"], ["itinerary", "Itinerary"]].map(([key, label]) => (
          <button key={key} onClick={() => { setTabView(key); setOpenDayId(null); setViewAll(false); }} className="flex-1 py-2 rounded-full text-sm font-medium" style={{ background: tabView === key ? colors.ink : "transparent", color: tabView === key ? colors.paper : colors.charcoal }}>{label}</button>
        ))}
      </div>
      {tabView === "photos" ? (
        <div className="pb-8">
          {!hasDayOrg ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{allPhotosChrono.map(PhotoTile)}</div>
          ) : openDayId ? (
            <>
              <button onClick={() => setOpenDayId(null)} className="text-sm mb-3" style={{ color: colors.lagoon }}>← All days</button>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{openDayPhotos.map(PhotoTile)}</div>
            </>
          ) : viewAll ? (
            <>
              <button onClick={() => setViewAll(false)} className="text-sm mb-3" style={{ color: colors.lagoon }}>← Back to days</button>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{allPhotosChrono.map(PhotoTile)}</div>
            </>
          ) : (
            <>
              {groups.filter((g) => g.photos.length > 0).map(({ day, photos }) => (
                <DayBanner key={day.id} title={`Day ${day.id} · ${day.city}`} subtitle={day.date} count={photos.length} emoji={photos[0]?.private && !canSeePrivate ? "🔒" : (photos[0]?.thumb || "📷")} onClick={() => setOpenDayId(day.id)} />
              ))}
              {undated.length > 0 && (
                <DayBanner title="Other Photos" subtitle="Unsorted" count={undated.length} emoji={undated[0]?.thumb || "📷"} tone={colors.charcoal} onClick={() => setOpenDayId("undated")} />
              )}
              {(trip.photos || []).length > 0 && <button onClick={() => setViewAll(true)} className="text-sm mt-1" style={{ color: colors.lagoon }}>View all photos →</button>}
            </>
          )}
          {(trip.photos || []).length === 0 && <p className="text-sm text-center py-6" style={{ color: colors.charcoal, opacity: 0.5 }}>No photos in this trip yet.</p>}
        </div>
      ) : (
        <div className="pb-8">
          {(trip.days || []).map((day) => (
            <div key={day.id} className="mb-3 rounded-2xl p-3" style={{ background: "#fff", boxShadow: "0 2px 8px rgba(22,35,61,0.06)" }}>
              <div className="text-sm font-semibold mb-2" style={{ color: colors.ink }}>Day {day.id} · {day.city} <span className="text-[11px] font-normal" style={{ color: colors.charcoal, opacity: 0.5, fontFamily: mono }}>{day.date}</span></div>
              {day.items.map((it) => (
                <div key={it.id} className="flex items-center gap-2 py-1">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: colors.lagoon }} />
                  <div className="text-sm" style={{ color: colors.charcoal }}>{it.name}{it.category && <span style={{ opacity: 0.5 }}> — {it.category}</span>}</div>
                </div>
              ))}
            </div>
          ))}
          {(!trip.days || trip.days.length === 0) && <p className="text-sm text-center py-6" style={{ color: colors.charcoal, opacity: 0.5 }}>No itinerary shared for this trip.</p>}
        </div>
      )}
    </div>
  );
}
function TheirAllAlbumsView({ person, onOpenTrip, onBack }) {
  const trips = person.trips || [];
  return (
    <div className="px-5 lg:px-8">
      <button onClick={onBack} className="text-sm mb-3" style={{ color: colors.lagoon }}>← Trips &amp; Albums</button>
      <div className="flex items-center justify-between pb-3">
        <h2 style={{ fontFamily: serif, color: colors.ink }} className="text-lg font-semibold">All Albums</h2>
        <span className="text-[11px]" style={{ color: colors.charcoal, opacity: 0.55, fontFamily: mono }}>{trips.length} total</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-8">
        {trips.map((trip) => (
          <button key={trip.id} onClick={() => onOpenTrip(trip)} className="rounded-2xl overflow-hidden text-left" style={{ background: "#fff", boxShadow: "0 2px 8px rgba(22,35,61,0.08)" }}>
            <div className="flex items-center justify-center text-4xl" style={{ height: 100, background: colors.paperDim }}>{trip.photos?.[0]?.thumb || "📷"}</div>
            <div className="px-2.5 py-2">
              <div className="text-xs font-semibold truncate" style={{ color: colors.ink }}>{trip.name}</div>
              <div className="text-[10px]" style={{ color: colors.charcoal, opacity: 0.55 }}>{(trip.photos || []).length} photos</div>
            </div>
          </button>
        ))}
        {trips.length === 0 && <p className="col-span-2 text-sm text-center py-8" style={{ color: colors.charcoal, opacity: 0.5 }}>No albums yet.</p>}
      </div>
    </div>
  );
}
function TheirProfilePage({ person, status, onBack }) {
  const hasAccess = status === "following" || status === "friends";
  const [openTrip, setOpenTrip] = useState(null);
  const [viewAll, setViewAll] = useState(false);
  const badgeStats = { countries: person.countries, times: person.timesTraveled ?? person.countries, percent: Math.round((person.countries / TOTAL_COUNTRIES) * 100) };
  const albumYears = (person.trips || []).map(getTripYear);
  const [albumYear, setAlbumYear] = useState(() => (albumYears.length ? Math.max(...albumYears) : new Date().getFullYear()));
  useEffect(() => {
    if (albumYears.length === 0) return;
    const newestYear = Math.max(...albumYears);
    if (newestYear > albumYear) setAlbumYear(newestYear);
  }, [(person.trips || []).length]);
  const filteredTrips = (person.trips || []).filter((t) => getTripYear(t) === albumYear);
  const totalPhotos = (person.trips || []).reduce((s, t) => s + (t.photos || []).length, 0);

  return (
    <div className="absolute inset-0 z-50 overflow-y-auto" style={{ background: colors.paper, overflowX: "hidden" }}>
      <div className="w-full max-w-[460px] sm:max-w-[640px] lg:max-w-[820px] mx-auto pb-16">
        <div className="flex items-center gap-3 px-5 pt-7 pb-3">
          <button onClick={openTrip || viewAll ? () => { setOpenTrip(null); setViewAll(false); } : onBack} className="text-xl" style={{ color: colors.ink }}>←</button>
          <div>
            <h1 style={{ fontFamily: serif, color: colors.ink }} className="text-xl font-semibold">{person.name}</h1>
            <div className="text-[10px]" style={{ color: colors.charcoal, opacity: 0.5, fontFamily: mono }}>{person.id}</div>
          </div>
        </div>

        <div className="px-5 lg:px-8"><Badges countries={badgeStats.countries} times={badgeStats.times} percent={badgeStats.percent} /></div>

        {!hasAccess && (
          <div className="px-5 lg:px-8 py-6 text-center">
            <p className="text-4xl mb-3">🔒</p>
            <p className="text-sm" style={{ color: colors.charcoal, opacity: 0.7 }}>Follow {person.name.split(" ")[0]} or add them as a friend to see their trips and albums.</p>
          </div>
        )}

        {hasAccess && !openTrip && !viewAll && (
          <div className="px-5 lg:px-8">
            <div className="flex items-center justify-between mb-3">
              <h3 style={{ fontFamily: serif, color: colors.ink }} className="text-lg font-semibold">Trips &amp; Albums</h3>
              {status !== "friends" && <span className="text-[10px]" style={{ color: colors.charcoal, opacity: 0.5 }}>Following — private photos hidden</span>}
            </div>
            <button onClick={() => setViewAll(true)} className="w-full rounded-2xl p-3 mb-3 flex items-center justify-between" style={{ background: colors.ink, color: colors.paper }}>
              <span className="text-sm font-semibold">🗂️ View All Albums</span>
              <span className="text-xs opacity-70">{(person.trips || []).length} total</span>
            </button>
            {albumYears.length > 0 && <YearSlider years={albumYears} year={albumYear} setYear={setAlbumYear} />}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-8">
              {filteredTrips.map((trip) => (
                <button key={trip.id} onClick={() => setOpenTrip(trip)} className="rounded-2xl overflow-hidden text-left" style={{ background: "#fff", boxShadow: "0 2px 8px rgba(22,35,61,0.08)" }}>
                  <div className="flex items-center justify-center text-4xl" style={{ height: 100, background: colors.paperDim }}>{trip.photos?.[0]?.thumb || "📷"}</div>
                  <div className="px-2.5 py-2">
                    <div className="text-xs font-semibold truncate" style={{ color: colors.ink }}>{trip.name}</div>
                    <div className="text-[10px]" style={{ color: colors.charcoal, opacity: 0.55 }}>{(trip.photos || []).length} photos</div>
                  </div>
                </button>
              ))}
              {(person.trips || []).length > 0 && filteredTrips.length === 0 && <p className="col-span-2 text-sm text-center py-6" style={{ color: colors.charcoal, opacity: 0.5 }}>No albums from {albumYear}.</p>}
              {(person.trips || []).length === 0 && <p className="col-span-2 text-sm text-center py-6" style={{ color: colors.charcoal, opacity: 0.5 }}>No albums yet.</p>}
            </div>
            <PassportStamps countries={deriveCountryStamps(person.trips)} title="Countries Visited" />
          </div>
        )}

        {hasAccess && viewAll && <TheirAllAlbumsView person={person} onOpenTrip={(trip) => { setViewAll(false); setOpenTrip(trip); }} onBack={() => setViewAll(false)} />}
        {hasAccess && openTrip && <TheirTripView trip={openTrip} friendStatus={status} onBack={() => setOpenTrip(null)} />}
      </div>
    </div>
  );
}

/* ===========================================================
   BOTTOM NAV + ROOT APP
=========================================================== */
function BottomNav({ tab, setTab }) {
  const items = [{ key: "home", emoji: "🏠", label: "Home" }, { key: "album", emoji: "🖼️", label: "Album" }, { key: "social", emoji: "🔎", label: "Social" }, { key: "trips", emoji: "🧭", label: "Planner" }];
  return (
    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-around py-3 z-30" style={{ background: colors.ink }}>
      {items.map((it) => (
        <button key={it.key} onClick={() => setTab(it.key)} className="flex flex-col items-center gap-1">
          <span style={{ fontSize: 18, filter: tab === it.key ? "none" : "grayscale(40%) opacity(0.7)" }}>{it.emoji}</span>
          <span className="text-[10px]" style={{ color: tab === it.key ? colors.coral : colors.paper }}>{it.label}</span>
        </button>
      ))}
    </div>
  );
}
function seedTrips() {
  const jpDays = dateRange("2026-03-12", "2026-03-14").map((d, i) => ({ id: i + 1, date: d.toISOString().slice(0, 10), city: "Tokyo, Japan", items: [] }));
  jpDays[0].items = [{ id: 1, name: "Arrive Haneda", category: "Landmark", hours: "Open 24 hours", thumb: "🏙️" }, { id: 2, name: "Shibuya Sky", category: "Viewpoint", hours: "Open 9:00–22:00", thumb: "🏙️" }];
  jpDays[1].items = [{ id: 3, name: "Tsukiji Market", category: "Market", hours: "Open 5:00–14:00", thumb: "🍣" }];
  const isDays = dateRange("2026-01-02", "2026-01-03").map((d, i) => ({ id: i + 1, date: d.toISOString().slice(0, 10), city: "Reykjavik, Iceland", items: [] }));
  return [
    {
      id: 1, name: "Japan, Spring 2026", destination: "Tokyo, Japan", start: "2026-03-12", end: "2026-03-14", days: jpDays, status: "completed", reel: null,
      photos: [
        { id: 1, type: "photo", thumb: "🏯", caption: "Fushimi Inari before sunrise", date: "140326", likes: 24, likedByMe: false, duplicateOf: null, dayId: 3 },
        { id: 2, type: "photo", thumb: "🏙️", caption: "Shibuya Sky view", date: "120326", likes: 12, likedByMe: false, duplicateOf: null, dayId: 1 },
      ],
    },
    { id: 2, name: "Iceland Lights", destination: "Reykjavik, Iceland", start: "2026-01-02", end: "2026-01-03", days: isDays, status: "completed", photos: [], reel: null },
  ];
}
if (typeof document !== "undefined") {
  (function ensureViewportMeta() {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "viewport");
      (document.head || document.getElementsByTagName("head")[0]).appendChild(meta);
    }
    meta.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover");
  })();
}
export default function App() {
  const [tab, setTab] = useState("home");
  const [trips, setTrips] = useState(seedTrips);
  const [av, setAv] = useState(DEFAULT_AVATAR);
  const [profileModal, setProfileModal] = useState(null); // { person, self }
  const [chatWith, setChatWith] = useState(null);
  const [showMyProfile, setShowMyProfile] = useState(false);
  const [viewingFriend, setViewingFriend] = useState(null); // person object
  const [relationships, setRelationships] = useState({ "WF-7742": { status: "friends" } });

  const totalTimesTraveled = VISITED_COUNTRIES.reduce((s, c) => s + c.trips, 0);
  const myProfile = { id: MY_PROFILE_ID, name: "Alex Rivera", emoji: "🙂", countries: VISITED_COUNTRIES.length, followers: 842, timesTraveled: totalTimesTraveled };
  const badgeStats = { countries: VISITED_COUNTRIES.length, times: totalTimesTraveled, percent: Math.round((VISITED_COUNTRIES.length / TOTAL_COUNTRIES) * 100) };
  // A person can only ever be in exactly one bucket: none | following | pending | friends
  const getStatus = (id) => relationships[id]?.status || "none";
  const setStatus = (id, status) => setRelationships((r) => ({ ...r, [id]: { status } }));
  const toggleFollow = (id) => setStatus(id, getStatus(id) === "following" ? "none" : "following");
  const toggleFriend = (id) => {
    const s = getStatus(id);
    if (s === "friends" || s === "pending") setStatus(id, "none");
    else setStatus(id, "pending");
  };
  const simulateAccept = (id) => setStatus(id, "friends");

  return (
    <div className="w-full flex justify-center app-viewport-frame" style={{ background: "#eee7d6", overflow: "hidden", overflowX: "hidden", width: "100%", boxSizing: "border-box" }}>
      <style>{FONT_IMPORT}</style>
      <div className="max-w-[460px] sm:max-w-[640px] lg:max-w-[820px] relative" style={{ height: "100%", overflow: "hidden", overflowX: "hidden", width: "100%", boxSizing: "border-box" }}>
        <div className="h-full pb-20" style={{ background: colors.paper, fontFamily: sans, overflowY: "auto", overflowX: "hidden", width: "100%", boxSizing: "border-box" }}>
          {tab === "home" && <HomeTab av={av} setAv={setAv} badgeStats={badgeStats} onOpenSelfProfile={() => setProfileModal({ person: myProfile, self: true })} onViewProfile={() => setShowMyProfile(true)} />}
          {tab === "trips" && <TripsTab trips={trips} setTrips={setTrips} />}
          {tab === "album" && <AlbumTab trips={trips} setTrips={setTrips} />}
          {tab === "social" && <SocialTab relationships={relationships} onOpenProfile={(p) => setProfileModal({ person: p, self: false })} onSimulateAccept={simulateAccept} />}
        </div>
        <BottomNav tab={tab} setTab={setTab} />
        {profileModal && (
          <ProfileModal
            person={profileModal.person}
            self={profileModal.self}
            status={profileModal.self ? null : getStatus(profileModal.person.id)}
            onToggleFollow={() => toggleFollow(profileModal.person.id)}
            onToggleFriend={() => toggleFriend(profileModal.person.id)}
            onClose={() => setProfileModal(null)}
            onOpenChat={(p) => { setProfileModal(null); setChatWith(p); }}
            onViewProfile={() => {
              const self = profileModal.self, person = profileModal.person;
              setProfileModal(null);
              if (self) setShowMyProfile(true); else setViewingFriend(person);
            }}
          />
        )}
        {chatWith && <ChatScreen person={chatWith} onBack={() => setChatWith(null)} />}
        {showMyProfile && (
          <MyProfilePage
            myProfile={myProfile}
            badgeStats={badgeStats}
            trips={trips}
            onBack={() => setShowMyProfile(false)}
            onOpenAlbumTab={() => { setShowMyProfile(false); setTab("album"); }}
            onOpenTripsTab={() => { setShowMyProfile(false); setTab("trips"); }}
          />
        )}
        {viewingFriend && <TheirProfilePage person={viewingFriend} status={getStatus(viewingFriend.id)} onBack={() => setViewingFriend(null)} />}
      </div>
    </div>
  );
}
