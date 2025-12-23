
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
  time: number; // [s]
  layer: DrawLayer;
};
type DrawLayer = {
  draw: (d: DrawCtx) => void;
  visible?: boolean;
  offset: Point;
};

type LayerID = "clear" | "keyboard" | "fixedUI" | "debug" | "mascot";

const renderingPipeline: LayerID[] = [
  "clear",
  "keyboard",
  "fixedUI",
  "debug",
  "mascot",
];
const layers = {
  clear    : { offset: {x:0, y:0}, draw: clear },
  keyboard : { offset: {x:0, y:0}, draw: renderKeyboard },
  fixedUI  : { offset: {x:0, y:0}, draw: renderFixedUI },
  debug    : { offset: {x:0, y:0}, draw: renderDebugWindow },
  mascot   : { offset: {x:0, y:0}, draw: renderMascot },
} satisfies Record<LayerID, DrawLayer>;


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

const WHOLE = 1;
const HALF  = 0.5;
const QUARTER = 0.25;
const EIGHTH = 0.125;

type Note = {
  t: number;    // startTime
  d: number;    // Duration  [1/value]
  p: number;    // Pitch     [MIDI] 60 = C4 = 261.63Hz
  sl: number;   // StaffLine C=0
}
let notes: Note[] = [
  {t: 0,    d: QUARTER, p: 60, sl: 0 },
  {t: 0.25, d: QUARTER, p: 62, sl: 1 },
  {t: 0.5,  d: QUARTER, p: 64, sl: 2 },
  {t: 0.75, d: QUARTER, p: 62, sl: 1 },
  {t: 1,    d: QUARTER, p: 60, sl: 0 },
  {t: 1.25, d: HALF,    p: 62, sl: 1 },
];

const start = 0;
let lastFrame = 0;
let dt = 0;

// ============== mainloop ==============
function loop(now: number) {
  const t = now / 1000 - start;
  dt = t - lastFrame;
  lastFrame = t;

  ctx.font = "16px misaki";

  for(const layerID of renderingPipeline){
    const layer = layers[layerID] as DrawLayer;
    if(!(layer.visible ?? true)) continue;
    withCtx(ctx,()=>{
      ctx.translate(layer.offset.x, layer.offset.y);
      layer.draw({ctx: ctx, time: t, layer: layer});
    });
  }
  requestAnimationFrame(loop);
}


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


type DebugLog = {
  log: string,
  t: number,
  type?: string
}
let logQueue: DebugLog[] = [];
function debugLog(msg: string, lifeTime: number = 3){
  logQueue.push({log: msg, t: lifeTime});
}

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
  br();

  logQueue.forEach(line => {
    d.ctx.fillText(line.log, 0, 0);
    line.t -= dt;
    br();
  });
  while(logQueue.length > 0 && logQueue[0].t <= 0){
    logQueue.shift();
  }
}


function renderFixedUI(d: DrawCtx){
  d.ctx.globalAlpha = 0.5;
  d.ctx.fillStyle = "#333";
  const height = 40;
  d.ctx.translate(0, canvas.height-height)

  d.ctx.fillRect(0, 0, canvas.width, height);
  withCtx(d.ctx, ()=>{
    d.ctx.translate(0.5, 0.5);

    d.ctx.strokeStyle = "#eee";
    d.ctx.strokeRect(0, 0, canvas.width-2, height-1);

    d.ctx.strokeRect
  });
}


type Rect = {
  x: number,
  y: number,
  w: number,
  h: number
}
type PhysicalObject = {
  id: string,
  rect: Rect,
  layer: DrawLayer,
  event: ((p: Point) => {}) | null
}
const physicalLayer: PhysicalObject[] = [];

function registerPhysicalObject(){
  physicalLayer.push(
    {
      id: "start",
      rect:{ x:0, y:0, w:30, h:200},
      layer: layers["fixedUI"],
      event: null
    }
  );
}
registerPhysicalObject();

function checkClicked(p: Point){
  let hit = false;
  for(const obj of physicalLayer){
    const shiftedRect = {
      x: obj.rect.x + obj.layer.offset.x,
      y: obj.rect.y + obj.layer.offset.y,
      w: obj.rect.w,
      h: obj.rect.h
    }
    hit = isInsideRect(p, shiftedRect); 
    if(hit) break;
  };
  debugLog("inside:"+ hit);
}


const keyboardConfig = {
  ppw: 16, // [pixels per white]
  minOctave: 2,
  maxOctave: 6
}

function renderKeyboard(d: DrawCtx) {
  const posX = 20;
  const keyWidth = 18;
  const keyHeight = 60;
  const baseY = canvas.height - keyHeight -50;
  d.ctx.globalAlpha = 0.8;

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

function pitchToX(pitch: number) {
  const WHITE = keyboardConfig.ppw;
  const BLACK = WHITE * 0.6;
  const octave = Math.floor(pitch / 12) - 1; // MIDIオクターブ補正
  const noteInOctave = pitch % 12;
  const whiteOrder = [0,2,4,5,7,9,11]; // C D E F G A B
  const idx = whiteOrder.indexOf(noteInOctave);
  return (octave - keyboardConfig.minOctave) * 7 * WHITE + idx * WHITE;
}

function clickEventHandler(p: Point){
  debugLog(`point ${p.x}, ${p.y}`);
  checkClicked(p);
}

function isInsideRect(p: Point, r: Rect) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
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

requestAnimationFrame(loop);