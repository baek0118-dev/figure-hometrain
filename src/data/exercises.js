// 운동 마스터 — 설계 §2.1. 내용(동작·체크포인트·레벨)은 코치 검수 대상(Q5).
// impact = 높이·회전 있는 강한 착지(접촉 수 셈). quiet = 아파트 야간에 해도 되는 소음.
// 체크포인트는 한 줄 18자 이내 (2m 거리 가독).

const L = (sets, workSec, restSec) => ({ sets, workSec, restSec });
const R = (sets, reps, restSec) => ({ sets, reps, restSec });
const JUMPS = ['waltz', 'salchow', 'toeloop'];
const ALL = ['home', 'park', 'playground'];
const OUT = ['park', 'playground'];
const FLEX_CAUTION = '반동 금지, 통증이 있으면 바로 멈추기';
// 트램펄린: 어른이 지켜볼 때·한 명씩 (AAP 권고, 훈련 내용 검토 §3)
const TRAMP_CAUTION = '어른이 볼 때만, 한 명씩, 낮게, 공중돌기 금지';

function ex(o) {
  return { elements: [], perSide: false, impact: false, quiet: true, equipment: ['none'], places: ALL, ...o };
}

const WARMUPS = [
  ex({ id: 'W01', name: '제자리 무릎 올려 걷기', category: 'warmup', mode: 'timed', poseId: 'march',
    checkpoints: ['무릎을 배꼽 높이로', '팔은 크게 앞뒤로', '발은 사뿐사뿐'], levels: [L(1, 60, 0)] }),
  ex({ id: 'W02', name: '팔 크게 돌리기', category: 'warmup', mode: 'timed', poseId: 'armCircle',
    checkpoints: ['어깨부터 크게 원', '앞으로 돌고 뒤로 돌고', '허리는 곧게'], levels: [L(1, 40, 0)] }),
  ex({ id: 'W03', name: '고관절 돌리기', category: 'warmup', mode: 'timed', poseId: 'hipCircle',
    checkpoints: ['손은 허리에', '골반으로 큰 원 그리기', '양쪽 방향 번갈아'], levels: [L(1, 40, 0)] }),
  ex({ id: 'W04', name: '발목 돌리기', category: 'warmup', mode: 'timed', poseId: 'ankleCircle',
    checkpoints: ['발끝을 바닥에 대고', '발목을 천천히 돌리기', '안쪽·바깥쪽 번갈아'], levels: [L(1, 40, 0)] }),
  ex({ id: 'W05', name: '레그 스윙 앞뒤', category: 'warmup', mode: 'timed', perSide: true, poseId: 'legSwing',
    checkpoints: ['벽이나 의자 잡기', '다리를 앞뒤로 크게', '상체는 흔들리지 않게'], levels: [L(1, 30, 0)] }),
  ex({ id: 'W06', name: '사이드 스텝', category: 'warmup', mode: 'timed', poseId: 'sideStep',
    checkpoints: ['무릎 살짝 굽히고', '옆으로 두 걸음씩', '발이 부딪히지 않게'], levels: [L(1, 60, 0)] }),
];

