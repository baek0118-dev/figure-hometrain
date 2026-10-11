// AI 다음 운동 추천 — 설계 §10.3. 입력 요약(개인정보 없음) → 구조화 출력 요청.
// 결과는 반드시 domain/guard.js 를 거쳐서 쓴다.

import { EXERCISES } from '../data/exercises.js';
import { CATEGORIES } from '../domain/validate.js';
import { WEEK_TEMPLATES } from '../data/templates.js';
import { addDays, daysBetween, weekday } from '../domain/dates.js';

export const COACH_MODEL = 'claude-opus-5-5';
const HISTORY_DAYS = 14;
const NOTE_MAX = 200;
const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
const PLACE_KO = { home: '집', park: '공원', playground: '놀이터(방방)' };

// ── 시스템 프롬프트 (고정 → 캐시) ─────────────────────
function poolTable() {
  const lv = (e, l) => `${l.sets}x${e.mode === 'reps' ? `${l.reps}회` : `${l.workSec}초`}`;
  return EXERCISES.filter(e => CATEGORIES.includes(e.category)).map(e => [
    e.id, e.name, e.category, e.mode + (e.perSide ? '/좌우' : ''),
    e.elements.join('+') || '-',
    e.places.map(p => PLACE_KO[p]).join('·'),
    e.impact ? `강한착지(${e.contactsPerRep}접촉/회)` : '',
    e.quiet ? '조용' : '소음',
    e.levels.map((l, i) => `L${i + 1}:${lv(e, l)}`).join(' '),
  ].join(' | ')).join('\n');
}

const weekLine = Object.entries(WEEK_TEMPLATES)
  .map(([wd, cats]) => `${WEEKDAY_KO[Number(wd)]}: ${cats.join(', ')}`).join('\n');

export const COACH_SYSTEM = `너는 초등학생 피겨스케이팅 선수의 지상훈련(오프아이스) 코치 보조다.
엄마와 아이가 집·공원·놀이터에서 하는 홈트 앱이 운동 기록을 보내면, 다음 운동 메뉴를 정한다.
선수의 목표는 피겨 1급(싱글) 승급 심사: 왈츠 점프, 싱글 살코, 싱글 토룹, 업라이트 스핀, 연속 쓰리턴·에지, 스파이럴·스플릿 유연성.
룹·플립·러츠는 범위 밖이다.

## 할 일
- 입력의 recentSessions(최근 14일 기록·평가)와 rulePlan(규칙 엔진의 기본 추천)을 보고, rulePlan 을 고쳐 forDate 의 본운동을 정한다.
- 고칠 이유가 없으면 rulePlan 을 거의 그대로 둬도 된다. 바꾼 이유는 parentNote 에 엄마가 이해하게 짧게 적는다.
- 웜업·쿨다운은 앱이 고정으로 붙인다. items 에는 본운동만 넣는다.
- 본운동은 블록(카테고리) 3~4개, 블록마다 동작 1~4개, 합계 20~35분(회복·쉬는 날은 15~25분). 같은 동작 중복 금지.
- 평가 의미: rpe light=가벼움, right=적당, hard=완전 지침 / difficulty easy=혼자서도 척척, confusing=조금 헷갈림, hard=아직 너무 어려움.
- 지친 날이 이어지면 회복(mode=recovery)이나 쉬기(mode=rest)를 고른다. 가볍고 척척이면 집중 블록 양을 조금 늘린다.
- 헷갈린 동작은 다시 넣어 익히게 하고, 어려운 동작은 레벨을 낮춘다.
- 엄마 메모(parentNote 입력)가 있으면 반영한다.
- availableMinutes 가 있으면(엄마가 고른 오늘 운동 시간) 웜업·쿨다운 포함 그 안에 끝나게 본운동을 줄인다. rulePlan.mainMaxMinutes 를 넘기지 않는다.
- 며칠 쉬고 왔으면 다시 온 것을 크게 반긴다(듀오링고처럼). 쉰 날 수를 세거나 아쉬워하지 않는다.

## 반드시 지킬 안전 규칙 (앱이 다시 검사하며, 어기면 그 항목은 버려진다)
- 아래 운동 풀에 있는 id 만 쓴다. places 에 맞는 장소의 동작만 쓴다.
- quietNight=true 면 '조용' 동작만 쓴다(아파트 야간).
- 강한착지 동작의 접촉 합(세트×횟수×접촉)은 세션당 60 이하. 어제 강한착지를 했거나 최근 7일 중 3일 했으면 강한착지 동작을 넣지 않는다.
- level 은 현재 레벨 ±1 안에서, sets 는 그 레벨 세트 수 ±1 안에서.
- levelChanges 의 delta 는 -1, 0, 1 만. 같은 동작 레벨업은 7일에 한 번.
- 통증·부상 언급이 있으면 그 부위를 쓰는 동작을 빼고 parentNote 에 코치·병원 확인을 권한다.

## 문구
- cheer: 아이에게 보이는 응원 한 줄(40자 이내). 누적된 노력만 칭찬한다. 빠진 날·못한 것을 탓하는 말은 절대 쓰지 않는다.
- focus: 이번 주 초점(40자 이내), note: 동작별 한 줄 팁(30자 이내, 없으면 빈 문자열).
- parentNote: 엄마에게만 보이는 설명(200자 이내).

## 요일 템플릿 (규칙 엔진 기준, 첫 칸이 집중 블록)
${weekLine}

## 운동 풀 (id | 이름 | 카테고리 | 방식 | 1급 과제 | 장소 | 착지 | 소음 | 레벨별 양)
${poolTable()}
`;

