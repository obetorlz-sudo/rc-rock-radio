import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { normalizeRut } from './rut';
const enc = () => new TextEncoder().encode(process.env.SESSION_SECRET || 'dev-only-change-me-please-32-characters');
export async function hashPassword(p){ return bcrypt.hash(p,12); }
export async function verifyPassword(p,h){ return bcrypt.compare(p,h); }
export function hashRut(rut){ return crypto.createHmac('sha256',process.env.RUT_HASH_SECRET||'dev-rut-secret').update(normalizeRut(rut)).digest('hex'); }
export async function createSession(user){
  const token=await new SignJWT({role:user.role,companyId:user.company_id||null,name:user.full_name||user.name||''}).setProtectedHeader({alg:'HS256'}).setSubject(String(user.id)).setIssuedAt().setExpirationTime('10h').sign(enc());
  const jar=await cookies(); jar.set('rc360_session',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:36000});
}
export async function clearSession(){ const jar=await cookies(); jar.set('rc360_session','',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0}); }
export async function getSession(){ try{ const jar=await cookies(); const t=jar.get('rc360_session')?.value; if(!t)return null; const {payload}=await jwtVerify(t,enc()); return {id:payload.sub,role:payload.role,companyId:payload.companyId,name:payload.name}; }catch{return null;} }
export function canManage(s){ return s && ['admin','psychologist','company'].includes(s.role); }