const COOLDOWNS_HOME = [
  ex({ id: 'C01', name: '고양이-낙타', category: 'cooldown', mode: 'timed', equipment: ['mat'], places: ['home'], poseId: 'catCow',
    checkpoints: ['네 발 자세로 시작', '등을 둥글게, 오목하게', '숨에 맞춰 천천히'], caution: FLEX_CAUTION, levels: [L(1, 60, 0)] }),
  ex({ id: 'C02', name: '나비 자세', category: 'cooldown', mode: 'hold', equipment: ['mat'], places: ['home'], poseId: 'butterfly',
    checkpoints: ['발바닥끼리 붙이기', '허리 곧게 세우기', '무릎은 힘 빼고 아래로'], caution: FLEX_CAUTION, levels: [L(2, 30, 5)] }),
  ex({ id: 'C03', name: '앉아서 앞으로 숙이기', category: 'cooldown', mode: 'hold', equipment: ['mat'], places: ['home'], poseId: 'seatedFold',
    checkpoints: ['다리 쭉 펴고 앉기', '배부터 다리 쪽으로', '숨 내쉬며 조금씩'], caution: FLEX_CAUTION, levels: [L(2, 30, 5)] }),
  ex({ id: 'C04', name: '엎드려 허벅지 앞 늘이기', category: 'cooldown', mode: 'hold', perSide: true, equipment: ['mat'], places: ['home'], poseId: 'sideQuad',
    checkpoints: ['엎드려 한 발목 잡기', '무릎끼리 나란히', '골반은 바닥에 꾹'], caution: FLEX_CAUTION, levels: [L(2, 25, 5)] }),
  ex({ id: 'C05', name: '아기 자세', category: 'cooldown', mode: 'hold', equipment: ['mat'], places: ['home'], poseId: 'childPose',
    checkpoints: ['엉덩이를 발뒤꿈치로', '팔은 앞으로 길게', '이마는 바닥에 편하게'], caution: FLEX_CAUTION, levels: [L(2, 30, 5)] }),
  ex({ id: 'C06', name: '무릎 감싸 안기', category: 'cooldown', mode: 'hold', equipment: ['mat'], places: ['home'], poseId: 'kneeHug',
    checkpoints: ['누워서 무릎 껴안기', '허리를 바닥에 대기', '좌우로 살살 흔들기'], caution: FLEX_CAUTION, levels: [L(2, 30, 5)] }),
  ex({ id: 'C07', name: '누워서 심호흡', category: 'cooldown', mode: 'timed', equipment: ['mat'], places: ['home'], poseId: 'breathe',
    checkpoints: ['코로 4초 들이쉬기', '입으로 6초 내쉬기', '오늘도 잘했어!'], levels: [L(1, 60, 0)] }),
];

const COOLDOWNS_STANDING = [
  ex({ id: 'C11', name: '서서 종아리 늘이기', category: 'cooldown', mode: 'hold', perSide: true, poseId: 'calfStretch',
    checkpoints: ['뒷발 뒤꿈치 바닥에', '앞무릎 굽혀 기대기', '뒷무릎은 쭉 펴기'], caution: FLEX_CAUTION, levels: [L(1, 30, 0)] }),
  ex({ id: 'C12', name: '서서 허벅지 앞 잡기', category: 'cooldown', mode: 'hold', perSide: true, poseId: 'standQuad',
    checkpoints: ['한 손은 벤치 잡기', '발목 잡아 엉덩이로', '무릎끼리 나란히'], caution: FLEX_CAUTION, levels: [L(1, 30, 0)] }),
  ex({ id: 'C13', name: '다리 벌려 숙이기', category: 'cooldown', mode: 'hold', poseId: 'wideFold',
    checkpoints: ['다리를 넓게 벌리기', '등 곧게 앞으로 숙이기', '손은 땅 쪽으로'], caution: FLEX_CAUTION, levels: [L(2, 30, 5)] }),
  ex({ id: 'C14', name: '벤치에 발 올려 햄스트링', category: 'cooldown', mode: 'hold', perSide: true, poseId: 'benchHam',
    checkpoints: ['발을 벤치에 올리기', '무릎 펴고 등 곧게', '배꼽을 다리 쪽으로'], caution: FLEX_CAUTION, levels: [L(2, 25, 5)] }),
  ex({ id: 'C15', name: '어깨 늘이기', category: 'cooldown', mode: 'hold', perSide: true, poseId: 'shoulderStretch',
    checkpoints: ['팔을 가슴 앞으로', '반대 팔로 감싸 당기기', '어깨는 내리고'], caution: FLEX_CAUTION, levels: [L(1, 30, 0)] }),
  ex({ id: 'C16', name: '서서 옆구리 늘이기', category: 'cooldown', mode: 'hold', perSide: true, poseId: 'sideBend',
    checkpoints: ['팔을 위로 쭉', '옆으로 천천히 기울기', '골반은 제자리'], caution: FLEX_CAUTION, levels: [L(1, 30, 0)] }),
  ex({ id: 'C17', name: '걸으며 심호흡', category: 'cooldown', mode: 'timed', poseId: 'walkBreathe',
    checkpoints: ['천천히 걸으면서', '코로 들이쉬고 입으로', '오늘도 잘했어!'], levels: [L(1, 60, 0)] }),
];

