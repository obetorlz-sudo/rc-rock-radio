import { COMP } from './instrument';

export function score(items, answers) {
  const discBuckets = { D: [], I: [], S: [], C: [] };
  const compBuckets = {};
  for (const c of COMP) compBuckets[c] = [];
  items.forEach((q, i) => {
    const raw = Number(answers[i]);
    if (!raw) return;
    const value = q.reverse ? 6 - raw : raw;
    discBuckets[q.disc].push(value);
    (compBuckets[q.competency] ||= []).push(value);
  });
  const pct = xs => xs.length ? Math.round(((xs.reduce((a,b)=>a+b,0)/xs.length)-1)/4*100) : null;
  const disc = Object.fromEntries(Object.entries(discBuckets).map(([k,v])=>[k,pct(v)]));
  const competencies = Object.fromEntries(Object.entries(compBuckets).map(([k,v])=>[k,pct(v)]));
  const ordered = Object.entries(disc).sort((a,b)=>(b[1]??-1)-(a[1]??-1));
  return { disc, competencies, primary: ordered[0]?.[0] || 'D', secondary: ordered[1]?.[0] || 'I' };
}

export function gapLabel(selfScore, teamScore) {
  const gap = selfScore - teamScore;
  if (selfScore >= 75 && teamScore >= 75 && Math.abs(gap) <= 10) return ['Fortaleza confirmada','good'];
  if (gap >= 15) return ['Brecha de autopercepción','warn'];
  if (gap <= -15) return ['Fortaleza poco reconocida','info'];
  if (selfScore < 60 && teamScore < 60) return ['Prioridad de desarrollo','risk'];
  return ['Percepción consistente','neutral'];
}

export function level(v) {
  if (v >= 80) return 'Fortaleza destacada';
  if (v >= 60) return 'Competencia consolidada';
  if (v >= 40) return 'En desarrollo';
  return 'Requiere desarrollo';
}
