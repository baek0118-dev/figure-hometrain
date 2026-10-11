// 운동 마스터 검증 — 설계 §2.1. 오류 문자열 배열을 돌려준다(빈 배열 = 통과).

export const CATEGORIES = ['jump', 'spin', 'balance', 'flex'];
const ALL_CATEGORIES = [...CATEGORIES, 'warmup', 'cooldown'];
// 1급 싱글 과제만. loop·flip·lutz 는 1급 범위 밖이라 일부러 없음.
export const ELEMENTS = ['waltz', 'salchow', 'toeloop', 'upright', 'threeturn', 'spiral', 'split'];
const MODES = ['timed', 'reps', 'hold'];
export const EQUIPMENT = ['none', 'rope', 'mat', 'spinpad', 'wall', 'trampoline'];
export const PLACES = ['home', 'park', 'playground'];
const CHECKPOINT_MAX = 18;

const isInt = (n, lo, hi) => Number.isInteger(n) && n >= lo && n <= hi;

function levelVolume(ex, l) {
  return l.sets * (ex.mode === 'reps' ? l.reps : l.workSec);
}

function validateLevels(ex, errs) {
  const fixed = ex.category === 'warmup' || ex.category === 'cooldown';
  const want = fixed ? 1 : 5;
  if (!Array.isArray(ex.levels) || ex.levels.length !== want) {
    errs.push(`${ex.id}: levels 는 ${want}개여야 함`);
    return;
  }
  ex.levels.forEach((l, i) => {
    const tag = `${ex.id} Lv${i + 1}`;
    if (!isInt(l.sets, 1, 5)) errs.push(`${tag}: sets 1~5`);
    if (!isInt(l.restSec, 0, 120)) errs.push(`${tag}: restSec 0~120`);
    if (ex.mode === 'reps') {
      if (!isInt(l.reps, 1, 30)) errs.push(`${tag}: reps 1~30 필요`);
    } else if (ex.mode === 'hold') {
      if (!isInt(l.workSec, 10, 60)) errs.push(`${tag}: hold workSec 10~60`);
    } else if (!isInt(l.workSec, 10, 90)) {
      errs.push(`${tag}: timed workSec 10~90`);
    }
  });
  for (let i = 1; i < ex.levels.length; i++) {
    if (levelVolume(ex, ex.levels[i]) < levelVolume(ex, ex.levels[i - 1])) {
      errs.push(`${ex.id}: Lv${i + 1} 볼륨이 Lv${i} 보다 작음`);
    }
  }
}

export function validateExercise(ex) {
  const errs = [];
  const id = ex?.id ?? '(id 없음)';
  if (typeof ex.id !== 'string' || !ex.id) errs.push('id 필요');
  if (typeof ex.name !== 'string' || !ex.name) errs.push(`${id}: name 필요`);
  if (!ALL_CATEGORIES.includes(ex.category)) errs.push(`${id}: category '${ex.category}' 없음`);
  if (!Array.isArray(ex.elements)) {
    errs.push(`${id}: elements 배열 필요`);
  } else {
    for (const e of ex.elements) if (!ELEMENTS.includes(e)) errs.push(`${id}: elements '${e}' 는 1급 과제가 아님`);
  }
  if (!MODES.includes(ex.mode)) errs.push(`${id}: mode '${ex.mode}' 없음`);
  for (const k of ['perSide', 'impact', 'quiet']) {
    if (typeof ex[k] !== 'boolean') errs.push(`${id}: ${k} 는 true/false`);
  }
  // impact = 높이·회전이 있는 강한 착지. 접촉 수(세션 60회 상한)를 세야 하므로 reps 동작만 허용.
  // 줄넘기·가벼운 콩콩 뛰기는 impact:false, quiet:false 로 표시한다.
  if (ex.impact && !isInt(ex.contactsPerRep, 1, 4)) errs.push(`${id}: impact 동작은 contactsPerRep 1~4 필요`);
  if (ex.impact && ex.mode !== 'reps') errs.push(`${id}: impact 동작은 reps 모드만 (현재 ${ex.mode})`);
  if (!Array.isArray(ex.equipment) || ex.equipment.some(q => !EQUIPMENT.includes(q))) {
    errs.push(`${id}: equipment 값 이상 (${ex.equipment})`);
  }
  if (!Array.isArray(ex.places) || ex.places.length === 0 || ex.places.some(p => !PLACES.includes(p))) {
    errs.push(`${id}: places 값 이상 (${ex.places})`);
  }
  if (!Array.isArray(ex.checkpoints) || ex.checkpoints.length !== 3) {
    errs.push(`${id}: checkpoints 는 정확히 3줄`);
  } else {
    ex.checkpoints.forEach((c, i) => {
      if (typeof c !== 'string' || !c) errs.push(`${id}: checkpoints[${i}] 빈 줄`);
      else if ([...c].length > CHECKPOINT_MAX) errs.push(`${id}: checkpoints[${i}] ${CHECKPOINT_MAX}자 초과 (${[...c].length}자)`);
    });
  }
  if (ex.caution !== undefined && typeof ex.caution !== 'string') errs.push(`${id}: caution 은 문자열`);
  if (ex.secPerRep !== undefined && !isInt(ex.secPerRep, 1, 15)) errs.push(`${id}: secPerRep 1~15`);
  if (typeof ex.poseId !== 'string' || !ex.poseId) errs.push(`${id}: poseId 필요`);
  if (MODES.includes(ex.mode)) validateLevels(ex, errs);
  return errs;
}

export function validateAll(list) {
  const errs = [];
  const seen = new Set();
  for (const ex of list) {
    if (seen.has(ex.id)) errs.push(`${ex.id}: id 중복`);
    seen.add(ex.id);
    errs.push(...validateExercise(ex));
  }
  return errs;
}
