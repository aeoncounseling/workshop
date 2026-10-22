// Copenhagen Burnout Inventory (CBI) 19문항 — 문항, 응답척도, 채점
const L_FREQ = ['항상', '자주', '가끔', '드물게', '거의 전혀'];
const L_DEG = ['매우 그렇다', '꽤 그렇다', '어느 정도 그렇다', '별로 그렇지 않다', '거의 전혀 그렇지 않다'];
const FWD = [100, 75, 50, 25, 0];
const REV = [0, 25, 50, 75, 100];
const opts = (labels, vals) => labels.map((label, i) => ({ label, value: vals[i] }));
const FREQ = opts(L_FREQ, FWD);
const DEG = opts(L_DEG, FWD);
const FREQ_REV = opts(L_FREQ, REV); // WR7 역채점: 항상 = 0 … 거의 전혀 = 100

export const SCALES = {
  personalBurnout: { name: '개인적 소진', desc: '업무 원인에 한정하지 않은 전반적인 신체적·정서적 피로와 소진을 살펴봅니다.' },
  workBurnout: { name: '업무 관련 소진', desc: '현재 경험하는 피로와 소진을 자신의 업무와 관련하여 얼마나 느끼고 있는지를 살펴봅니다.' },
  patientBurnout: { name: '환자 관련 소진', desc: '환자와 관계하고 돌보는 과정과 관련하여 경험하는 피로와 소진을 살펴봅니다.' }
};
export const SCALE_KEYS = ['personalBurnout', 'workBurnout', 'patientBurnout'];

export const ITEMS = [
  { id: 'PB1', scale: 'personalBurnout', text: '나는 얼마나 자주 피곤함을 느끼나요?', options: FREQ },
  { id: 'PB2', scale: 'personalBurnout', text: '신체적으로 완전히 지쳤다고 느끼는 경우가 얼마나 자주 있나요?', options: FREQ },
  { id: 'PB3', scale: 'personalBurnout', text: '감정적으로 지쳤다고 느끼는 경우가 얼마나 자주 있나요?', options: FREQ },
  { id: 'PB4', scale: 'personalBurnout', text: '“더는 못 견디겠다”는 생각이 얼마나 자주 드나요?', options: FREQ },
  { id: 'PB5', scale: 'personalBurnout', text: '완전히 녹초가 되었다고 느끼는 경우가 얼마나 자주 있나요?', options: FREQ },
  { id: 'PB6', scale: 'personalBurnout', text: '몸이 약해지고 병에 걸리기 쉬운 상태라고 느끼는 경우가 얼마나 자주 있나요?', options: FREQ },

  { id: 'WR1', scale: 'workBurnout', text: '내 일은 정서적으로 얼마나 힘든가요?', options: DEG },
  { id: 'WR2', scale: 'workBurnout', text: '나는 일 때문에 소진되었다고 느끼나요?', options: DEG },
  { id: 'WR3', scale: 'workBurnout', text: '내 일 때문에 좌절감을 느끼나요?', options: DEG },
  { id: 'WR4', scale: 'workBurnout', text: '근무가 끝날 무렵 녹초가 된다고 느끼는 경우가 얼마나 자주 있나요?', options: FREQ },
  { id: 'WR5', scale: 'workBurnout', text: '또 하루 일해야 한다는 생각에 아침부터 지친다고 느끼는 경우가 얼마나 자주 있나요?', options: FREQ },
  { id: 'WR6', scale: 'workBurnout', text: '근무시간 내내 계속 힘들다고 느끼는 경우가 얼마나 자주 있나요?', options: FREQ },
  { id: 'WR7', scale: 'workBurnout', text: '근무 후 여가시간에 가족이나 친구와 함께할 충분한 에너지가 있나요?', options: FREQ_REV },

  { id: 'CR1', scale: 'patientBurnout', text: '환자와 일하는 것이 힘들다고 느끼나요?', options: DEG },
  { id: 'CR2', scale: 'patientBurnout', text: '환자와 일하는 것이 답답하거나 좌절스럽다고 느끼나요?', options: DEG },
  { id: 'CR3', scale: 'patientBurnout', text: '환자와 일하는 것이 내 에너지를 소모한다고 느끼나요?', options: DEG },
  { id: 'CR4', scale: 'patientBurnout', text: '환자와 일할 때 내가 받는 것보다 더 많이 주고 있다고 느끼나요?', options: DEG },
  { id: 'CR5', scale: 'patientBurnout', text: '환자를 상대하는 일에 지쳤다고 느끼는 경우가 얼마나 자주 있나요?', options: FREQ },
  { id: 'CR6', scale: 'patientBurnout', text: '환자를 계속 상대하며 일할 수 있을지 의문이 드는 경우가 얼마나 자주 있나요?', options: FREQ }
];

// answers: { PB1: 100, …, WR7: 0, … } (선택지의 점수값이 이미 들어 있음)
// 반환: 세 하위척도 평균 (0~100, 소수 첫째 자리 반올림)
export function score(answers) {
  const out = {};
  for (const k of SCALE_KEYS) {
    const vals = ITEMS.filter(it => it.scale === k).map(it => answers[it.id]);
    if (vals.some(v => typeof v !== 'number')) throw new Error('incomplete');
    out[k] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  }
  return out;
}
