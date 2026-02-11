import { useRef, useEffect, useCallback } from 'react';
import { WHEEL_ORDER, getNumberColor } from '../constants/roulette';
import './RouletteWheel.css';

interface RouletteWheelProps {
  spinning: boolean;
  targetNumber: number | null;
  onSpinComplete: () => void;
}

/* ---------- geometry helpers ---------- */

const NUM_POCKETS = 37;
const POCKET_ARC = (2 * Math.PI) / NUM_POCKETS;

/** Canvas backing resolution (CSS size is responsive via the container). */
const CANVAS_SIZE = 500;
const CENTER = CANVAS_SIZE / 2;

/* Radii expressed as fractions of CENTER so the wheel fits nicely. */
const R_OUTER_RIM = CENTER * 0.97;      // outermost edge of the wooden rim
const R_POCKET_OUTER = CENTER * 0.87;   // outer edge of the coloured pockets
const R_POCKET_INNER = CENTER * 0.62;   // inner edge of the coloured pockets
const R_INNER_RING = CENTER * 0.58;     // decorative inner ring
const R_CENTER_CAP = CENTER * 0.22;     // centre boss / cap
const R_NUMBER_TEXT = CENTER * 0.76;     // where numbers are drawn
const R_BALL_ORBIT = CENTER * 0.91;      // ball orbit radius (just inside rim)
const R_BALL_POCKET = CENTER * 0.76;     // ball resting radius in pocket
const BALL_RADIUS = CENTER * 0.03;       // size of the ball

/* Colour palette */
const POCKET_RED = '#c0392b';
const POCKET_BLACK = '#1a1a2e';
const POCKET_GREEN = '#196f3d';
const RIM_OUTER = '#3e2712';
const RIM_INNER = '#5c3a1e';
const GOLD_ACCENT = '#c9a84c';
const FELT_GREEN = '#0b6623';

/* ---------- easing ---------- */

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/* ---------- angle helpers ---------- */

/** Returns the centre-angle for a pocket by its wheel-order index, measured from 12 o'clock. */
function pocketAngle(index: number): number {
  return index * POCKET_ARC - Math.PI / 2 + POCKET_ARC / 2;
}

/* ---------- animation phases ---------- */

const PHASE_ORBIT_END = 2.0;       // seconds – fast orbit
const PHASE_DECEL_END = 3.5;       // deceleration
const PHASE_DROP_END = 4.0;        // drop into pocket
const PHASE_SETTLE_END = 5.0;      // bounce & settle

/* ---------- drawing ---------- */