const JUMP = [
  ex({ id: 'J01', name: '스쿼트 점프', category: 'jump', elements: JUMPS, mode: 'reps', impact: true, contactsPerRep: 1, quiet: false,
    places: ['home', 'park'], poseId: 'squatJump', secPerRep: 3,
    checkpoints: ['무릎은 발끝 방향으로', '팔을 휘둘러 높이', '무릎 굽혀 사뿐히 착지'], caution: '무릎이 안쪽으로 모이면 멈추기',
    levels: [R(2, 6, 40), R(3, 6, 40), R(3, 8, 45), R(3, 10, 45), R(4, 10, 45)] }),
  ex({ id: 'J02', name: '가볍게 리듬 콩콩', category: 'jump', elements: JUMPS, mode: 'timed', quiet: false,
    places: ['home', 'park'], poseId: 'pogo',
    checkpoints: ['발끝으로 가볍게', '무릎은 살짝만 굽힘', '일정한 리듬으로'],
    levels: [L(2, 20, 30), L(3, 20, 30), L(3, 30, 30), L(4, 30, 30), L(4, 40, 30)] }),
  ex({ id: 'J03', name: '오프아이스 왈츠 점프', category: 'jump', elements: ['waltz'], mode: 'reps', impact: true, contactsPerRep: 1, quiet: false,
    places: ['home', 'park'], poseId: 'waltzJump', secPerRep: 5,
    checkpoints: ['왼발 앞으로 디디며 출발', '반 바퀴 돌아 오른발 착지', '착지 후 왼다리 뒤로 쭉'], caution: '주변 1m 비우기, 미끄러운 양말 금지',
    levels: [R(2, 5, 40), R(3, 5, 40), R(3, 6, 45), R(3, 8, 45), R(4, 8, 45)] }),
  ex({ id: 'J04', name: '오프아이스 1회전 점프', category: 'jump', elements: ['salchow', 'toeloop'], mode: 'reps', impact: true, contactsPerRep: 1, quiet: false,
    places: ['home', 'park'], poseId: 'singleTurnJump', secPerRep: 5,
    checkpoints: ['팔은 가슴 앞으로 당기기', '정수리가 축, 몸 곧게', '두 발로 조용히 착지'], caution: '어지러우면 바로 쉬기, 주변 1m 비우기',
    levels: [R(2, 4, 45), R(3, 4, 45), R(3, 5, 45), R(3, 6, 50), R(4, 6, 50)] }),
  ex({ id: 'J05', name: '살코 진입 연습', category: 'jump', elements: ['salchow', 'threeturn'], mode: 'reps', impact: true, contactsPerRep: 1, quiet: false,
    places: ['home', 'park'], poseId: 'salchowEntry', secPerRep: 6,
    checkpoints: ['왼발로 쓰리턴', '오른다리 뒤에서 앞으로', '돌아서 오른발로 착지'], caution: '주변 1m 비우기, 미끄러운 양말 금지',
    levels: [R(2, 4, 45), R(3, 4, 45), R(3, 5, 45), R(3, 6, 50), R(4, 6, 50)] }),
  ex({ id: 'J06', name: '토룹 진입 연습', category: 'jump', elements: ['toeloop'], mode: 'reps', impact: true, contactsPerRep: 1, quiet: false,
    places: ['home', 'park'], poseId: 'toeloopEntry', secPerRep: 6,
    checkpoints: ['오른발 뒤로 미끄러지듯', '왼발 끝으로 찍고 출발', '돌아서 오른발로 착지'], caution: '주변 1m 비우기, 미끄러운 양말 금지',
    levels: [R(2, 4, 45), R(3, 4, 45), R(3, 5, 45), R(3, 6, 50), R(4, 6, 50)] }),
  ex({ id: 'J07', name: '스쿼트 까치발 올리기', category: 'jump', elements: JUMPS, mode: 'reps', poseId: 'squatRise', secPerRep: 3,
    checkpoints: ['엉덩이 뒤로 앉기', '일어나며 까치발', '뒤꿈치는 천천히'],
    levels: [R(2, 8, 30), R(3, 8, 30), R(3, 10, 30), R(3, 12, 30), R(4, 12, 30)] }),
  ex({ id: 'J08', name: '까치발 반 바퀴 턴', category: 'jump', elements: JUMPS, mode: 'reps', poseId: 'halfTurn', secPerRep: 4,
    checkpoints: ['팔 벌려 준비', '팔 당기며 반 바퀴', '멈추고 착지 자세'], caution: '어지러우면 바로 쉬기',
    levels: [R(2, 6, 30), R(3, 6, 30), R(3, 8, 30), R(3, 10, 30), R(4, 10, 30)] }),
  ex({ id: 'P01', name: '줄넘기 양발 리듬', category: 'jump', elements: JUMPS, mode: 'timed', quiet: false,
    equipment: ['rope'], places: OUT, poseId: 'ropeBoth',
    checkpoints: ['손목으로 줄 돌리기', '발끝으로 가볍게', '시선은 앞으로'], caution: '잔디·우레탄 바닥에서',
    levels: [L(2, 30, 30), L(3, 30, 30), L(3, 45, 30), L(3, 60, 30), L(4, 60, 30)] }),
  ex({ id: 'P02', name: '줄넘기 한 발씩 번갈아', category: 'jump', elements: JUMPS, mode: 'timed', quiet: false,
    equipment: ['rope'], places: OUT, poseId: 'ropeAlt',
    checkpoints: ['발을 번갈아 콩콩', '무릎 너무 들지 않기', '리듬 일정하게'], caution: '잔디·우레탄 바닥에서',
    levels: [L(2, 20, 30), L(3, 20, 30), L(3, 30, 30), L(3, 40, 30), L(4, 40, 30)] }),
  ex({ id: 'T01', name: '방방 반 바퀴 점프', category: 'jump', elements: ['waltz'], mode: 'reps', impact: true, contactsPerRep: 1,
    equipment: ['trampoline'], places: ['playground'], poseId: 'trampHalf', secPerRep: 5,
    checkpoints: ['낮게 두세 번 튀고 출발', '반 바퀴 돌아 두 발 착지', '착지하면 무릎 굽혀 멈춤'],
    caution: TRAMP_CAUTION,
    levels: [R(2, 4, 40), R(3, 4, 40), R(3, 5, 40), R(3, 6, 45), R(3, 8, 45)] }),
  ex({ id: 'T02', name: '방방 한 바퀴 점프', category: 'jump', elements: ['salchow', 'toeloop'], mode: 'reps', impact: true, contactsPerRep: 1,
    equipment: ['trampoline'], places: ['playground'], poseId: 'trampFull', secPerRep: 6,
    checkpoints: ['팔을 가슴 앞으로 당기기', '몸은 곧은 막대처럼', '두 발 착지 후 자세'],
    caution: TRAMP_CAUTION,
    levels: [R(2, 3, 45), R(3, 3, 45), R(3, 4, 45), R(3, 5, 45), R(3, 6, 45)] }),
  // ── 새 동작(훈련 내용 검토 §2.1, 2026-10-12 승인): 1급 필수 싱글+싱글 콤비·프로그램 체력 ──
  // 그림은 우선 토룹 진입(toeloopEntry)을 빌려 씀. 점프 두 번 = 착지 두 번(contactsPerRep 2).
  ex({ id: 'J09', name: '착지 멈춤 → 토룹 (콤비 1)', category: 'jump', elements: ['waltz', 'salchow', 'toeloop'], mode: 'reps', impact: true, contactsPerRep: 2, quiet: false,
    places: ['home', 'park'], poseId: 'toeloopEntry', secPerRep: 8,
    checkpoints: ['오른발 착지 1초 멈춤', '왼발 토 뒤로 찍기', '토룹 반~한 바퀴'], caution: '주변 1m 비우기, 미끄러운 양말 금지',
    levels: [R(2, 3, 45), R(3, 3, 45), R(3, 4, 45), R(3, 5, 50), R(4, 5, 50)] }),
  ex({ id: 'J10', name: '이어 뛰기 콤비 (콤비 2)', category: 'jump', elements: ['waltz', 'salchow', 'toeloop'], mode: 'reps', impact: true, contactsPerRep: 2, quiet: false,
    places: ['home', 'park'], poseId: 'toeloopEntry', secPerRep: 8,
    checkpoints: ['착지-쭉-콕-점프', '프리 다리 돌려 찍기', '두 번째는 서두르지 않기'], caution: '콤비 1이 익숙해진 뒤에, 주변 1m 비우기',
    levels: [R(2, 2, 50), R(2, 3, 50), R(3, 3, 50), R(3, 4, 50), R(4, 4, 50)] }),
  ex({ id: 'J11', name: '프로그램 흉내 런스루', category: 'jump', elements: ['waltz', 'salchow', 'toeloop', 'upright'], mode: 'timed', quiet: false,
    places: ['home', 'park'], poseId: 'waltzJump',
    checkpoints: ['1분 30초 요소 순서대로', '점프는 지상 버전으로', '스핀은 자세만 잡기'], caution: '주변 2m 비우기, 힘들면 걸어서',
    levels: [L(1, 90, 60), L(1, 90, 60), L(2, 90, 90), L(2, 90, 90), L(2, 90, 90)] }),
];

