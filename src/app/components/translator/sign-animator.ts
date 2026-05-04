/* =========================================================================
   SignAnimator — ported from app.js for Angular integration
   ========================================================================= */

const SK = {
  headCx: 200, headCy: 90, headR: 28,
  neck:   { x: 200, y: 122 },
  shoulderL: { x: 168, y: 140 },
  shoulderR: { x: 232, y: 140 },
  hip:    { x: 200, y: 280 },
  hipL:   { x: 180, y: 280 },
  hipR:   { x: 220, y: 280 },
  footL:  { x: 174, y: 400 },
  footR:  { x: 226, y: 400 },
  upperArmLen: 60,
  forearmLen:  62,
};

const RESTING_POSE: any = {
  rWrist: { x: -8, y: 130 }, rHand: 'rest', rHandRot: 10,
  lWrist: { x:  8, y: 130 }, lHand: 'rest', lHandRot: -10,
  headTilt: 0, expression: 'neutral'
};

function solveElbow(shoulder: any, wrist: any, side: string) {
  const dx = wrist.x - shoulder.x, dy = wrist.y - shoulder.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const L1 = SK.upperArmLen, L2 = SK.forearmLen;
  const d = Math.min(dist, L1 + L2 - 1);
  const a = (L1*L1 - L2*L2 + d*d) / (2*d);
  const h = Math.sqrt(Math.max(0, L1*L1 - a*a));
  const ux = dx/dist, uy = dy/dist;
  const sign = side === 'r' ? -1 : 1;
  return { x: shoulder.x + ux*a + (-uy*sign)*h, y: shoulder.y + uy*a + (ux*sign)*h };
}

const F = {
  finger: (x1:number,y1:number,x2:number,y2:number,bend=0) =>
    bend===0 ? `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1F2A2E" stroke-width="2.6" stroke-linecap="round"/>`
             : `<path d="M${x1} ${y1} Q ${(x1+x2)/2+bend} ${(y1+y2)/2} ${x2} ${y2}" stroke="#1F2A2E" stroke-width="2.6" stroke-linecap="round" fill="none"/>`,
  palm: () => `<circle cx="0" cy="0" r="6" fill="#FAF2DD" stroke="#1F2A2E" stroke-width="2"/>`,
};

