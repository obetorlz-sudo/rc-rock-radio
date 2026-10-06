import { score } from './scoring';
import { query } from './db';

export async function validateAndScore(mode,answers){
  const {rows:items}=await query(`select id,text,disc,competency,reverse,position
    from rc360_questions
    where mode=$1 and active=true and deleted_at is null
    order by position,id`,[mode]);
  if(!items.length) throw new Error('No hay preguntas activas para esta evaluación.');
  if(!Array.isArray(answers)||answers.length!==items.length) throw new Error('Respuestas incompletas');
  const map=new Map(answers.map(a=>[Number(a.item_id),Number(a.score)]));
  const ordered=items.map(q=>map.get(Number(q.id)));
  if(ordered.some(v=>!Number.isInteger(v)||v<1||v>5)) throw new Error('Respuestas inválidas');
  return {result:score(items,ordered),ordered,items};
}
