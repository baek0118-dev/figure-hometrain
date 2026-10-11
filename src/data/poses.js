// 스틱맨 포즈 — 설계 §7. 각도 규칙은 domain/kinematics.js 참고 (몸통·머리 0=위, 팔다리 0=아래, +=앞).
// 포즈 = 프레임 하나 또는 { frames:[...], ms, props }. props: wall·bench·rope·pad·tramp·spin (그림 소품).
// ※ 각도는 그림용 근사치 — 포즈 갤러리(tests/browser/poses.html)를 보고 엄마·코치가 이상한 것만 알려 주면 고친다.

const S = { view: 'side', torso: 0, head: 0, armR: [8, 12], armL: [-8, -4], legR: [0, 0, 90], legL: [0, 0, 90] };
const P = o => ({ ...S, ...o });
const F = o => ({ ...S, view: 'front', armR: [18, 10], armL: [-18, -10], legR: [6, 6, 90], legL: [-6, -6, -90], ...o });
const A = (frames, ms = 700, extra = {}) => ({ frames, ms, ...extra });

// 자주 쓰는 다리·팔
const squatLegs = { legR: [80, -12, 90], legL: [78, -14, 90] };
const relevé = { legR: [0, 0, 150], legL: [0, 0, 150] };
const armsChest = { armR: [35, 150], armL: [30, 145] };          // 가슴 앞으로 당긴 팔(회전)
const lying = { torso: -90, head: -90, anchor: 'center' };        // 등 대고 누움(머리 왼쪽)
const prone = { torso: 90, head: 90, anchor: 'center' };          // 엎드림(머리 오른쪽)

