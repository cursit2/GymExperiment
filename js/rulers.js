// rulers.js — metric ruler overlays along the top and left edges of the canvas

const RULER_SIZE = 22;

const rulerTop = document.createElement("canvas");
rulerTop.className = "ruler ruler-top";
rulerTop.height = RULER_SIZE;
roomCanvas.appendChild(rulerTop);

const rulerLeft = document.createElement("canvas");
rulerLeft.className = "ruler ruler-left";
rulerLeft.width = RULER_SIZE;
rulerLeft.style.top = `${RULER_SIZE}px`;
roomCanvas.appendChild(rulerLeft);

// Returns the label interval in whole meters so labels are at least ~44 px apart.
function pickLabelInterval(pxPerM) {
  for (const step of [1, 2, 5, 10, 20, 50]) {
    if (step * pxPerM >= 44) return step;
  }
  return 100;
}

function renderRulers() {
  const dims = backgroundDimensions[backgroundSelect.value];
  if (!dims) return;

  const zoom   = backgroundState.zoom;
  const cw     = roomCanvas.clientWidth;
  const ch     = roomCanvas.clientHeight;
  const R      = RULER_SIZE;

  // Background image top-left corner in canvas pixel coordinates.
  const bgLeft = cw / 2 + backgroundState.panX - (dims.width  / 2) * zoom;
  const bgTop  = ch / 2 + backgroundState.panY - (dims.height / 2) * zoom;
  const pxPerM = zoom * 100; // 100 cm = 1 m

  // Adaptive tick density: keep ruler ticks aligned with the map grid overlay.
  const tickStep = typeof window.getMeterTickStep === "function"
    ? window.getMeterTickStep(pxPerM)
    : (pxPerM >= 2 ? 1 : Math.max(1, Math.ceil(2 / pxPerM)));
  const labelInterval = pickLabelInterval(pxPerM);

  const BG     = "#263238";
  const CORNER = "#1b2d35";
  const TICK   = "#7eb8c4";
  const LABEL  = "#a8d0d8";
  const BORDER = "#405860";

  // ---- Horizontal (top) ruler ----
  rulerTop.width = cw; // resize clears the canvas
  const cH = rulerTop.getContext("2d");

  cH.fillStyle = BG;
  cH.fillRect(0, 0, cw, R);

  cH.fillStyle = CORNER;
  cH.fillRect(0, 0, R, R);
  cH.fillStyle = TICK;
  cH.font = "bold 9px sans-serif";
  cH.textAlign = "center";
  cH.textBaseline = "middle";
  cH.fillText("m", R / 2, R / 2);

  const totalMH = Math.floor(dims.width / 100);
  cH.strokeStyle = TICK;
  cH.lineWidth = 1;
  cH.fillStyle = LABEL;
  cH.font = "9px sans-serif";

  for (let m = 0; m <= totalMH; m += tickStep) {
    const x = bgLeft + m * pxPerM;
    if (x < R || x > cw) continue;
    const isMaj = m % 10 === 0;
    const isMid = m % 5  === 0;
    const tH    = isMaj ? R * 0.72 : isMid ? R * 0.5 : R * 0.3;
    cH.beginPath();
    cH.moveTo(Math.round(x) + 0.5, R);
    cH.lineTo(Math.round(x) + 0.5, R - tH);
    cH.stroke();
    if (m % labelInterval === 0) {
      cH.textAlign = "left";
      cH.textBaseline = "top";
      cH.fillText(String(m), x + 2, 2);
    }
  }

  cH.strokeStyle = BORDER;
  cH.lineWidth = 1;
  cH.beginPath();
  cH.moveTo(R, R - 0.5);
  cH.lineTo(cw, R - 0.5);
  cH.stroke();

  // ---- Vertical (left) ruler ----
  const lh = ch - R;
  rulerLeft.height = lh; // resize clears the canvas
  const cV = rulerLeft.getContext("2d");

  cV.fillStyle = BG;
  cV.fillRect(0, 0, R, lh);

  const totalMV  = Math.floor(dims.height / 100);
  const bgTopAdj = bgTop - R; // ruler y=0 corresponds to canvas pixel y=R

  cV.strokeStyle = TICK;
  cV.lineWidth = 1;
  cV.fillStyle = LABEL;
  cV.font = "9px sans-serif";

  for (let m = 0; m <= totalMV; m += tickStep) {
    const y = bgTopAdj + m * pxPerM;
    if (y < 0 || y > lh) continue;
    const isMaj = m % 10 === 0;
    const isMid = m % 5  === 0;
    const tW    = isMaj ? R * 0.72 : isMid ? R * 0.5 : R * 0.3;
    cV.beginPath();
    cV.moveTo(R, Math.round(y) + 0.5);
    cV.lineTo(R - tW, Math.round(y) + 0.5);
    cV.stroke();
    if (m % labelInterval === 0 && y > 10) {
      cV.save();
      cV.translate(R / 2, Math.round(y));
      cV.rotate(-Math.PI / 2);
      cV.textAlign = "center";
      cV.textBaseline = "middle";
      cV.fillText(String(m), 0, 0);
      cV.restore();
    }
  }

  cV.strokeStyle = BORDER;
  cV.lineWidth = 1;
  cV.beginPath();
  cV.moveTo(R - 0.5, 0);
  cV.lineTo(R - 0.5, lh);
  cV.stroke();
}