const SPIN = [
  ex({ id: 'S01', name: '플랭크', category: 'spin', elements: ['upright'], mode: 'hold', equipment: ['mat'], places: ['home'], poseId: 'plank',
    checkpoints: ['머리부터 발끝까지 일자', '배꼽을 등 쪽으로', '숨 참지 않기'],
    levels: [L(3, 20, 30), L(3, 25, 30), L(3, 30, 30), L(4, 30, 30), L(4, 40, 30)] }),
  ex({ id: 'S02', name: '사이드 플랭크', category: 'spin', elements: ['upright'], mode: 'hold', perSide: true, equipment: ['mat'], places: ['home'], poseId: 'sidePlank',
    checkpoints: ['팔꿈치는 어깨 바로 아래', '골반을 높이 들기', '몸이 일자로 길게'],
    levels: [L(2, 15, 20), L(3, 15, 20), L(3, 20, 20), L(3, 25, 20), L(3, 30, 20)] }),
  ex({ id: 'S03', name: '할로우 홀드(바나나)', category: 'spin', elements: ['upright'], mode: 'hold', equipment: ['mat'], places: ['home'], poseId: 'hollow',
    checkpoints: ['허리를 바닥에 붙이기', '팔다리 길게 뻗기', '힘들면 무릎 굽혀도 OK'],
    levels: [L(2, 15, 25), L(3, 15, 25), L(3, 20, 25), L(3, 25, 25), L(4, 25, 25)] }),
  ex({ id: 'S04', name: '데드버그', category: 'spin', elements: ['upright'], mode: 'reps', equipment: ['mat'], places: ['home'], poseId: 'deadBug', secPerRep: 3,
    checkpoints: ['허리 바닥에 꾹', '반대 팔다리 함께 뻗기', '천천히 숨 내쉬며'],
    levels: [R(2, 8, 30), R(3, 8, 30), R(3, 10, 30), R(3, 12, 30), R(4, 12, 30)] }),
  ex({ id: 'S05', name: '업라이트 스핀 축 자세', category: 'spin', elements: ['upright'], mode: 'hold', perSide: true, poseId: 'spinAxis',
    checkpoints: ['배꼽을 등 쪽으로 당기기', '프리 발은 무릎 옆에', '정수리부터 위로 쭉'],
    levels: [L(2, 15, 20), L(3, 15, 20), L(3, 20, 20), L(3, 25, 20), L(4, 25, 20)] }),
  ex({ id: 'S06', name: '슈퍼맨', category: 'spin', elements: ['upright', 'spiral'], mode: 'hold', equipment: ['mat'], places: ['home'], poseId: 'superman',
    checkpoints: ['팔다리를 동시에 들기', '시선은 바닥', '목에 힘 빼기'], caution: '허리는 조금만 젖히기, 아프면 멈추기',
    levels: [L(2, 15, 25), L(3, 15, 25), L(3, 20, 25), L(4, 20, 25), L(5, 20, 25)] }),
  ex({ id: 'S07', name: '스핀 패드 업라이트 회전', category: 'spin', elements: ['upright'], mode: 'reps',
    equipment: ['spinpad'], places: ['home'], poseId: 'spinpadSpin', secPerRep: 6,
    checkpoints: ['팔 모으면 빨라져요', '정수리 위로 곧게', '멈출 때 랜딩 자세'],
    caution: '매트 위 금지, 딱딱한 바닥에서. 주변 1m 비우기, 어지러우면 앉기',
    levels: [R(2, 5, 30), R(3, 5, 30), R(3, 6, 30), R(3, 8, 30), R(3, 10, 30)] }),
  ex({ id: 'S08', name: '스핀 패드 출발 → 멈춤 3초', category: 'spin', elements: ['upright', 'threeturn'], mode: 'reps',
    equipment: ['spinpad'], places: ['home'], poseId: 'spinpadStop', secPerRep: 8,
    checkpoints: ['팔 벌려 준비 자세', '한 번에 힘 있게 출발', '멈추고 3초 버티기'],
    caution: '매트 위 금지, 딱딱한 바닥에서. 주변 1m 비우기, 어지러우면 앉기',
    levels: [R(2, 4, 30), R(3, 4, 30), R(3, 5, 30), R(3, 6, 30), R(4, 6, 30)] }),
  ex({ id: 'S09', name: '까치발 축 홀드', category: 'spin', elements: ['upright'], mode: 'hold', poseId: 'releveAxis',
    checkpoints: ['두 발 까치발로 서기', '팔은 가슴 앞에 모으기', '몸통을 단단하게'],
    levels: [L(2, 15, 20), L(3, 15, 20), L(3, 20, 20), L(3, 25, 20), L(4, 25, 20)] }),
  ex({ id: 'T03', name: '방방 위 축 세우기', category: 'spin', elements: ['upright'], mode: 'reps', impact: true, contactsPerRep: 1,
    equipment: ['trampoline'], places: ['playground'], poseId: 'trampSpin', secPerRep: 6,
    checkpoints: ['작게 튀며 균형 잡기', '팔 모으며 한 바퀴', '정수리 위로 곧게'],
    caution: TRAMP_CAUTION,
    levels: [R(2, 4, 30), R(3, 4, 30), R(3, 5, 30), R(3, 6, 30), R(3, 8, 30)] }),
];