export const POSES = {
  // ── 웜업 ──
  march: A([
    P({ legR: [80, 0, 90], armL: [70, 110], armR: [-35, -20] }),
    P({ legL: [80, 0, 90], armR: [70, 110], armL: [-35, -20] }),
  ], 600),
  armCircle: A([
    P({ armR: [0, 0], armL: [0, 0] }), P({ armR: [90, 90], armL: [90, 90] }),
    P({ armR: [175, 175], armL: [175, 175] }), P({ armR: [-90, -90], armL: [-90, -90] }),
  ], 500),
  hipCircle: A([
    P({ torso: 12, armR: [-25, 115], armL: [-25, 115] }),
    P({ torso: -12, armR: [-25, 115], armL: [-25, 115] }),
  ], 700),
  ankleCircle: A([
    P({ legR: [15, -15, 160], armR: [-25, 115], armL: [-25, 115] }),
    P({ legR: [15, -15, 120], armR: [-25, 115], armL: [-25, 115] }),
  ], 600),
  legSwing: A([
    P({ legR: [65, 55, 110], armL: [80, 90], anchor: 'ankleL' }),
    P({ legR: [-45, -45, 70], armL: [80, 90], anchor: 'ankleL' }),
  ], 650, { props: ['wall'] }),
  sideStep: A([
    F({ legR: [22, 22, 90], legL: [-22, -22, -90] }),
    F({ legR: [5, 5, 90], legL: [-5, -5, -90] }),
  ], 500),

  // ── 쿨다운 ──
  catCow: A([
    P({ torso: 90, head: 60, armR: [0, 0], armL: [0, 0], legR: [0, -90, -90], legL: [0, -90, -90], anchor: 'center' }),
    P({ torso: 90, head: 140, armR: [0, 0], armL: [0, 0], legR: [0, -90, -90], legL: [0, -90, -90], anchor: 'center' }),
  ], 1400),
  butterfly: F({ legR: [110, -70, -20], legL: [-110, 70, 20], armR: [20, -10], armL: [-20, 10] }),
  seatedFold: A([
    P({ torso: 20, head: 20, legR: [90, 90, 180], legL: [90, 90, 180], armR: [80, 85], armL: [75, 80], anchor: 'center' }),
    P({ torso: 65, head: 80, legR: [90, 90, 180], legL: [90, 90, 180], armR: [100, 95], armL: [95, 92], anchor: 'center' }),
  ], 1600),
  sideQuad: P({ ...prone, legR: [-90, 150, 120], legL: [-92, -92, -10], armR: [-115, -95], armL: [70, 80] }), // 엎드려 허벅지 앞
  childPose: P({ torso: 98, head: 112, legR: [90, -90, -90], legL: [90, -90, -90], armR: [95, 92], armL: [93, 90], anchor: 'center' }),
  kneeHug: P({ ...lying, torso: -80, head: -70, legR: [-155, 75, 170], legL: [-150, 70, 170], armR: [170, 120], armL: [165, 115] }),
  breathe: A([
    P({ ...lying, legR: [90, 90, 180], legL: [90, 90, 180], armR: [120, 70], armL: [90, 90] }),
    P({ ...lying, torso: -88, legR: [90, 90, 180], legL: [90, 90, 180], armR: [125, 72], armL: [90, 90] }),
  ], 2500),
  calfStretch: P({ torso: 25, head: 15, legR: [35, -10, 90], legL: [-25, -25, 90], armR: [80, 85], armL: [75, 85], props: ['wall'] }),
  standQuad: P({ legR: [5, -165, -120], armR: [-25, -70], armL: [80, 90], props: ['wall'] }),
  wideFold: P({ torso: 105, head: 130, armR: [5, 0], armL: [0, -5], legR: [8, 8, 90], legL: [-8, -8, 90] }),
  benchHam: A([
    P({ torso: 15, legR: [90, 90, 180], legL: [0, 0, 90], armR: [95, 95], armL: [90, 90], anchor: 'ankleL', props: ['bench'] }),
    P({ torso: 45, head: 55, legR: [90, 90, 180], legL: [0, 0, 90], armR: [110, 100], armL: [105, 100], anchor: 'ankleL', props: ['bench'] }),
  ], 1600),
  shoulderStretch: F({ armR: [-95, -95], armL: [-30, -110] }),
  sideBend: A([
    F({ torso: 15, head: 15, armR: [170, 175], armL: [165, 170] }),
    F({ torso: -15, head: -15, armR: [-165, -170], armL: [-170, -175] }),
  ], 1500),
  walkBreathe: A([
    P({ legR: [25, 10, 90], legL: [-20, -25, 90], armR: [100, 140], armL: [95, 135] }),
    P({ legR: [-20, -25, 90], legL: [25, 10, 90], armR: [10, 15], armL: [5, 10] }),
  ], 1300),

  // ── 점프 탄력 ──
  squatJump: A([
    P({ torso: 35, head: 20, ...squatLegs, armR: [-45, -30], armL: [-40, -25] }),
    P({ torso: 0, legR: [0, 0, 150], legL: [-3, -3, 150], armR: [120, 125], armL: [115, 120], air: 25 }),
    P({ torso: 30, head: 15, ...squatLegs, armR: [60, 80], armL: [55, 75] }),
  ], 550),
  pogo: A([
    P({ ...relevé, armR: [20, 60], armL: [15, 55] }),
    P({ ...relevé, armR: [20, 60], armL: [15, 55], air: 12 }),
  ], 300),
  waltzJump: A([
    P({ torso: 10, legR: [-40, -40, 60], legL: [10, -15, 90], armR: [-40, -30], armL: [60, 70], anchor: 'hip' }),
    P({ torso: -5, legR: [75, 60, 130], legL: [-30, -30, 150], armR: [110, 120], armL: [100, 115], air: 25, anchor: 'hip', props: ['spin'] }),
    P({ torso: 15, legR: [12, -15, 90], legL: [-75, -75, 40], armR: [85, 85], armL: [-70, -75], anchor: 'hip' }),
  ], 600),
  singleTurnJump: A([
    P({ torso: 25, ...squatLegs, armR: [70, 80], armL: [-40, -30] }),
    P({ legR: [3, 3, 150], legL: [-3, -3, 150], ...armsChest, air: 25, props: ['spin'] }),
    P({ torso: 20, ...squatLegs, armR: [80, 85], armL: [-60, -70] }),
  ], 550),
  salchowEntry: A([
    P({ torso: 10, legL: [10, -20, 90], legR: [-40, -40, 70], armR: [80, 80], armL: [-60, -60], anchor: 'ankleL' }),
    P({ torso: 15, legL: [15, -25, 90], legR: [60, 40, 120], armR: [40, 120], armL: [30, 130], anchor: 'ankleL' }),
    P({ legR: [3, 3, 150], legL: [-3, -3, 150], ...armsChest, air: 22, props: ['spin'] }),
    P({ torso: 15, legR: [12, -15, 90], legL: [-75, -75, 40], armR: [85, 85], armL: [-70, -75] }),
  ], 600),
  toeloopEntry: A([
    P({ torso: 15, legR: [12, -18, 90], legL: [-45, -45, 30], armR: [80, 80], armL: [-55, -60] }),
    P({ legR: [3, 3, 150], legL: [-3, -3, 150], ...armsChest, air: 22, props: ['spin'] }),
    P({ torso: 15, legR: [12, -15, 90], legL: [-75, -75, 40], armR: [85, 85], armL: [-70, -75] }),
  ], 600),
  squatRise: A([
    P({ torso: 35, head: 20, ...squatLegs, armR: [80, 85], armL: [75, 80] }),
    P({ ...relevé, armR: [100, 110], armL: [95, 105] }),
  ], 900),
  halfTurn: A([
    P({ ...relevé, armR: [85, 90], armL: [-70, -80] }),
    P({ ...relevé, ...armsChest, props: ['spin'] }),
    P({ legR: [10, -12, 90], legL: [-60, -60, 40], armR: [85, 85], armL: [-70, -75] }),
  ], 650),
  ropeBoth: A([
    P({ ...relevé, armR: [25, 70], armL: [20, 65], props: ['rope'] }),
    P({ ...relevé, armR: [25, 70], armL: [20, 65], air: 12, props: ['rope'] }),
  ], 300),
  ropeAlt: A([
    P({ legR: [0, 0, 150], legL: [-10, -80, 120], armR: [25, 70], armL: [20, 65], props: ['rope'] }),
    P({ legL: [0, 0, 150], legR: [-10, -80, 120], armR: [25, 70], armL: [20, 65], props: ['rope'] }),
  ], 320),
  trampHalf: A([
    P({ torso: 10, legR: [20, -15, 90], legL: [18, -18, 90], armR: [40, 70], armL: [35, 65], props: ['tramp'] }),
    P({ legR: [3, 3, 150], legL: [-3, -3, 150], armR: [100, 110], armL: [95, 105], air: 22, props: ['tramp', 'spin'] }),
    P({ torso: 15, legR: [30, -20, 90], legL: [28, -22, 90], armR: [80, 85], armL: [75, 80], props: ['tramp'] }),
  ], 600),
  trampFull: A([
    P({ torso: 10, legR: [20, -15, 90], legL: [18, -18, 90], armR: [70, 80], armL: [-40, -30], props: ['tramp'] }),
    P({ legR: [3, 3, 150], legL: [-3, -3, 150], ...armsChest, air: 25, props: ['tramp', 'spin'] }),
    P({ torso: 15, legR: [30, -20, 90], legL: [28, -22, 90], armR: [80, 85], armL: [75, 80], props: ['tramp'] }),
  ], 600),

  // ── 스핀 코어 ──
  plank: P({ ...prone, head: 95, legR: [-90, -90, 0], legL: [-90, -90, 0], armR: [0, 90], armL: [0, 88] }),
  sidePlank: F({ torso: 70, head: 70, legR: [-70, -70, -160], legL: [-72, -72, -160], armL: [0, 90], armR: [175, 175], anchor: 'center' }),
  hollow: A([
    P({ ...lying, torso: -75, head: -70, legR: [105, 105, 160], legL: [105, 105, 160], armR: [-110, -110], armL: [-108, -108] }),
    P({ ...lying, torso: -78, head: -72, legR: [102, 102, 160], legL: [102, 102, 160], armR: [-112, -112], armL: [-110, -110] }),
  ], 1200),
  deadBug: A([
    P({ ...lying, legR: [100, 100, 170], legL: [180, 90, 180], armR: [180, 180], armL: [-100, -100] }),
    P({ ...lying, legL: [100, 100, 170], legR: [180, 90, 180], armL: [180, 180], armR: [-100, -100] }),
  ], 1100),
  spinAxis: P({ legR: [0, 0, 90], legL: [45, -50, 120], ...armsChest, anchor: 'ankleR' }),
  superman: A([
    P({ ...prone, torso: 88, head: 88, legR: [-92, -92, -20], legL: [-92, -92, -20], armR: [92, 92], armL: [92, 92] }),
    P({ ...prone, torso: 80, head: 75, legR: [-100, -100, -20], legL: [-100, -100, -20], armR: [102, 102], armL: [102, 102] }),
  ], 1300),
  spinpadSpin: A([
    P({ legR: [0, 0, 90], legL: [45, -50, 120], armR: [85, 90], armL: [-70, -80], props: ['pad'] }),
    P({ legR: [0, 0, 90], legL: [45, -50, 120], ...armsChest, props: ['pad', 'spin'] }),
  ], 800),
  spinpadStop: A([
    P({ legR: [10, -10, 90], legL: [-30, -30, 60], armR: [85, 90], armL: [-70, -80], props: ['pad'] }),
    P({ legR: [0, 0, 90], legL: [45, -50, 120], ...armsChest, props: ['pad', 'spin'] }),
    P({ legR: [12, -15, 90], legL: [-75, -75, 40], armR: [85, 85], armL: [-70, -75], props: ['pad'] }),
  ], 800),
  releveAxis: P({ ...relevé, armR: [55, 125], armL: [50, 120] }),
  trampSpin: A([
    P({ legR: [10, -8, 90], legL: [8, -10, 90], armR: [85, 90], armL: [-70, -80], props: ['tramp'] }),
    P({ legR: [3, 3, 150], legL: [-3, -3, 150], ...armsChest, air: 15, props: ['tramp', 'spin'] }),
  ], 650),

  // ── 한발 밸런스 ──
  singleLeg: P({ legL: [70, 0, 90], armR: [35, 45], armL: [25, 35] }),
  landing: P({ torso: 15, legR: [12, -15, 90], legL: [-75, -75, 40], armR: [85, 85], armL: [-70, -75] }),
  threeTurn: A([
    P({ torso: 10, legR: [12, -15, 90], legL: [-25, -25, 60], armR: [80, 80], armL: [-50, -55] }),
    P({ torso: 10, legR: [12, -15, 90], legL: [-25, -25, 60], armR: [-50, -55], armL: [80, 80], props: ['spin'] }),
  ], 700),
  singleLegRdl: A([
    P({ legL: [-10, -10, 90], armR: [5, 5], armL: [0, 0] }),
    P({ torso: 85, head: 80, legR: [5, 5, 90], legL: [-85, -85, -10], armR: [5, 0], armL: [0, -5] }),
  ], 1300),
  calfRaise: A([
    P({ legL: [-15, -100, -60], armR: [80, 90], props: ['wall'] }),
    P({ legR: [0, 0, 150], legL: [-15, -100, -60], armR: [80, 90], props: ['wall'] }),
  ], 800),

  // ── 유연성 ──
  spiral: P({ torso: 65, head: 40, legR: [0, 0, 90], legL: [-95, -95, -60], armR: [95, 95], armL: [-100, -100], props: ['wall'] }),
  frontSplit: P({ torso: 0, legR: [90, 90, 180], legL: [-90, -90, -10], armR: [80, 90], armL: [-80, -90], anchor: 'hip' }),
  straddle: A([
    F({ legR: [88, 88, 180], legL: [-88, -88, -180], armR: [60, 80], armL: [-60, -80] }),
    F({ torso: 0, head: 15, legR: [88, 88, 180], legL: [-88, -88, -180], armR: [95, 100], armL: [-95, -100] }),
  ], 1500),
  bridge: P({ torso: 125, head: 160, armR: [15, 5], armL: [12, 3], legR: [-35, 5, 90], legL: [-38, 3, 90], anchor: 'center' }),
  lungeStretch: A([
    P({ torso: 0, legR: [75, -5, 90], legL: [-45, -90, -90], armR: [40, 70], armL: [35, 65], anchor: 'center' }),
    P({ torso: -8, head: -5, legR: [80, -5, 90], legL: [-50, -90, -90], armR: [170, 175], armL: [165, 170], anchor: 'center' }),
  ], 1600),
};

export const framesOf = p => (p.frames ? p.frames : [p]);
export const propsOf = p => p.props ?? framesOf(p)[0].props ?? [];
