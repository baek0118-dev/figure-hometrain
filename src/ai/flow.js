// AI 다음 운동 추천 흐름 — 설계 §10.3·10.5.
// 평가 끝 → (온라인) 바로 요청 / (오프라인·일시 오류) 대기열 → 다음에 앱 열 때 처리.
// AI 답(원본)은 날짜별로 저장하고, 메뉴에서 쓸 때마다 그때의 장소·소음·기록으로 안전 검사(guard)를 다시 한다.

import { buildRulePlan } from '../domain/planner.js';
import { guardAiPlan } from '../domain/guard.js';
import { addDays, daysBetween } from '../domain/dates.js';
import { buildCoachInput, buildCoachRequest } from './coach.js';

const PLANS_KEY = 'ai.plans';
const KEEP_DAYS = 14;
const RETRY = new Set(['offline', 'rate', 'server']);

export function createCoachFlow({ ai, repo, local }) {
  const plans = () => local.get(PLANS_KEY, {});

  function save(forDate, data, sessionId) {
    const all = plans();
    for (const d of Object.keys(all)) if (daysBetween(d, forDate) > KEEP_DAYS) delete all[d];
    all[forDate] = { data, sessionId, at: Date.now() };
    local.set(PLANS_KEY, all);
  }

  // 요청은 처리할 때 최신 기록으로 만든다 (대기열엔 세션 id 만)
  function paramsFor(sessionId) {
    const session = repo.sessions().find(s => s.id === sessionId);
    if (!session) return null;
    const forDate = addDays(session.date, 1);
    const settings = repo.settings();
    const history = repo.sessions();
    const progress = repo.progress();
    const places = session.places ?? settings.places;
    const quiet = !!session.quiet;
    const rulePlan = buildRulePlan({ date: forDate, places, quiet, history, progress, settings });
    const input = buildCoachInput({
      forDate, places, quiet, history, progress, rulePlan,
      examDate: settings.examDate, parentNote: settings.parentNote,
    });
    return { forDate, restDay: !!rulePlan.fullRest, params: buildCoachRequest(input) };
  }

  async function afterSession(session) {
    const p = paramsFor(session.id);
    if (!p) return { status: 'failed', error: 'nosession' };
    if (p.restDay) return { status: 'restDay' }; // 다음 날이 일요일(완전 휴식) — 요청 안 함
    const r = await ai.call(p.params);
    if (r.ok) { save(p.forDate, r.data, session.id); return { status: 'saved', forDate: p.forDate }; }
    if (r.error === 'nokey') return { status: 'nokey' };
    if (RETRY.has(r.error)) { ai.enqueue({ kind: 'coach', id: session.id }); return { status: 'queued', error: r.error }; }
    return { status: 'failed', error: r.error };
  }

  async function drain() {
    await ai.drain(async (job, result) => {
      if (!result.ok) return;
      const p = paramsFor(job.id);
      if (p) save(p.forDate, result.data, job.id);
    }, job => paramsFor(job.id)?.params ?? {});
  }

  const saved = date => plans()[date] ?? null;

  // 메뉴용: 저장된 AI 답 → 지금 조건으로 안전 검사 → 통과하면 플랜, 아니면 null(규칙 추천)
  function planFor(ctx) {
    const s = saved(ctx.date);
    if (!s) return null;
    const g = guardAiPlan(s.data, ctx);
    if (g.rejected) return null;
    g.plan.aiFixes = g.fixes;
    return g.plan;
  }

  return { afterSession, drain, saved, planFor };
}
