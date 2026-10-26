// 동작별 참고 영상 정답 구간 — 설계 docs/specs/2026-10-12-reference-video-design.md
// 영상은 유튜브 공식 퍼가기(임베드)로만 재생하고 내려받지 않는다(저작권). 주소만 둔다.
// 구간은 review/videos.html 에서 고르고 사용자가 그대로 쓰기로 함(2026-10-12). 바꿀 때는 두 곳을 같이.
// 일부러 영상이 없는 동작: T01·T02(찾은 영상이 높이 뛰는 경기용), C17(걷기 안내로 충분).

export const REFERENCE_VIDEOS = {
  "J03": {"videoId":"Hjo34BmmfSw","start":4,"end":14,"channel":"THINICE","angle":"앞~비스듬히"},
  "J05": {"videoId":"7IIszGrkCfc","start":856,"end":869,"channel":"Coach Michelle Hong","angle":"정면","note":"반시계 회전 확인. 쓰리턴·착지 발은 화질 때문에 확정 못 함 — 봐 주세요. 대안: 870~882초(두 번째 반복)"},
  "J06": {"videoId":"12_XGhGavl0","start":540,"end":553,"channel":"Coach Michelle Hong","angle":"정면","note":"반시계 회전 확인. 찍는 발(왼발)·착지 발(오른발)은 봐 주세요. 대안: 530~540초"},
  "J04": {"videoId":"Vq26ypExJ38","start":398,"end":412,"channel":"Coach Michelle Hong","angle":"정면","note":"반시계 회전 확인(흐린 장면 섞임). 같은 영상 앞쪽에 ¼·½ 회전 단원도 있음"},
  "B02": {"videoId":"LGnGmKclurE","start":296,"end":311,"channel":"Coach Mary Figure Skating","angle":"정면","note":"5:12부터는 반대 다리 + \"하지 마세요\" 장면이라 끝을 넘기지 마세요. 빙상 버전: N4XAODmiQpE 17~33초"},
  "J01": {"videoId":"kTDzCdldXpE","start":68,"end":84,"channel":"Coach Michelle Hong","angle":"옆"},
  "S05": {"videoId":"h13-akwR2lU","start":185,"end":205,"channel":"Coach Michelle Hong","angle":"정면"},
  "S07": {"videoId":"OHe0rpyKPEE","start":344,"end":358,"channel":"Coach Julia","angle":"정면"},
  "S08": {"videoId":"_04F32rTbyI","start":302,"end":318,"channel":"Coach Mary Figure Skating","angle":"정면","note":"화면 제목은 백스핀 연습(반시계로 보임). 멈춤은 1.5~2초라 앱의 3초보다 짧아요"},
  "S09": {"videoId":"2qbo0xl0CEI","start":9,"end":15,"channel":"(체조 영상)","angle":"정면","note":"참고용: 아이가 평균대 위에서 하고, 팔이 허리에 있어요(앱은 팔을 가슴 앞). 맞는 영상을 못 찾아 차선으로 넣었어요"},
  "S01": {"videoId":"pvIjsG5Svck","start":32,"end":46,"channel":"Children's Hospital Colorado","angle":"옆"},
  "S02": {"videoId":"N_s9em1xTqU","start":6,"end":22,"channel":"Children's Hospital Colorado","angle":"정면"},
  "S03": {"videoId":"LlDNef_Ztsc","start":114,"end":126,"channel":"GMB Fitness","angle":"옆","note":"쉬운 단계(무릎 굽힘)는 30~46초, 팔 머리 위 완성형은 134~142초"},
  "S04": {"videoId":"g_BYB0R-4Ws","start":14,"end":32,"channel":"Children's Hospital Colorado","angle":"옆"},
  "S06": {"videoId":"J9zXkxUAfUA","start":4,"end":22,"channel":"Children's Hospital Colorado","angle":"옆"},
  "B01": {"videoId":"4HtOeds_vyw","start":5,"end":21,"channel":"RunDNA","angle":"정면"},
  "B03": {"videoId":"d2eAoppqd0g","start":85,"end":101,"channel":"(오프아이스 영상)","angle":"정면","note":"디딤발과 회전 방향은 확인 못 했어요. 처음 후보(Shelly Skates 10:25~)는 허리 아래만 나와서 뺐어요"},
  "B04": {"videoId":"u0Hl32ndJS4","start":10,"end":22,"channel":"Sports Rehab Expert","angle":"옆","note":"세로 영상, 화면 글자가 많아요. 24초부터는 아령을 써요"},
  "B05": {"videoId":"qPd73snQfUs","start":5,"end":21,"channel":"HSS(병원)","angle":"옆"},
  "F01": {"videoId":"ELHdR9nqZiY","start":1147,"end":1155,"channel":"Rachel Liza(피겨 선수)","angle":"옆","note":"1155초부터는 다리를 머리 위까지 올려요. 따라 하지 않게 끝을 넘기지 마세요"},
  "F02": {"videoId":"STdqKHz-IC4","start":648,"end":664,"channel":"Coach Julia","angle":"앞쪽 비스듬히"},
  "F03": {"videoId":"Z816IGgrfxc","start":3,"end":20,"channel":"Live Lean TV","angle":"정면","note":"9~12초는 자세를 다시 잡는 장면. 쿨다운 C13 과 같은 영상"},
  "F04": {"videoId":"_leI4qFfPVw","start":44,"end":62,"channel":"Children's Hospital Colorado","angle":"옆","note":"브릿지 대신 바꾸기로 한 동작"},
  "F05": {"videoId":"F55tzqJggAY","start":27,"end":45,"channel":"B3 Physical Therapy","angle":"옆"},
  "F07": {"videoId":"7Zdi41ng4Kk","start":3,"end":17,"channel":"Benjamin Boudro","angle":"앞쪽 비스듬히","note":"뒷무릎을 바닥에 대는 버전이에요. 서서 하는 버전은 쿨다운 C14"},
  "J02": {"videoId":"W0nK_eBArXM","start":1,"end":15,"channel":"(물리치료 채널)","angle":"정면"},
  "J07": {"videoId":"aQoN8rYQyPg","start":18,"end":36,"channel":"Cincinnati Children's","angle":"정면 비스듬히","note":"화면에 2명이 나와요"},
  "J08": {"videoId":"Vq26ypExJ38","start":258,"end":278,"channel":"Coach Michelle Hong","angle":"정면","note":"까치발로 도는 영상을 못 찾아 반 바퀴 \"점프\"로 대신했어요"},
  "P01": {"videoId":"tIbyM9pUrmg","start":10,"end":20,"channel":"창근쌤TV","angle":"정면","note":"한국어. 화면이 둘로 나뉘어 있어요"},
  "P02": {"videoId":"nn63bBkufZk","start":17,"end":33,"channel":"점프스쿨","angle":"정면","note":"한국어"},
  "T03": {"videoId":"jm1PuVQAYsU","start":21,"end":39,"channel":"PE Bowman","angle":"정면"},
  "W01": {"videoId":"9wl_AiNhYP0","start":1,"end":18,"channel":"Rehab My Patient","angle":"정면"},
  "W02": {"videoId":"oAh8UMWvmhA","start":424,"end":442,"channel":"Little Sports","angle":"정면","note":"애니메이션 캐릭터 영상"},
  "W03": {"videoId":"9WijvBkWGEo","start":4,"end":23,"channel":"Fit For Keeps","angle":"정면"},
  "W04": {"videoId":"RI4BJd1oKCI","start":12,"end":28,"channel":"Your House Fitness","angle":"정면","note":"무릎 돌리기는 빼기로 함. 벽 짚은 버전은 31~48초"},
  "W05": {"videoId":"difYoBtZi2s","start":5,"end":23,"channel":"PureGym","angle":"옆"},
  "W06": {"videoId":"6U5Kynp1ZEo","start":5,"end":20,"channel":"St. Luke's PT","angle":"정면","note":"카메라가 따라 움직여요"},
  "C01": {"videoId":"Z90dYYMrZz4","start":126,"end":146,"channel":"Joyce Anue Yoga","angle":"옆"},
  "C02": {"videoId":"3qaWELilyL8","start":43,"end":62,"channel":"Hy-Vee KidsFit","angle":"정면","note":"아이 시범"},
  "C03": {"videoId":"lRFbAvGGoAs","start":6,"end":24,"channel":"OrthoIndy","angle":"옆"},
  "C04": {"videoId":"uEu1IbGIOKM","start":44,"end":64,"channel":"Therapeutic EDGE","angle":"옆 비스듬히","note":"끈으로 당기는 버전(손으로 잡아도 돼요)"},
  "C05": {"videoId":"Z90dYYMrZz4","start":246,"end":266,"channel":"Joyce Anue Yoga","angle":"비스듬히","note":"사람이 작게 보여요"},
  "C06": {"videoId":"LugNxxfIdvo","start":5,"end":24,"channel":"Baptist Health","angle":"옆"},
  "C07": {"videoId":"6YB0pv3iv0g","start":1,"end":22,"channel":"Rehab My Patient","angle":"옆"},
  "C11": {"videoId":"mafo7o7OnFo","start":2,"end":21,"channel":"HSS(병원)","angle":"옆"},
  "C12": {"videoId":"UZ-GSxmr2zs","start":9,"end":21,"channel":"HealthFit PT","angle":"옆 비스듬히"},
  "C13": {"videoId":"Z816IGgrfxc","start":11,"end":20,"channel":"Live Lean TV","angle":"정면","note":"서서 하는 피겨 선수 버전: ELHdR9nqZiY 98~118초"},
  "C14": {"videoId":"sHvur2PUEvg","start":11,"end":29,"channel":"BSR PT","angle":"옆"},
  "C15": {"videoId":"q1QZ3h8HVtw","start":2,"end":20,"channel":"Live Lean TV","angle":"정면"},
  "C16": {"videoId":"FCbkw3M9LrI","start":0,"end":9,"channel":"Dom The Fitness Dietitian","angle":"정면","note":"9초짜리 짧은 영상"},
  "S10": {"videoId":"t-lKmdFLGLA","start":303,"end":320,"channel":"Coach Julia","angle":"정면","note":"스피너 위 자세. 중간에 두 발로 서는 순간이 섞임"},
  "S11": {"videoId":"t-lKmdFLGLA","start":333,"end":350,"channel":"Coach Julia","angle":"정면","note":"반시계 회전 확인. 같은 영상 3:55 근처에도 회전 장면"},
};

// 아직 exercises.js 에 없는 동작의 구간을 보관하는 곳 — 동작이 들어오면 그 id 로 REFERENCE_VIDEOS 로 옮긴다.
// (2026-10-12 새 동작 S10·S11 은 옮김)
export const PENDING_VIDEOS = {};

const embedUrl = v => `https://www.youtube-nocookie.com/embed/${v.videoId}?${new URLSearchParams({ start: v.start, end: v.end, rel: 0, playsinline: 1, modestbranding: 1 })}`;

// 동작 id → { videoId, start, end, channel, angle, note?, embedUrl, watchUrl } 또는 null
export function referenceVideo(exId) {
  const v = REFERENCE_VIDEOS[exId];
  if (!v) return null;
  return { ...v, embedUrl: embedUrl(v), watchUrl: `https://www.youtube.com/watch?v=${v.videoId}&t=${v.start}s` };
}
