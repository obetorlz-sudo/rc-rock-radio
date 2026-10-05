import { SELF, TEAM } from './instrument';
import { score } from './scoring';
export function validateAndScore(mode,answers){
  const items=mode==='self'?SELF:TEAM;
  if(!Array.isArray(answers)||answers.length!==items.length) throw new Error('Respuestas incompletas');
  const map=new Map(answers.map(a=>[Number(a.item_id),Number(a.score)]));
  const ordered=items.map(q=>map.get(q.id));
  if(ordered.some(v=>!Number.isInteger(v)||v<1||v>5)) throw new Error('Respuestas inválidas');
  return {result:score(items,ordered), ordered, items};
}
