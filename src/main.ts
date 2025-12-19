
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
type DrawLayer = {
  draw: (d: DrawCtx) => void;
  visible?: boolean;
};

const renderingPipeline: DrawLayer[] = [
  { draw: clear },
  { draw: renderKeyboard },
  { draw: renderFixedUI },
  { draw: renderDebugWindow },
  { draw: renderMascot },
];


type Point = {
  x: number;
  y: number;
}
const mouse: Point = {x:0, y:0};

canvas.addEventListener("mousemove", e => {
  mouse.x = e.offsetX;
  mouse.y = e.offsetY;
});
canvas.addEventListener("click", e => {
  clickEventHandler({x:e.offsetX, y:e.offsetY});
});

type Note = {
  t: number;    // startTime
  d: number;    // Duration
  p: number;    // Pitch
  sl: number;   // StaffLine
}
const notes: Note[] = [];

let start = 1000;

// ============== mainloop ==============
function loop(now: number) {
  const t = (now - start) / 1000;
  ctx.font = "16px misaki";

  for(const layer of renderingPipeline){
    if(!(layer.visible ?? true)) continue;
    withCtx(ctx,()=>{
      layer.draw({ctx: ctx, time: t});
    });
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);


function clear(d: DrawCtx){
  d.ctx.fillStyle = bg_col;
  d.ctx.fillRect(0, 0, canvas.width, canvas.height);

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
}

function renderMascot(d: DrawCtx){
  const div = 40;
  for(let t=0; t<div; t++){
    const alpha = 1 - t/div;
    const wob = Math.sin((d.time - t*0.016) * 3);
    d.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    fillRectC(d.ctx, canvas.width-50 + t, 40 + wob*20, 2, 2);
  }
  d.ctx.rotate(0);
  d.ctx.imageSmoothingEnabled = false;
  d.ctx.fillStyle = "#d2fff8ff";
  d.ctx.textBaseline = "bottom";
  const floatY = Math.sin(d.time * 3) * 3;
  const blink = Math.sin(d.time * 2.1)*0.5 + Math.sin(d.time * 7.7)*0.5;
  const face = blink > 0.85 ? "(- ヮ- * )" :"(・ヮ・* )";
  d.ctx.fillText(face, canvas.width-100, Math.round(canvas.height-20+floatY));
}

function renderNotes(d: DrawCtx){
}
function renderScore(d: DrawCtx){
}

function renderFixedUI(d: DrawCtx){
  d.ctx.fillStyle = "#11111167";
  d.ctx.fillRect(0, 0, canvas.width/3, canvas.height);
  d.ctx.translate(0.5, 0.5);
  d.ctx.strokeStyle = "#ddd";
  d.ctx.strokeRect(0, 0, canvas.width/3, canvas.height-1);
}

function renderKeyboard(d: DrawCtx) {
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
}

type DebugLog = {
  log: string,
  t: number,
  type?: string
}
const logQueue: DebugLog[] = [];

function renderDebugWindow(d: DrawCtx){
  // reticle
  d.ctx.fillStyle = "#31ffa95b";
  d.ctx.fillRect(mouse.x, 0, 1, canvas.height);
  d.ctx.fillRect(0, mouse.y, canvas.width, 1);

  const br = () => d.ctx.translate(0,16);
  const digit = (num: number) => num.toFixed(2);
  d.ctx.fillStyle = "#7dff994f";
  d.ctx.textBaseline = "top";
  d.ctx.translate(20, 20);
  [
    "debug",
    `t: ${digit(d.time)}`,
    `global_t: ${digit(performance.now()/1000)}`,
    `x: ${mouse.x}, y: ${mouse.y}`,
  ].forEach(line => {
    d.ctx.fillText(line, 0, 0);
    br();
  });
}

function clickEventHandler(p: Point){
  console.log(p.x, p.y);
}

function isInsideRect(p: Point, rx: number, ry: number, rw: number, rh: number) {
  return p.x >= rx && p.x <= rx + rw && p.y >= ry && p.y <= ry + rh;
}

function fillRectC(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number
){
  ctx.fillRect(x-(w/2), y-(h/2), w, h);
}

function withCtx(
  ctx: CanvasRenderingContext2D,
  fn: () => void
){
  ctx.save();
  try {
    fn();
  } finally {
    ctx.restore();
  }
}