const HAND_SHAPES: any = {
  rest: F.palm()+F.finger(-4,-2,-5,-14)+F.finger(-1,-3,-2,-17)+F.finger(2,-3,3,-17)+F.finger(5,-2,6,-14)+F.finger(-6,2,-12,4),
  flat: F.palm()+F.finger(-5,-2,-6,-22)+F.finger(-2,-3,-3,-24)+F.finger(2,-3,3,-24)+F.finger(5,-2,6,-22)+F.finger(-6,2,-12,4),
  open: F.palm()+F.finger(-5,-2,-12,-20)+F.finger(-2,-3,-5,-26)+F.finger(2,-3,5,-26)+F.finger(5,-2,12,-20)+F.finger(-6,2,-14,8),
  fist: F.palm()+F.finger(-5,-2,-5,-7,2)+F.finger(-2,-3,-2,-7,2)+F.finger(2,-3,2,-7,2)+F.finger(5,-2,5,-7,2)+F.finger(-6,2,-10,2),
  point: F.palm()+F.finger(-5,-2,-5,-7,2)+F.finger(-2,-3,-3,-26)+F.finger(2,-3,2,-7,2)+F.finger(5,-2,5,-7,2)+F.finger(-6,2,-10,2),
  peace: F.palm()+F.finger(-5,-2,-5,-7,2)+F.finger(-2,-3,-6,-24)+F.finger(2,-3,6,-24)+F.finger(5,-2,5,-7,2)+F.finger(-6,2,-10,2),
  three: F.palm()+F.finger(-5,-2,-5,-7,2)+F.finger(-2,-3,-3,-24)+F.finger(2,-3,3,-24)+F.finger(5,-2,5,-7,2)+F.finger(-6,2,-13,-6),
  four: F.palm()+F.finger(-6,-2,-9,-22)+F.finger(-2,-3,-3,-25)+F.finger(2,-3,3,-25)+F.finger(6,-2,9,-22)+F.finger(-5,2,-9,4,2),
  five: F.palm()+F.finger(-5,-2,-12,-20)+F.finger(-2,-3,-5,-26)+F.finger(2,-3,5,-26)+F.finger(5,-2,12,-20)+F.finger(-6,2,-15,4),
  thumb: F.palm()+F.finger(-5,-2,-5,-6,2)+F.finger(-2,-3,-2,-6,2)+F.finger(2,-3,2,-6,2)+F.finger(5,-2,5,-6,2)+F.finger(0,-3,0,-22),
  okay: F.palm()+`<circle cx="-7" cy="-12" r="5" fill="none" stroke="#1F2A2E" stroke-width="2.4"/>`+F.finger(-2,-3,3,-24)+F.finger(2,-3,7,-24)+F.finger(5,-2,11,-22),
  iloveyou: F.palm()+F.finger(-5,-2,-8,-22)+F.finger(-2,-3,-2,-7,2)+F.finger(2,-3,2,-7,2)+F.finger(5,-2,8,-22)+F.finger(-6,2,-14,4),
  cshape: F.palm()+`<path d="M-7 -16 Q -16 -10 -16 0 Q -16 8 -7 12" stroke="#1F2A2E" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
  oshape: F.palm()+`<ellipse cx="0" cy="-10" rx="9" ry="11" fill="none" stroke="#1F2A2E" stroke-width="2.6"/>`,
  lshape: F.palm()+F.finger(-5,-2,-5,-7,2)+F.finger(-2,-3,-3,-26)+F.finger(2,-3,2,-7,2)+F.finger(5,-2,5,-7,2)+F.finger(-6,2,-18,3),
  yshape: F.palm()+F.finger(-5,-2,-9,-21)+F.finger(-2,-3,-2,-7,2)+F.finger(2,-3,2,-7,2)+F.finger(5,-2,9,-21)+F.finger(-6,2,-14,4),
  pinch: F.palm()+F.finger(-5,-2,-3,-14)+F.finger(-2,-3,-2,-7,2)+F.finger(2,-3,2,-7,2)+F.finger(5,-2,5,-7,2)+F.finger(-6,2,-4,-13),
  claw: F.palm()+F.finger(-5,-2,-10,-12,4)+F.finger(-2,-3,-4,-18,3)+F.finger(2,-3,4,-18,-3)+F.finger(5,-2,10,-12,-4)+F.finger(-6,2,-12,-2,2),
  bent: F.palm()+F.finger(-5,-2,-6,-12,3)+F.finger(-2,-3,-3,-14,3)+F.finger(2,-3,3,-14,-3)+F.finger(5,-2,6,-12,-3)+F.finger(-6,2,-12,4),
  rshape: F.palm()+F.finger(-5,-2,-5,-7,2)+F.finger(-2,-3,-1,-24)+F.finger(2,-3,1,-24)+F.finger(5,-2,5,-7,2)+F.finger(-6,2,-10,2),
};

function drawHand(shape: string, x: number, y: number, rot=0, side='r') {
  const flip = side==='r'?1:-1;
  const t = `translate(${x},${y}) rotate(${rot}) scale(${flip},1)`;
  return `<g transform="${t}">${HAND_SHAPES[shape]||HAND_SHAPES.rest}</g>`;
}

function staticBackdrop() {
  return `<defs><radialGradient id="aura" cx="50%" cy="40%" r="55%"><stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.45"/><stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient></defs><circle cx="200" cy="190" r="160" fill="url(#aura)"/><line x1="40" y1="380" x2="360" y2="380" stroke="#D6C599" stroke-width="1" stroke-dasharray="3 5" opacity="0.6"/>`;
}

export function drawSkeleton(pose: any): string {
  const sL = SK.shoulderL, sR = SK.shoulderR;
  const rWrist = { x: sL.x + pose.rWrist.x, y: sL.y + pose.rWrist.y };
  const lWrist = { x: sR.x + pose.lWrist.x, y: sR.y + pose.lWrist.y };
  const rElbow = solveElbow(sL, rWrist, 'r');
  const lElbow = solveElbow(sR, lWrist, 'l');
  const stroke = `stroke="#1F2A2E" stroke-width="3.5" stroke-linecap="round"`;
  const tilt = pose.headTilt||0;
  const hCx = SK.headCx, hCy = SK.headCy;
  const torso = `<path d="M ${sL.x} ${sL.y} L ${sR.x} ${sR.y} L ${SK.hipR.x} ${SK.hipR.y} L ${SK.hipL.x} ${SK.hipL.y} Z" fill="#FAF2DD" stroke="#1F2A2E" stroke-width="3" stroke-linejoin="round"/>`;
  const legs = `<line x1="${SK.hipL.x}" y1="${SK.hipL.y}" x2="${SK.footL.x}" y2="${SK.footL.y}" ${stroke}/><line x1="${SK.hipR.x}" y1="${SK.hipR.y}" x2="${SK.footR.x}" y2="${SK.footR.y}" ${stroke}/><line x1="${SK.footL.x-8}" y1="${SK.footL.y}" x2="${SK.footL.x+6}" y2="${SK.footL.y}" ${stroke}/><line x1="${SK.footR.x-6}" y1="${SK.footR.y}" x2="${SK.footR.x+8}" y2="${SK.footR.y}" ${stroke}/>`;
  const arms = `<line x1="${sL.x}" y1="${sL.y}" x2="${rElbow.x}" y2="${rElbow.y}" ${stroke}/><line x1="${rElbow.x}" y1="${rElbow.y}" x2="${rWrist.x}" y2="${rWrist.y}" ${stroke}/><line x1="${sR.x}" y1="${sR.y}" x2="${lElbow.x}" y2="${lElbow.y}" ${stroke}/><line x1="${lElbow.x}" y1="${lElbow.y}" x2="${lWrist.x}" y2="${lWrist.y}" ${stroke}/><circle cx="${sL.x}" cy="${sL.y}" r="3.5" fill="#1F2A2E"/><circle cx="${sR.x}" cy="${sR.y}" r="3.5" fill="#1F2A2E"/><circle cx="${rElbow.x}" cy="${rElbow.y}" r="3" fill="#1F2A2E"/><circle cx="${lElbow.x}" cy="${lElbow.y}" r="3" fill="#1F2A2E"/>`;
  const exprMap: any = {
    neutral: `<line x1="${hCx-7}" y1="${hCy+5}" x2="${hCx+7}" y2="${hCy+5}" stroke="#1F2A2E" stroke-width="2" stroke-linecap="round"/>`,
    smile: `<path d="M ${hCx-8} ${hCy+3} Q ${hCx} ${hCy+10} ${hCx+8} ${hCy+3}" stroke="#1F2A2E" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    frown: `<path d="M ${hCx-8} ${hCy+8} Q ${hCx} ${hCy+1} ${hCx+8} ${hCy+8}" stroke="#1F2A2E" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    open: `<ellipse cx="${hCx}" cy="${hCy+5}" rx="3.5" ry="2.5" fill="#1F2A2E"/>`,
    raised: `<line x1="${hCx-7}" y1="${hCy+4}" x2="${hCx+7}" y2="${hCy+6}" stroke="#1F2A2E" stroke-width="2" stroke-linecap="round"/>`,
  };
  const expr = exprMap[pose.expression]||exprMap.neutral;
  const head = `<g transform="rotate(${tilt} ${hCx} ${hCy})"><circle cx="${hCx}" cy="${hCy}" r="${SK.headR}" fill="#FAF2DD" stroke="#1F2A2E" stroke-width="3"/><circle cx="${hCx-8}" cy="${hCy-4}" r="1.8" fill="#1F2A2E"/><circle cx="${hCx+8}" cy="${hCy-4}" r="1.8" fill="#1F2A2E"/>${expr}<line x1="${SK.neck.x}" y1="${SK.neck.y-2}" x2="${SK.neck.x}" y2="${SK.neck.y+14}" ${stroke}/></g>`;
  return staticBackdrop()+torso+legs+arms+head+drawHand(pose.rHand,rWrist.x,rWrist.y,pose.rHandRot||0,'r')+drawHand(pose.lHand,lWrist.x,lWrist.y,pose.lHandRot||0,'l');
}

function P(o: any = {}) {
  return {
    rWrist: o.rWrist||{x:-8,y:130}, lWrist: o.lWrist||{x:8,y:130},
    rHand: o.rHand||'rest', lHand: o.lHand||'rest',
    rHandRot: o.rHandRot??10, lHandRot: o.lHandRot??-10,
    headTilt: o.headTilt||0, expression: o.expression||'neutral',
  };
}

export function lerp(a: number, b: number, t: number){ return a+(b-a)*t; }
export function lerpPose(a: any, b: any, t: number) {
  return {
    rWrist: {x:lerp(a.rWrist.x,b.rWrist.x,t),y:lerp(a.rWrist.y,b.rWrist.y,t)},
    lWrist: {x:lerp(a.lWrist.x,b.lWrist.x,t),y:lerp(a.lWrist.y,b.lWrist.y,t)},
    rHand: t<0.5?a.rHand:b.rHand, lHand: t<0.5?a.lHand:b.lHand,
    rHandRot: lerp(a.rHandRot,b.rHandRot,t), lHandRot: lerp(a.lHandRot,b.lHandRot,t),
    headTilt: lerp(a.headTilt,b.headTilt,t), expression: t<0.5?a.expression:b.expression,
  };
}
export function ease(t: number){ return t*t*(3-2*t); }
export { RESTING_POSE };

const LETTER_SHAPES: any = {
  A:{hand:'fist',rot:0},B:{hand:'flat',rot:0},C:{hand:'cshape',rot:0},D:{hand:'point',rot:0},
  E:{hand:'claw',rot:0},F:{hand:'okay',rot:0},G:{hand:'point',rot:90},H:{hand:'peace',rot:90},
  I:{hand:'yshape',rot:0},J:{hand:'yshape',rot:0},K:{hand:'three',rot:0},L:{hand:'lshape',rot:0},
  M:{hand:'fist',rot:-10},N:{hand:'fist',rot:-10},O:{hand:'oshape',rot:0},P:{hand:'three',rot:90},
  Q:{hand:'point',rot:110},R:{hand:'rshape',rot:0},S:{hand:'fist',rot:0},T:{hand:'fist',rot:8},
  U:{hand:'peace',rot:0},V:{hand:'peace',rot:0},W:{hand:'three',rot:0},X:{hand:'point',rot:-15},
  Y:{hand:'yshape',rot:0},Z:{hand:'point',rot:0},
};

function spellingPose(handShape: string, rot=0, expr='neutral') {
  return P({rWrist:{x:35,y:-10},rHand:handShape,rHandRot:rot,lWrist:{x:8,y:130},lHand:'rest',lHandRot:-10,expression:expr});
}

const W = (rwX:number,rwY:number,rH:string,rRot:number,lwX:number,lwY:number,lH:string,lRot:number,expr='neutral',headTilt=0) =>
  P({rWrist:{x:rwX,y:rwY},rHand:rH,rHandRot:rRot,lWrist:{x:lwX,y:lwY},lHand:lH,lHandRot:lRot,expression:expr,headTilt});

const RL = {x:-8,y:130}, LL = {x:8,y:130};

export const SIGN_DICT: any = {
  HELLO:{cat:'greeting',desc:'Flat hand at the temple, sweeps outward.',frames:[W(-22,-68,'flat',-20,LL.x,LL.y,'rest',-10,'smile'),W(35,-50,'flat',0,LL.x,LL.y,'rest',-10,'smile')]},
  HI:{cat:'greeting',desc:'Casual wave.',frames:[W(30,-65,'open',-15,LL.x,LL.y,'rest',-10,'smile'),W(50,-65,'open',15,LL.x,LL.y,'rest',-10,'smile'),W(30,-65,'open',-15,LL.x,LL.y,'rest',-10,'smile')]},
  GOODBYE:{cat:'greeting',desc:'Open hand waves down.',frames:[W(35,-55,'flat',0,LL.x,LL.y,'rest',-10,'smile'),W(35,-55,'bent',0,LL.x,LL.y,'rest',-10,'smile'),W(35,-55,'flat',0,LL.x,LL.y,'rest',-10,'smile')]},
  BYE:{cat:'greeting',desc:'Casual wave.',frames:[W(35,-55,'flat',0,LL.x,LL.y,'rest',-10),W(35,-55,'bent',0,LL.x,LL.y,'rest',-10),W(35,-55,'flat',0,LL.x,LL.y,'rest',-10)]},
  WELCOME:{cat:'greeting',desc:'Open hand sweeps inward.',frames:[W(60,-10,'flat',20,LL.x,LL.y,'rest',-10,'smile'),W(0,-10,'flat',0,LL.x,LL.y,'rest',-10,'smile')]},
  THANKS:{cat:'polite',desc:'Flat hand from chin moves outward.',frames:[W(10,-55,'flat',-50,LL.x,LL.y,'rest',-10,'smile'),W(50,-25,'flat',-20,LL.x,LL.y,'rest',-10,'smile')]},
  'THANK YOU':{cat:'polite',desc:'Flat hand from chin moves outward.',frames:[W(10,-55,'flat',-50,LL.x,LL.y,'rest',-10,'smile'),W(50,-25,'flat',-20,LL.x,LL.y,'rest',-10,'smile')]},
  PLEASE:{cat:'polite',desc:'Flat hand circles on chest.',frames:[W(5,-10,'flat',-90,LL.x,LL.y,'rest',-10,'smile'),W(20,-25,'flat',-90,LL.x,LL.y,'rest',-10,'smile'),W(5,-10,'flat',-90,LL.x,LL.y,'rest',-10,'smile')]},
  SORRY:{cat:'polite',desc:'Fist circles on chest.',frames:[W(5,-10,'fist',-45,LL.x,LL.y,'rest',-10,'frown'),W(20,-25,'fist',-45,LL.x,LL.y,'rest',-10,'frown'),W(5,-10,'fist',-45,LL.x,LL.y,'rest',-10,'frown')]},
  YES:{cat:'response',desc:'Fist nods up and down.',frames:[W(30,-30,'fist',-10,LL.x,LL.y,'rest',-10),W(30,-10,'fist',20,LL.x,LL.y,'rest',-10),W(30,-30,'fist',-10,LL.x,LL.y,'rest',-10)]},
  NO:{cat:'response',desc:'Fingers snap to thumb.',frames:[W(35,-30,'peace',-10,LL.x,LL.y,'rest',-10),W(35,-30,'pinch',-10,LL.x,LL.y,'rest',-10)]},
  OK:{cat:'response',desc:'Thumb-index circle.',frames:[W(35,-40,'okay',0,LL.x,LL.y,'rest',-10,'smile'),W(35,-45,'okay',0,LL.x,LL.y,'rest',-10,'smile')]},
  MAYBE:{cat:'response',desc:'Two hands alternate.',frames:[W(30,-10,'flat',-90,30,30,'flat',90),W(30,30,'flat',-90,30,-10,'flat',90),W(30,-10,'flat',-90,30,30,'flat',90)]},
  I:{cat:'pronoun',desc:'Points to own chest.',frames:[W(5,-10,'point',-90,LL.x,LL.y,'rest',-10),W(5,-10,'point',-90,LL.x,LL.y,'rest',-10)]},
  ME:{cat:'pronoun',desc:'Points to own chest.',frames:[W(5,-10,'point',-90,LL.x,LL.y,'rest',-10),W(5,-5,'point',-90,LL.x,LL.y,'rest',-10)]},
  YOU:{cat:'pronoun',desc:'Points at listener.',frames:[W(50,-10,'point',90,LL.x,LL.y,'rest',-10),W(60,-10,'point',90,LL.x,LL.y,'rest',-10)]},
  MY:{cat:'pronoun',desc:'Flat hand on chest.',frames:[W(25,-20,'flat',-90,LL.x,LL.y,'rest',-10),W(5,-10,'flat',-90,LL.x,LL.y,'rest',-10)]},
  YOUR:{cat:'pronoun',desc:'Flat hand pushes outward.',frames:[W(25,-10,'flat',90,LL.x,LL.y,'rest',-10),W(60,-10,'flat',90,LL.x,LL.y,'rest',-10)]},
  WE:{cat:'pronoun',desc:'Index arcs shoulder to shoulder.',frames:[W(5,-10,'point',-45,LL.x,LL.y,'rest',-10),W(-25,-10,'point',-45,LL.x,LL.y,'rest',-10)]},
  LOVE:{cat:'verb',desc:'Arms cross over chest.',frames:[W(30,10,'fist',-45,30,10,'fist',45,'smile'),W(-15,-10,'fist',-45,-15,-10,'fist',45,'smile')]},
  LIKE:{cat:'verb',desc:'Thumb+middle finger pinch out.',frames:[W(5,-10,'five',-45,LL.x,LL.y,'rest',-10),W(35,-10,'pinch',-30,LL.x,LL.y,'rest',-10,'smile')]},
  WANT:{cat:'verb',desc:'Open hands pull inward.',frames:[W(50,10,'claw',60,50,10,'claw',-60),W(15,30,'claw',60,15,30,'claw',-60)]},
  HELP:{cat:'verb',desc:'Fist on palm lifts together.',frames:[W(30,30,'fist',-45,30,30,'flat',0),W(30,-10,'fist',-45,30,-10,'flat',0)]},
  GO:{cat:'verb',desc:'Both index fingers swing forward.',frames:[W(5,-10,'point',-10,5,-10,'point',10),W(50,-10,'point',90,50,-10,'point',-90)]},
  COME:{cat:'verb',desc:'Index fingers spiral inward.',frames:[W(50,-20,'point',60,50,-20,'point',-60),W(10,0,'point',-30,10,0,'point',30)]},
  EAT:{cat:'verb',desc:'Pinched fingers to mouth.',frames:[W(25,-55,'pinch',90,LL.x,LL.y,'rest',-10,'open'),W(10,-65,'pinch',90,LL.x,LL.y,'rest',-10,'open'),W(25,-55,'pinch',90,LL.x,LL.y,'rest',-10,'open')]},
  DRINK:{cat:'verb',desc:'C-hand tips to mouth.',frames:[W(30,-30,'cshape',90,LL.x,LL.y,'rest',-10),W(15,-60,'cshape',130,LL.x,LL.y,'rest',-10)]},
  SLEEP:{cat:'verb',desc:'Hand drifts down over face.',frames:[W(10,-90,'open',-30,LL.x,LL.y,'rest',-10),W(10,-55,'fist',-30,LL.x,LL.y,'rest',-10)]},
  WORK:{cat:'verb',desc:'Fist taps on fist twice.',frames:[W(10,0,'fist',-30,10,30,'fist',30),W(10,30,'fist',-30,10,30,'fist',30),W(10,0,'fist',-30,10,30,'fist',30)]},
  KNOW:{cat:'verb',desc:'Bent fingers tap forehead.',frames:[W(25,-90,'bent',-45,LL.x,LL.y,'rest',-10),W(10,-85,'bent',-45,LL.x,LL.y,'rest',-10)]},
  THINK:{cat:'verb',desc:'Index taps temple.',frames:[W(30,-95,'point',-45,LL.x,LL.y,'rest',-10),W(25,-88,'point',-45,LL.x,LL.y,'rest',-10)]},
  HAPPY:{cat:'feeling',desc:'Flat hand brushes up chest.',frames:[W(10,30,'flat',-90,LL.x,LL.y,'rest',-10,'smile'),W(10,-30,'flat',-90,LL.x,LL.y,'rest',-10,'smile'),W(10,30,'flat',-90,LL.x,LL.y,'rest',-10,'smile')]},
  SAD:{cat:'feeling',desc:'Hands drag down face.',frames:[W(0,-85,'five',-90,0,-85,'five',90,'frown',-8),W(0,-30,'five',-90,0,-30,'five',90,'frown',-8)]},
  ANGRY:{cat:'feeling',desc:'Claw pulls from face.',frames:[W(5,-75,'claw',-45,LL.x,LL.y,'rest',-10,'frown'),W(35,-55,'claw',10,LL.x,LL.y,'rest',-10,'frown')]},
  GOOD:{cat:'feeling',desc:'Flat hand from chin to palm.',frames:[W(10,-55,'flat',-90,30,30,'flat',0,'smile'),W(30,30,'flat',-90,30,30,'flat',0,'smile')]},
  BAD:{cat:'feeling',desc:'Flat hand flips away.',frames:[W(10,-55,'flat',-90,LL.x,LL.y,'rest',-10,'frown'),W(35,0,'flat',90,LL.x,LL.y,'rest',-10,'frown')]},
  WHAT:{cat:'question',desc:'Index drags across palm.',frames:[W(5,0,'point',-90,30,0,'flat',0,'raised'),W(50,0,'point',-90,30,0,'flat',0,'raised')]},
  WHERE:{cat:'question',desc:'Index shakes side to side.',frames:[W(30,-30,'point',-10,LL.x,LL.y,'rest',-10,'raised'),W(30,-30,'point',20,LL.x,LL.y,'rest',-10,'raised'),W(30,-30,'point',-10,LL.x,LL.y,'rest',-10,'raised')]},
  WHO:{cat:'question',desc:'Index circles at chin.',frames:[W(18,-60,'point',90,LL.x,LL.y,'rest',-10,'raised'),W(25,-55,'point',90,LL.x,LL.y,'rest',-10,'raised'),W(18,-60,'point',90,LL.x,LL.y,'rest',-10,'raised')]},
  WHY:{cat:'question',desc:'Bent fingers pull from forehead.',frames:[W(25,-90,'bent',-45,LL.x,LL.y,'rest',-10,'raised'),W(50,-50,'yshape',-10,LL.x,LL.y,'rest',-10,'raised')]},
  HOW:{cat:'question',desc:'Bent hands roll forward.',frames:[W(15,10,'bent',60,15,10,'bent',-60,'raised'),W(30,-10,'flat',10,30,-10,'flat',-10,'raised')]},
  NAME:{cat:'noun',desc:'H-fingers tap together.',frames:[W(25,0,'peace',-30,25,10,'peace',30),W(25,10,'peace',-30,25,10,'peace',30)]},
  HOME:{cat:'noun',desc:'Pinched fingers touch cheek.',frames:[W(25,-75,'pinch',-45,LL.x,LL.y,'rest',-10),W(30,-90,'pinch',-45,LL.x,LL.y,'rest',-10)]},
  SCHOOL:{cat:'noun',desc:'Right hand claps on left twice.',frames:[W(25,-10,'flat',-45,25,30,'flat',0),W(25,30,'flat',-45,25,30,'flat',0),W(25,-10,'flat',-45,25,30,'flat',0)]},
  FAMILY:{cat:'family',desc:'Two F-shapes circle outward.',frames:[W(10,-10,'okay',-30,10,-10,'okay',30),W(50,-10,'okay',20,50,-10,'okay',-20),W(30,10,'okay',-50,30,10,'okay',50)]},
  FRIEND:{cat:'family',desc:'Index fingers hook together.',frames:[W(25,-10,'point',60,25,-10,'point',-60),W(25,-10,'point',-60,25,-10,'point',60)]},
  TODAY:{cat:'time',desc:'Y-shapes drop down.',frames:[W(30,-20,'yshape',-45,30,-20,'yshape',45),W(30,10,'yshape',-45,30,10,'yshape',45),W(30,-20,'yshape',-45,30,-20,'yshape',45)]},
  NOW:{cat:'time',desc:'Bent hands drop down.',frames:[W(30,-20,'yshape',-45,30,-20,'yshape',45),W(30,20,'yshape',-45,30,20,'yshape',45)]},
  STOP:{cat:'misc',desc:'Hand karate-chops onto palm.',frames:[W(25,-40,'flat',0,30,30,'flat',0),W(25,25,'flat',0,30,30,'flat',0)]},
  MORE:{cat:'misc',desc:'Flat-O hands tap fingertips.',frames:[W(25,0,'oshape',-45,25,10,'oshape',45),W(25,5,'oshape',-45,25,5,'oshape',45),W(25,0,'oshape',-45,25,10,'oshape',45)]},
  FINISH:{cat:'misc',desc:'Five-hands flip outward.',frames:[W(25,-10,'five',-90,25,-10,'five',90),W(35,-10,'five',90,35,-10,'five',-90)]},
};

export function buildSequenceFromText(text: string): any[] {
  const tokens = tokenize(text);
  const seq: any[] = [];
  for (const tok of tokens) {
    if (tok.kind==='space') { seq.push({label:' ',kind:'space',frames:[RESTING_POSE,RESTING_POSE],desc:''}); continue; }
    const sign = SIGN_DICT[tok.value];
    if (sign) {
      seq.push({label:tok.value,kind:'word',frames:[RESTING_POSE,...sign.frames,RESTING_POSE],desc:sign.desc,cat:sign.cat,sourceWord:tok.value});
      continue;
    }
    const letters = [...tok.value].filter(c=>/[A-Za-z]/.test(c));
    if (!letters.length) continue;
    const firstDef = LETTER_SHAPES[letters[0].toUpperCase()];
    seq.push({label:tok.value,kind:'spell-start',frames:[RESTING_POSE,spellingPose(firstDef.hand,firstDef.rot)],desc:'Fingerspelling: '+tok.value,sourceWord:tok.value});
    for (let i=0;i<letters.length;i++) {
      const L = letters[i].toUpperCase();
      const def = LETTER_SHAPES[L];
      if (!def) continue;
      seq.push({label:L,kind:'letter',frames:[spellingPose(def.hand,def.rot),spellingPose(def.hand,def.rot+5)],desc:'Letter '+L,sourceWord:tok.value,letterIndex:i});
    }
    const lastDef = LETTER_SHAPES[letters[letters.length-1].toUpperCase()];
    seq.push({label:' ',kind:'spell-end',frames:[spellingPose(lastDef.hand,lastDef.rot),RESTING_POSE],desc:'',sourceWord:tok.value});
  }
  return seq;
}

function tokenize(text: string): any[] {
  const out: any[] = [];
  const upper = text.toUpperCase();
  const parts = upper.split(/(\s+)/);
  let i = 0;
  while (i<parts.length) {
    const p = parts[i];
    if (/^\s+$/.test(p)) { out.push({kind:'space',value:' '}); i++; continue; }
    const clean = p.replace(/[^A-Z0-9'-]/g,'');
    if (!clean) { i++; continue; }
    let merged = null;
    if (i+2<parts.length) {
      const next = parts[i+2].replace(/[^A-Z0-9'-]/g,'');
      const combo = clean+' '+next;
      if (combo==='THANK YOU') merged = combo;
    }
    if (merged) { out.push({kind:'word',value:merged}); i+=3; }
    else { out.push({kind:'word',value:clean}); i++; }
  }
  return out;
}