// 새 동작: 1급 필수 백워드 업라이트 스핀(오른발 축, 3회전 이상). 그림 spinAxis 는 오른발로 서는 모양이라 그대로 씀.
SPIN.push(
  ex({ id: 'S10', name: '백스핀 자세 버티기', category: 'spin', elements: ['upright'], mode: 'hold', poseId: 'spinAxis',
    checkpoints: ['오른발 앞꿈치로 서기', '왼발은 오른 정강이 앞', '상체는 앞쪽에 두기'],
    levels: [L(2, 10, 20), L(3, 10, 20), L(3, 15, 20), L(3, 20, 20), L(4, 20, 20)] }),
  ex({ id: 'S11', name: '스핀 패드 백스핀', category: 'spin', elements: ['upright'], mode: 'reps',
    equipment: ['spinpad'], places: ['home'], poseId: 'spinpadSpin', secPerRep: 6,
    checkpoints: ['오른발을 패드에', '반 바퀴부터 한 바퀴씩', '뒤로 기울지 않기'],
    caution: '매트 위 금지, 딱딱한 바닥에서. 주변 1m 비우기, 어지러우면 앉기',
    levels: [R(2, 3, 30), R(3, 3, 30), R(3, 4, 30), R(3, 5, 30), R(3, 6, 30)] }),
);