// ── 출력 스키마 ──────────────────────────────────────
const str = { type: 'string' };
export const COACH_SCHEMA = {
  type: 'object',
  properties: {
    forDate: str,
    mode: { type: 'string', enum: ['normal', 'recovery', 'progress', 'rest'] },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          exerciseId: str,
          level: { type: 'integer', enum: [1, 2, 3, 4, 5] },
          sets: { type: 'integer', enum: [1, 2, 3, 4, 5] },
          note: str,
        },
        required: ['exerciseId', 'level', 'sets', 'note'],
        additionalProperties: false,
      },
    },
    levelChanges: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          exerciseId: str,
          delta: { type: 'integer', enum: [-1, 0, 1] },
          reason: str,
        },
        required: ['exerciseId', 'delta', 'reason'],
        additionalProperties: false,
      },
    },
    focus: str,
    cheer: str,
    parentNote: str,
  },
  required: ['forDate', 'mode', 'items', 'levelChanges', 'focus', 'cheer', 'parentNote'],
  additionalProperties: false,
};

// ── 입력 요약 (이름·생년월일 등 개인정보 없음) ─────────
export function buildCoachInput({ forDate, places, quiet, history = [], progress, rulePlan, examDate, parentNote, availableMinutes = null }) {
  const from = addDays(forDate, -HISTORY_DAYS);
  const recentSessions = history
    .filter(s => s.date >= from && s.date < forDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(s => ({
      date: s.date,
      weekday: WEEKDAY_KO[weekday(s.date)],
      places: s.places ?? [],
      mode: s.mode ?? 'normal',
      status: s.status,
      minutes: Math.round((s.activeSec ?? 0) / 60),
      items: (s.planned ?? []).filter(p => p.block === 'main').map(p => {
        const r = s.results?.find(x => x.exerciseId === p.exerciseId);
        return { id: p.exerciseId, level: p.level ?? 1, setsDone: r?.setsDone ?? 0, setsPlanned: r?.setsPlanned ?? p.sets ?? 0 };
      }),
      rpe: s.evaluation?.rpe ?? null,
      difficulty: s.evaluation?.difficulty ?? null,
      journal: !!s.journalChecked,
    }));

  const input = {
    athlete: '초등 4학년 여자 선수, 피겨 1급(싱글) 승급 심사 준비 중',
    forDate,
    weekday: WEEKDAY_KO[weekday(forDate)],
    places,
    quietNight: !!quiet,
    recentSessions,
    levels: progress?.levels ?? {},
    easyStreak: progress?.easyStreak ?? {},
    repeatNext: progress?.repeatNext ?? [],
    ruleMode: rulePlan?.mode,
    rulePlan: {
      mode: rulePlan?.mode,
      slots: rulePlan?.slots ?? [],
      notes: rulePlan?.notes ?? [],
      items: (rulePlan?.items ?? []).filter(i => i.block === 'main')
        .map(i => ({ id: i.exerciseId, slot: i.slot, level: i.level, sets: i.sets })),
      mainMinutes: Math.round((rulePlan?.mainSec ?? 0) / 60),
      mainMaxMinutes: Math.floor((rulePlan?.mainRange?.[1] ?? 35 * 60) / 60),
      jumpContacts: rulePlan?.jumpContacts ?? 0,
    },
    availableMinutes,
    parentNote: [...String(parentNote ?? '')].slice(0, NOTE_MAX).join(''),
  };
  if (examDate) input.weeksToExam = Math.ceil(daysBetween(forDate, examDate) / 7);
  return input;
}

export function buildCoachRequest(input) {
  return {
    model: COACH_MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: COACH_SCHEMA } },
    system: [{ type: 'text', text: COACH_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `다음 운동을 정해 주세요. 입력(JSON):\n${JSON.stringify(input)}` }],
  };
}
