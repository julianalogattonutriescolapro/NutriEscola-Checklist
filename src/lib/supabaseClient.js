import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------
// Configuração do projeto Supabase.
// Estas são chaves PÚBLICAS (anon key) — seguras para ficar no
// front-end. A segurança real vem das políticas RLS no banco
// (ver pasta /supabase/migrations). NUNCA coloque a service_role
// key aqui ou em qualquer arquivo que vá para o navegador.
// ---------------------------------------------------------------
export const SUPABASE_URL = 'https://zaezirytneaybiyqntag.supabase.co'.trim();
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphZXppcnl0bmVheWJpeXFudGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MTg5OTEsImV4cCI6MjA5OTI5NDk5MX0.BfcqVSI72iXbHvR2Bn0p6GUZiTfungKgJpt_q7RA_Ao'.trim();

export const PHOTOS_BUCKET = 'photos';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Testa se o navegador consegue alcançar o projeto Supabase.
 * Retorna true mesmo em respostas 401/404 (o que importa é que a
 * rede respondeu); só retorna false em falha de rede real
 * ("Failed to fetch": DNS, CORS, offline, projeto pausado, etc.).
 */
export async function testConnection() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    });
    return res.ok || res.status === 404 || res.status === 401;
  } catch (e) {
    console.error('Supabase connection test failed:', e);
    return false;
  }
}

/** Faz upload de uma imagem (data URL) para o bucket "photos" e retorna a URL pública. */
export async function uploadPhotoDataUrl(dataUrl, path) {
  const blob = await (await fetch(dataUrl)).blob();
  const { error } = await sb.storage.from(PHOTOS_BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;
  return sb.storage.from(PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;
}