function drawWheel(ctx: CanvasRenderingContext2D, size: number, rotation: number) {
  const cx = size / 2;
  const cy = size / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  /* --- outer wooden rim (gradient) --- */
  const rimGrad = ctx.createRadialGradient(0, 0, R_POCKET_OUTER, 0, 0, R_OUTER_RIM);
  rimGrad.addColorStop(0, RIM_INNER);
  rimGrad.addColorStop(0.4, '#6b4226');
  rimGrad.addColorStop(0.7, RIM_OUTER);
  rimGrad.addColorStop(1, '#2a1808');

  ctx.beginPath();
  ctx.arc(0, 0, R_OUTER_RIM, 0, 2 * Math.PI);
  ctx.arc(0, 0, R_POCKET_OUTER, 0, 2 * Math.PI, true);
  ctx.fillStyle = rimGrad;
  ctx.fill();

  /* --- rim edge highlight --- */
  ctx.beginPath();
  ctx.arc(0, 0, R_OUTER_RIM, 0, 2 * Math.PI);
  ctx.strokeStyle = '#2a1808';
  ctx.lineWidth = 2;
  ctx.stroke();

  /* --- gold trim at inner edge of rim --- */
  ctx.beginPath();
  ctx.arc(0, 0, R_POCKET_OUTER + 1, 0, 2 * Math.PI);
  ctx.strokeStyle = GOLD_ACCENT;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  /* --- pocket dividers (gold spokes) --- */
  for (let i = 0; i < NUM_POCKETS; i++) {
    const angle = i * POCKET_ARC - Math.PI / 2;
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, -R_POCKET_INNER);
    ctx.lineTo(0, -R_POCKET_OUTER);
    ctx.strokeStyle = GOLD_ACCENT;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  /* --- coloured pockets --- */
  for (let i = 0; i < NUM_POCKETS; i++) {
    const num = WHEEL_ORDER[i];
    const startAngle = i * POCKET_ARC - Math.PI / 2;
    const endAngle = startAngle + POCKET_ARC;

    const color = getNumberColor(num);
    let fillColor: string;
    if (color === 'red') fillColor = POCKET_RED;
    else if (color === 'green') fillColor = POCKET_GREEN;
    else fillColor = POCKET_BLACK;

    ctx.beginPath();
    ctx.arc(0, 0, R_POCKET_OUTER, startAngle, endAngle);
    ctx.arc(0, 0, R_POCKET_INNER, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    /* subtle pocket bevel */
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 0.75;
    ctx.stroke();
  }

  /* --- numbers --- */
  ctx.font = `bold ${Math.round(size * 0.028)}px "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < NUM_POCKETS; i++) {
    const num = WHEEL_ORDER[i];
    const midAngle = i * POCKET_ARC - Math.PI / 2 + POCKET_ARC / 2;

    ctx.save();
    ctx.rotate(midAngle);
    ctx.translate(0, -R_NUMBER_TEXT);
    /* rotate so text faces outward (readable from outside the wheel) */
    ctx.rotate(Math.PI / 2);

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 3;
    ctx.fillText(String(num), 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  /* --- inner ring / track edge --- */
  ctx.beginPath();
  ctx.arc(0, 0, R_POCKET_INNER, 0, 2 * Math.PI);
  ctx.strokeStyle = GOLD_ACCENT;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  /* --- inner decorative area (green felt with pattern) --- */
  const innerGrad = ctx.createRadialGradient(0, 0, R_CENTER_CAP, 0, 0, R_INNER_RING);
  innerGrad.addColorStop(0, '#0d4f1c');
  innerGrad.addColorStop(1, FELT_GREEN);
  ctx.beginPath();
  ctx.arc(0, 0, R_INNER_RING, 0, 2 * Math.PI);
  ctx.fillStyle = innerGrad;
  ctx.fill();

  /* --- decorative spokes in inner area --- */
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * 2 * Math.PI;
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, -R_CENTER_CAP);
    ctx.lineTo(0, -R_INNER_RING);
    ctx.strokeStyle = 'rgba(201,168,76,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  /* --- inner ring thin line --- */
  ctx.beginPath();
  ctx.arc(0, 0, R_INNER_RING, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(201,168,76,0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();

  /* --- centre cap / boss --- */
  const capGrad = ctx.createRadialGradient(-CENTER * 0.03, -CENTER * 0.03, 0, 0, 0, R_CENTER_CAP);
  capGrad.addColorStop(0, '#d4af37');
  capGrad.addColorStop(0.5, '#b8962e');
  capGrad.addColorStop(1, '#7a6320');
  ctx.beginPath();
  ctx.arc(0, 0, R_CENTER_CAP, 0, 2 * Math.PI);
  ctx.fillStyle = capGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, R_CENTER_CAP, 0, 2 * Math.PI);
  ctx.strokeStyle = '#5a4918';
  ctx.lineWidth = 2;
  ctx.stroke();

  /* centre highlight */
  ctx.beginPath();
  ctx.arc(-CENTER * 0.03, -CENTER * 0.03, R_CENTER_CAP * 0.45, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();

  ctx.restore();
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  size: number,
  angle: number,
  radius: number,
  wheelRotation: number,
) {
  const cx = size / 2;
  const cy = size / 2;

  /* Ball position is in world space.
     `angle` is the ball's absolute angle.
     When the ball is in the pocket its radius rotates with the wheel,
     so we add wheelRotation when the radius <= R_BALL_POCKET. */
  const effectiveAngle = radius <= R_BALL_POCKET + 1 ? angle + wheelRotation : angle;

  const bx = cx + Math.cos(effectiveAngle) * radius;
  const by = cy + Math.sin(effectiveAngle) * radius;

  /* ball shadow */
  ctx.beginPath();
  ctx.arc(bx + 2, by + 2, BALL_RADIUS, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fill();

  /* main ball */
  const ballGrad = ctx.createRadialGradient(
    bx - BALL_RADIUS * 0.3, by - BALL_RADIUS * 0.3, BALL_RADIUS * 0.1,
    bx, by, BALL_RADIUS,
  );
  ballGrad.addColorStop(0, '#ffffff');
  ballGrad.addColorStop(0.6, '#e8e8e8');
  ballGrad.addColorStop(1, '#b0b0b0');

  ctx.beginPath();
  ctx.arc(bx, by, BALL_RADIUS, 0, 2 * Math.PI);
  ctx.fillStyle = ballGrad;
  ctx.fill();

  /* specular highlight */
  ctx.beginPath();
  ctx.arc(bx - BALL_RADIUS * 0.25, by - BALL_RADIUS * 0.25, BALL_RADIUS * 0.35, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fill();
}

function drawMarker(ctx: CanvasRenderingContext2D, size: number) {
  const cx = size / 2;

  /* A downward-pointing triangle at top-centre, sitting just outside the rim. */
  const tipY = CENTER - R_OUTER_RIM + 12;
  const baseY = tipY - 18;
  const halfW = 10;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, tipY);
  ctx.lineTo(cx - halfW, baseY);
  ctx.lineTo(cx + halfW, baseY);
  ctx.closePath();

  ctx.fillStyle = '#d4af37';
  ctx.fill();
  ctx.strokeStyle = '#7a6320';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  /* small highlight */
  ctx.beginPath();
  ctx.moveTo(cx, tipY - 3);
  ctx.lineTo(cx - halfW * 0.4, baseY + 2);
  ctx.lineTo(cx + halfW * 0.4, baseY + 2);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fill();

  ctx.restore();
}

/* ---------- component ---------- */

export default function RouletteWheel({ spinning, targetNumber, onSpinComplete }: RouletteWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  /* Mutable animation state kept in a ref so the rAF loop never re-creates. */
  const state = useRef({
    wheelRotation: 0,
    ballAngle: -Math.PI / 2,          // 12-o'clock in standard math coords
    ballRadius: R_BALL_ORBIT,
    startTime: 0,
    animating: false,
    targetAngle: 0,                    // where the ball needs to land (world angle)
    settled: false,
  });

  /* ---------- render one frame ---------- */

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = CANVAS_SIZE;
    /* Clear the full backing store (may be DPR-scaled). */
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    const s = state.current;

    drawWheel(ctx, size, s.wheelRotation);
    drawMarker(ctx, size);

    /* ball */
    if (s.animating || targetNumber !== null) {
      drawBall(ctx, size, s.ballAngle, s.ballRadius, s.wheelRotation);
    }
  }, [targetNumber]);

  /* ---------- animation loop ---------- */

  const animate = useCallback((timestamp: number) => {
    const s = state.current;
    if (!s.animating) {
      render();
      return;
    }
    if (s.startTime === 0) s.startTime = timestamp;

    const elapsed = (timestamp - s.startTime) / 1000; // seconds

    /* --- compute ball angle target --- */
    const targetIdx = targetNumber !== null ? WHEEL_ORDER.indexOf(targetNumber) : 0;
    /* The pocket centre angle (in world frame) we want the ball to end up at.
       We aim to have the ball aligned with the TOP marker, so the pocket at -PI/2.
       The wheel itself will have rotated; the pocket's world angle =
       pocketLocalAngle + wheelRotation.  We work backwards from the final
       wheel rotation to find the right ball angle. */
    const totalWheelTurns = 2;  // how many full turns the wheel makes
    const totalBallTurns = 6;   // total ball orbits

    /* Final wheel rotation (wheel rotates negatively / clockwise viewed from top) */
    const finalWheelRotation = -totalWheelTurns * 2 * Math.PI;

    /* The pocket's local angle (in wheel space, from 12-o'clock) */
    const pocketLocal = pocketAngle(targetIdx);

    /* At the end, the pocket sits at pocketLocal + finalWheelRotation in world space.
       We need the ball to meet the MARKER position at -PI/2 (12 o'clock).
       So the target world angle for the ball = pocketLocal + finalWheelRotation. */
    const finalBallAngle = pocketLocal + finalWheelRotation;

    /* Ball start angle – positioned at -PI/2 (top), but we'll add many turns */
    const ballStart = -Math.PI / 2;
    const fullBallAngle = ballStart + totalBallTurns * 2 * Math.PI + (finalBallAngle - ballStart) % (2 * Math.PI);

    if (elapsed < PHASE_ORBIT_END) {
      /* ---- Phase 1: Fast orbit ---- */
      const t = elapsed / PHASE_ORBIT_END;
      /* ball races around quickly */
      s.ballAngle = ballStart + easeInOutQuad(t) * (totalBallTurns * 0.5) * 2 * Math.PI;
      s.ballRadius = R_BALL_ORBIT;
      /* wheel rotates slowly the other way */
      s.wheelRotation = easeInOutQuad(t) * finalWheelRotation * 0.25;

    } else if (elapsed < PHASE_DECEL_END) {
      /* ---- Phase 2: Deceleration ---- */
      const t = (elapsed - PHASE_ORBIT_END) / (PHASE_DECEL_END - PHASE_ORBIT_END);
      const easedT = easeOutCubic(t);
      const phase1EndBall = ballStart + (totalBallTurns * 0.5) * 2 * Math.PI;
      s.ballAngle = phase1EndBall + easedT * (fullBallAngle - phase1EndBall);
      /* spiral inward */
      s.ballRadius = R_BALL_ORBIT + easedT * (R_BALL_POCKET + (R_BALL_ORBIT - R_BALL_POCKET) * 0.2 - R_BALL_ORBIT);
      s.wheelRotation = finalWheelRotation * 0.25 + easedT * (finalWheelRotation * 0.65);

    } else if (elapsed < PHASE_DROP_END) {
      /* ---- Phase 3: Drop into pocket ---- */
      const t = (elapsed - PHASE_DECEL_END) / (PHASE_DROP_END - PHASE_DECEL_END);
      const easedT = easeOutQuint(t);
      s.ballAngle = fullBallAngle;
      const postDecelRadius = R_BALL_POCKET + (R_BALL_ORBIT - R_BALL_POCKET) * 0.2;
      s.ballRadius = postDecelRadius + easedT * (R_BALL_POCKET - postDecelRadius);
      s.wheelRotation = finalWheelRotation * 0.9 + easedT * (finalWheelRotation * 0.1);

    } else if (elapsed < PHASE_SETTLE_END) {
      /* ---- Phase 4: Settle / bounce ---- */
      const t = (elapsed - PHASE_DROP_END) / (PHASE_SETTLE_END - PHASE_DROP_END);
      s.ballAngle = fullBallAngle;
      /* small bounce */
      const bounce = Math.sin(t * Math.PI * 3) * (1 - t) * (CENTER * 0.03);
      s.ballRadius = R_BALL_POCKET + bounce;
      s.wheelRotation = finalWheelRotation;

      if (!s.settled && t >= 1) {
        s.settled = true;
        s.animating = false;
        s.ballRadius = R_BALL_POCKET;
        onSpinComplete();
      }
    } else {
      /* safety: past end */
      s.animating = false;
      s.ballAngle = fullBallAngle;
      s.ballRadius = R_BALL_POCKET;
      s.wheelRotation = finalWheelRotation;
      if (!s.settled) {
        s.settled = true;
        onSpinComplete();
      }
    }

    render();

    if (s.animating) {
      animRef.current = requestAnimationFrame(animate);
    }
  }, [targetNumber, onSpinComplete, render]);

  /* ---------- kick off / manage animation ---------- */

  useEffect(() => {
    if (spinning && targetNumber !== null) {
      const s = state.current;
      s.animating = true;
      s.settled = false;
      s.startTime = 0;
      s.wheelRotation = 0;
      s.ballAngle = -Math.PI / 2;
      s.ballRadius = R_BALL_ORBIT;

      animRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [spinning, targetNumber, animate]);

  /* ---------- idle / static rendering ---------- */

  useEffect(() => {
    if (spinning) return; // animation loop handles rendering

    const s = state.current;
    if (!s.animating) {
      /* When idle with a result, show ball in the pocket. */
      if (targetNumber !== null) {
        const targetIdx = WHEEL_ORDER.indexOf(targetNumber);
        s.ballAngle = pocketAngle(targetIdx);
        s.ballRadius = R_BALL_POCKET;
      }
      render();
    }
  }, [spinning, targetNumber, render]);

  /* ---------- initial draw on mount ---------- */

  useEffect(() => {
    render();
  }, [render]);

  /* Handle DPR for sharp rendering on retina displays. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
    /* After resizing the backing store, re-render. */
    render();
  }, [render]);

  return (
    <div className="roulette-wheel-container">
      <canvas
        ref={canvasRef}
        className="roulette-wheel-canvas"
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
      />
    </div>
  );
}