const BALANCE = [
  ex({ id: 'B01', name: '한발 서기', category: 'balance', elements: ['threeturn'], mode: 'hold', perSide: true, poseId: 'singleLeg',
    checkpoints: ['서 있는 무릎 살짝 펴기', '골반 수평 유지', '시선은 한 점에'], caution: 'Lv4 부터는 눈 감고 (넘어질 곳 없게)',
    levels: [L(2, 20, 15), L(3, 20, 15), L(3, 30, 15), L(3, 40, 15), L(3, 45, 15)] }),
  ex({ id: 'B02', name: '랜딩 포지션 홀드', category: 'balance', elements: JUMPS, mode: 'hold', poseId: 'landing',
    checkpoints: ['오른발 무릎 살짝 굽힘', '왼다리 뒤로 길게 뻗기', '팔 펴서 회전 멈추기'],
    levels: [L(2, 10, 20), L(3, 10, 20), L(3, 15, 20), L(3, 20, 20), L(4, 20, 20)] }),
  ex({ id: 'B03', name: '오프아이스 쓰리턴', category: 'balance', elements: ['threeturn'], mode: 'reps', perSide: true, poseId: 'threeTurn', secPerRep: 4,
    places: ['home', 'park'],
    checkpoints: ['무릎 굽혀 준비', '어깨 먼저 돌리고 턴', '턴 후 자세 멈추기'],
    levels: [R(2, 6, 30), R(3, 6, 30), R(3, 8, 30), R(3, 10, 30), R(4, 10, 30)] }),
  ex({ id: 'B04', name: '한발 데드리프트', category: 'balance', elements: ['spiral'], mode: 'reps', perSide: true, poseId: 'singleLegRdl', secPerRep: 4,
    checkpoints: ['등은 곧게 일자로', '뒷다리와 몸이 한 줄', '천천히 내려가기'],
    levels: [R(2, 6, 30), R(3, 6, 30), R(3, 8, 30), R(3, 10, 30), R(4, 10, 30)] }),
  ex({ id: 'B05', name: '한발 까치발 들기', category: 'balance', elements: JUMPS, mode: 'reps', perSide: true, poseId: 'calfRaise', secPerRep: 2,
    checkpoints: ['발목 흔들리지 않게', '끝까지 높이 올라가기', '천천히 내려오기'],
    levels: [R(2, 10, 30), R(3, 10, 30), R(3, 12, 30), R(3, 15, 30), R(4, 15, 30)] }),
];

