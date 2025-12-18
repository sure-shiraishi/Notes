
let bg_col = "#111";

const canvas = document.createElement("canvas");
document.body.style.margin = "0";
document.body.style.background = bg_col;
document.body.style.overflow = "hidden";
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d")!;

await document.fonts.load("16px misaki");
await document.fonts.ready;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.onresize = resize;


type DrawCtx = {
  ctx: CanvasRenderingContext2D;
  time: number;
};
type DrawLayer = (d: DrawCtx) => void;

const renderingPipeline: DrawLayer[] = [
  clear,
  renderKeyboard,
  renderFixedUI
];

type Note = {
  t: number;    // startTime
  d: number;    // Duration
  p: number;    // Pitch
  sl: number;   // StaffLine
}
const notes: Note[] = [];

let start = 1000;

function loop(now: number) {

  const t = (now - start) / 1000;

  ctx.fillStyle = bg_col;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const hitLine = canvas.height - 100;

  ctx.strokeStyle = "#444";
  ctx.beginPath();
  ctx.moveTo(0, hitLine);
  ctx.lineTo(canvas.width, hitLine);
  ctx.stroke();

  for (const n of notes) {
    const y = (n.t -t) * -200 + canvas.height;

    ctx.fillStyle = "rgba(69, 129, 94, 1)";
    ctx.fillRect(n.d, y, 24, 40);
    ctx.strokeStyle = "rgba(255, 255, 255, 1)";
    ctx.strokeRect(n.d, y, 24, 40);
  }

  for(const layer of renderingPipeline){
    layer({ctx: ctx, time: t});
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function clear(d: DrawCtx){
  d.ctx.save();
  d.ctx.translate(0.5, 0.5);
  for(let x=0; x<canvas.width; x+=20){
    d.ctx.strokeStyle = "#8686863d";
    d.ctx.beginPath();
    d.ctx.moveTo(x, 0);
    d.ctx.lineTo(x, canvas.height);
    d.ctx.stroke();
  }
  for(let y=0; y<canvas.height; y+=20){
    d.ctx.beginPath();
    d.ctx.moveTo(0, y);
    d.ctx.lineTo(canvas.width, y);
    d.ctx.stroke();
  }
  d.ctx.restore();
  d.ctx.save();
  const div = 40;
  for(let t=0; t<div; t++){
    const alpha = 1 - t/div;
    const wob = Math.sin((d.time - t*0.016) * 3);
    d.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    fillRectC(d.ctx, canvas.width-50 + t, 40 + wob*20, 2, 2);
  }
  d.ctx.rotate(0);
  d.ctx.imageSmoothingEnabled = false;
  d.ctx.font = "16px misaki";
  d.ctx.fillStyle = "#d2fff8ff";
  d.ctx.textBaseline = "bottom";
  const floatY = Math.sin(d.time * 3) * 5;
  d.ctx.fillText("( *・ヮ・)", 20, Math.round(canvas.height-20+floatY));
  d.ctx.restore();
}

function renderNotes(d: DrawCtx){
  d.ctx.save();

  d.ctx.restore();
}
function renderScore(d: DrawCtx){
  d.ctx.save();

  d.ctx.restore();
}
function renderFixedUI(d: DrawCtx){
  d.ctx.fillStyle = "#11111167";
  d.ctx.fillRect(0, 0, canvas.width/3, canvas.height);
  d.ctx.strokeStyle = "#ddd";
  d.ctx.strokeRect(0, 0, canvas.width/3, canvas.height);
}

function renderKeyboard(d: DrawCtx) {
  d.ctx.save();
  const posX = 20;
  const keyWidth = 18;
  const keyHeight = 60;
  const baseY = canvas.height - keyHeight -20;

  // white
  for (let i = 0; i < 7; i++) {
    d.ctx.strokeStyle = "#f8f8f8";
    d.ctx.strokeRect(posX + i * keyWidth, baseY, keyWidth - 3, keyHeight);
  }
  // black
  [1,2,4,5,6].forEach(i => {
    d.ctx.fillStyle = bg_col;
    d.ctx.fillRect(posX + i * keyWidth - keyWidth/3 -2, baseY, keyWidth/2 + 4, keyHeight*0.7 + 2);
    d.ctx.strokeStyle = "#f8f8f8";
    d.ctx.strokeRect(posX + i * keyWidth- keyWidth/3, baseY, keyWidth/2, keyHeight*0.7);
  });

  d.ctx.restore();
}

function fillRectC(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number){
  ctx.fillRect(x-(w/2), y-(h/2), w, h);
}