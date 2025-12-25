
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


type LayerID = "clear" | "notes" | "score" | "keyboard" | "fixedUI" | "debug" | "mascot";

const renderingPipeline: LayerID[] = [
  "clear",
  "notes",
  "score",
  "keyboard",
  "fixedUI",
  "debug",
  "mascot",
];
const layers = {
  clear    : { offset: {x:0, y:0}, draw: clear },
  notes    : { offset: {x:0, y:0}, draw: renderNotes },
  score    : { offset: {x:0, y:0}, draw: renderScore },
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

class Sequencer{
  scale = 80 // [pixels / s]
}
const sequencer = new Sequencer();

let lastgt = 0;
let lastFrame = 0;
let dt = 0;
let pause = false;

// ============== mainloop ==============
function loop(now: number) {
  dt = (now - lastgt) / 1000;
  const t = pause ? lastFrame + dt : lastFrame;
  lastFrame = t;
  lastgt = now;

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
  const grid = 20;
  d.ctx.translate(0.5, 0.5);
  for(let x=0; x<canvas.width; x+=grid){
    d.ctx.strokeStyle = "#8686863d";
    d.ctx.beginPath();
    d.ctx.moveTo(x, 0);
    d.ctx.lineTo(x, canvas.height);
    d.ctx.stroke();
  }
  for(let y=0; y<canvas.height; y+=grid){
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

  d.ctx.imageSmoothingEnabled = false;
  d.ctx.fillStyle = "#d2fff8ff";
  d.ctx.textBaseline = "bottom";
  const time = performance.now() / 1000;
  const floatY = Math.sin(time * 3) * 3;
  const blink = Math.sin(time * 2.1)*0.5 + Math.sin(time * 7.7)*0.5;
  const face = blink > 0.85 ? "(- ヮ- * )" :"(・ヮ・* )";
  d.ctx.fillText(face, canvas.width-100, Math.round(canvas.height-20+floatY));
}

const notesCfg = {
  note_col: "#cfcd4eff",
  hit_col:  "#ee742dff"
}

function renderNotes(d: DrawCtx){
  const ncfg = notesCfg;
  const kcfg = keyboardCfg;

  const baseLine = d.time * kcfg.scrollSpeed;
  constTranslate(d, {x:layers["keyboard"].offset.x, y:canvas.height - 125 + baseLine});
  const position = (t: number) => t * 4 * kcfg.pxPerBeat;

  d.ctx.fillStyle = "#10efff7a";
  d.ctx.fillRect(0, -baseLine , canvas.width, 1);
  d.ctx.fillText("baseline", 0, -baseLine);

  for(const note of notes){
    let col = ncfg.note_col;
    if(position(note.t) <= baseLine && baseLine <= position(note.t+note.d)){
      col = ncfg.hit_col;
    }
    d.ctx.fillStyle = col;

    const div = position(note.d)/2;
    for(let l=0; l<div; l++){
      const alpha = 1 - (l/div) *0.8;
      const pos = position(note.d) * 1/div;
      d.ctx.fillStyle = `rgba(from ${col} r g b / ${alpha})`;

      fillRectRev(d.ctx,
        kcfg.octaveShift(note.p) + kcfg.pitchShift(note.p),
        -position(note.t) - pos*l,
        kcfg.ppw,
        pos
      );
    }
  }
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

function constTranslate(d: DrawCtx, offset: Point){
  const diffX = offset.x - d.layer.offset.x;
  const diffY = offset.y - d.layer.offset.y;

  if(diffX !== 0 || diffY !== 0){
    d.layer.offset = {x: offset.x, y: offset.y};
    d.ctx.translate(diffX, diffY);
  }
}


function renderFixedUI(d: DrawCtx){
  d.ctx.globalAlpha = 0.5;
  d.ctx.fillStyle = "#333";
  const height = 40;
  constTranslate(d, {x:0, y:canvas.height-height});

  d.ctx.fillRect(0, 0, canvas.width, height);
  withCtx(d.ctx, ()=>{
    d.ctx.translate(0.5, 0.5);

    d.ctx.strokeStyle = "#eee";
    d.ctx.strokeRect(0, 0, canvas.width-2, height-1);
  });

  d.ctx.fillStyle = "#eee"
  const margin = 10;
  d.ctx.fillRect(margin, margin, height-margin*2, height-margin*2);
  d.ctx.translate(30, 0);
  d.ctx.fillRect(margin, margin, height-margin*2, height-margin*2);
}

function testEvent(p: Point){
  debugLog("pause");
  pause = !pause;
}
function reset(p: Point){
  debugLog("reset");
  lastFrame = 0;
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
  event: ((p: Point) => void) | null
}
const physicalLayer: PhysicalObject[] = [];

function registerPhysicalObject(){
  physicalLayer.push(
    {
      id: "start",
      rect:{ x:10, y:10, w:20, h:20},
      layer: layers["fixedUI"],
      event: testEvent
    },
    {
      id: "reset",
      rect:{ x:40, y:10, w:20, h:20},
      layer: layers["fixedUI"],
      event: reset
    },
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
    if(hit){
      if(obj.event) obj.event(p);
      break;
    }
  };
}

class MusicContext {
  bpm = 120;  // [beats per minute]
  beats = 4;  // [beats per measure]
}
const musicCtx = new MusicContext();

class KeyboardConfig {
  ppw = 20;   // [pixels width per white]
  margin = 2;
  height = 60; // [pixels]
  minOctave = 2;
  Octaves = 4;

  scrollSpeed = 80; // [pixels / s]

  offsetX = 10;

  get pxPerBeat(){ // [pixels height per beat]
    // [pixels / sec]*[sec / min]*[min / beats]
    return this.scrollSpeed * 60 / musicCtx.bpm;
  }
  noteInOctave(pitch: number) {
    return pitch % 12;
  }
  octaveShift(pitch: number){
    const octave = Math.floor(pitch / 12) - 1; // MIDIオクターブ補正
    return (octave - this.minOctave) * 7 * this.ppw;
  }
  pitchShift(pitch: number) { // pixels
    const noteInOctave = this.noteInOctave(pitch);
    return KeyboardConfig.whiteOrder.indexOf(noteInOctave) * this.ppw;
  }
  static whiteOrder = [0,2,4,5,7,9,11]; // C D E F G A B

  static octaveLayout = {
    white: [
      { i: 0, shape: "left" },
      { i: 1, shape: "center" },
      { i: 2, shape: "right" },
      { i: 3, shape: "left" },
      { i: 4, shape: "center" },
      { i: 5, shape: "center" },
      { i: 6, shape: "right" },
    ],
    black: [0, 1, 3, 4, 5]
  } as const;
};
const keyboardCfg = new KeyboardConfig();

function drawWhiteKey(n: number, shape: string, ctx: CanvasRenderingContext2D, k: KeyboardConfig) {
  const x = n * k.ppw;
  const ySplit = k.height * 0.7;
  if (shape === "left") {
    ctx.fillRect(x, 0, k.ppw*0.6-k.margin, ySplit+k.margin);
  }
  if (shape === "center") {
    ctx.fillRect((n+0.3)*k.ppw, 0, k.ppw*0.3-k.margin, ySplit+k.margin);
  }
  if (shape === "right") {
    ctx.fillRect((n+0.3)*k.ppw, 0, k.ppw*0.6, ySplit+k.margin);
  }
  ctx.fillRect(x, ySplit+k.margin, k.ppw-k.margin, k.height*0.4-k.margin);
}
function drawBlackKey (n: number, ctx: CanvasRenderingContext2D, k: KeyboardConfig){
  withCtx(ctx, ()=>{
    ctx.translate(0.5, 0.5);
    ctx.strokeRect((n+0.5)*k.ppw+k.margin, 0, k.ppw*0.6-1, k.height*0.7-1);
  });
};

function octaveToLabel(oct: number): string | null {
  if (oct === 4) return "c4";
  return null;
}

function renderKeyboard(d: DrawCtx) {
  const kcfg = keyboardCfg;

  const baseX = kcfg.offsetX;
  const baseY = canvas.height - kcfg.height -50;
  constTranslate(d, {x: baseX, y: baseY});

  const white_col = "#b1b7daff";
  d.ctx.fillStyle = white_col;
  d.ctx.strokeStyle = white_col;

  d.ctx.globalAlpha = 0.75;

  for (let oct = 0; oct < kcfg.Octaves; oct++) {
    const label = octaveToLabel(kcfg.minOctave + oct);
    if(label){
      d.ctx.textBaseline = "bottom"
      d.ctx.fillText(label, 0, 0);
    }
    KeyboardConfig.octaveLayout.white.forEach(k =>
      drawWhiteKey(k.i, k.shape, d.ctx, kcfg)
    );
    KeyboardConfig.octaveLayout.black.forEach(i =>
      drawBlackKey(i, d.ctx, kcfg)
    );
    ctx.translate(kcfg.ppw * 7, 0);
  }
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

function fillRectRev(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number
){
  ctx.fillRect(x, y-h, w, h);
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