const FLEX = [
  ex({ id: 'F01', name: '스파이럴 자세 홀드', category: 'flex', elements: ['spiral'], mode: 'hold', perSide: true, poseId: 'spiral',
    checkpoints: ['벽이나 벤치 잡고 서기', '뒷다리를 엉덩이 높이로', '가슴 펴고 앞을 보기'], caution: FLEX_CAUTION,
    levels: [L(2, 15, 20), L(3, 15, 20), L(3, 20, 20), L(3, 25, 20), L(3, 30, 20)] }),
  ex({ id: 'F02', name: '앞뒤 스플릿 스트레칭', category: 'flex', elements: ['split'], mode: 'hold', perSide: true, equipment: ['mat'], places: ['home'], poseId: 'frontSplit',
    checkpoints: ['골반은 정면을 향하게', '무릎 펴고 천천히', '아프면 높이 낮추기'], caution: `${FLEX_CAUTION}. 누가 눌러 주지 않기`,
    levels: [L(2, 20, 15), L(2, 25, 15), L(3, 25, 15), L(3, 30, 15), L(4, 30, 15)] }),
  ex({ id: 'F03', name: '좌우 개각(스트래들)', category: 'flex', elements: ['split'], mode: 'hold', equipment: ['mat'], places: ['home'], poseId: 'straddle',
    checkpoints: ['등을 곧게 세우기', '발끝은 천장으로', '숨 내쉬며 앞으로'], caution: `${FLEX_CAUTION}. 누가 눌러 주지 않기`,
    levels: [L(2, 25, 15), L(2, 30, 15), L(3, 30, 15), L(4, 30, 15), L(5, 30, 15)] }),
  // F04: 허리를 크게 젖히는 브릿지 대신 엉덩이 들기(척추분리증 위험 — 훈련 내용 검토 §2.2, 사용자 결정 2026-10-12)
  ex({ id: 'F04', name: '엉덩이 들기', category: 'flex', elements: ['spiral'], mode: 'hold', equipment: ['mat'], places: ['home'], poseId: 'gluteBridge',
    checkpoints: ['누워서 무릎 세우기', '엉덩이만 천천히 들기', '등은 바닥에 그대로'], caution: '허리는 젖히지 않기, 통증이 있으면 바로 내려오기',
    levels: [L(2, 10, 20), L(3, 10, 20), L(3, 15, 20), L(3, 20, 20), L(4, 20, 20)] }),
  ex({ id: 'F05', name: '런지 고관절 늘이기', category: 'flex', elements: ['spiral', 'split'], mode: 'hold', perSide: true, poseId: 'lungeStretch',
    places: ['home', 'park'],
    checkpoints: ['앞무릎은 발목 위', '골반을 앞으로 밀기', '상체는 곧게 세우기'], caution: FLEX_CAUTION,
    levels: [L(2, 20, 15), L(2, 25, 15), L(3, 25, 15), L(3, 30, 15), L(4, 30, 15)] }),
  ex({ id: 'F07', name: '발 올려 햄스트링 늘이기', category: 'flex', elements: ['split', 'spiral'], mode: 'hold', perSide: true, poseId: 'benchHam',
    checkpoints: ['발을 의자·벤치에', '무릎 펴고 등 곧게', '배꼽을 다리 쪽으로'], caution: FLEX_CAUTION,
    levels: [L(2, 20, 15), L(2, 25, 15), L(3, 25, 15), L(3, 30, 15), L(4, 30, 15)] }),
];

export const EXERCISES = [...WARMUPS, ...COOLDOWNS_HOME, ...COOLDOWNS_STANDING, ...JUMP, ...SPIN, ...BALANCE, ...FLEX];

const INDEX = new Map(EXERCISES.map(e => [e.id, e]));
export const byId = id => INDEX.get(id);
