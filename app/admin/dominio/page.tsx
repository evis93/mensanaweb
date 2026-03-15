'use client';

/**
 * /admin/dominio — Configuración de dominio propio (planes PRO y PRO-WEB).
 *
 * Flujo:
 *  1. Verifica que el plan de la empresa lo permita
 *  2. Admin ingresa su dominio (ej: turnos.miempresa.com)
 *  3. La app verifica que el CNAME apunte a cname.vercel-dns.com
 *  4. Si pasa, guarda url + url_verified=true + url_status='active'
 *  5. Muestra confirmación y próximos pasos
 *
 * Campos en Supabase:
 *   empresas.url           → dominio propio sin https://
 *   empresas.url_verified  → boolean, true después de verificación exitosa
 *   empresas.url_status    → 'pending' | 'active' | 'failed'
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { supabase } from '@/src/config/supabase';

type Step = 'loading' | 'plan-blocked' | 'input' | 'verifying' | 'dns-pending' | 'saving' | 'done' | 'error';
type Plan = 'PRUEBA' | 'PRO' | 'PRO-WEB' | 'PARTNER';

const CUSTOM_DOMAIN_PLANS: Plan[] = ['PRO', 'PRO-WEB'];
const CNAME_TARGET = 'cname.vercel-dns.com';

interface EmpresaData {
  plan: Plan;
  url: string | null;
  url_verified: boolean | null;
  url_status: 'pending' | 'active' | 'failed' | null;
}

export default function DominioPage() {
  const { profile } = useAuth();
  const { colors } = useTheme();

  const [step, setStep] = useState<Step>('loading');
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null);
  const [domain, setDomain] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const empresaId = profile?.empresaId;

  // Cargar datos actuales de la empresa (plan + url actual)
  useEffect(() => {
    if (!empresaId) return;

    supabase
      .from('empresas')
      .select('plan, url, url_verified, url_status')
      .eq('id', empresaId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setStep('error'); return; }

        setEmpresa(data as EmpresaData);
        setDomain(data.url ?? '');

        if (!CUSTOM_DOMAIN_PLANS.includes(data.plan as Plan)) {
          setStep('plan-blocked');
        } else if (data.url && data.url_status === 'active') {
          setStep('done');
        } else {
          setStep('input');
        }
      });
  }, [empresaId]);

  async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!cleanDomain) return;

    setDomain(cleanDomain);
    setStep('verifying');
    setErrorMsg('');

    try {
      // 1. Verificar CNAME
      const res = await fetch('/api/admin/domain/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: cleanDomain }),
      });
      const verifyData = await res.json();

      if (!verifyData.valid) {
        // Guardar como pending aunque no esté propagado aún
        await supabase
          .from('empresas')
          .update({ url: cleanDomain, url_verified: false, url_status: 'pending' })
          .eq('id', empresaId);
        setStep('dns-pending');
        return;
      }

      // 2. CNAME OK → guardar como active
      setStep('saving');
      const { error } = await supabase
        .from('empresas')
        .update({ url: cleanDomain, url_verified: true, url_status: 'active' })
        .eq('id', empresaId);

      if (error) throw new Error(error.message);

      setEmpresa(prev => prev ? { ...prev, url: cleanDomain, url_verified: true, url_status: 'active' } : prev);
      setStep('done');
    } catch (err: any) {
      await supabase
        .from('empresas')
        .update({ url: cleanDomain, url_verified: false, url_status: 'failed' })
        .eq('id', empresaId);
      setErrorMsg(err.message || 'Error inesperado');
      setStep('error');
    }
  }

  function handleEdit() {
    setStep('input');
    setErrorMsg('');
  }

  // ── Renders ──────────────────────────────────────────────────────────────

  if (step === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">dominio propio</h1>
      <p className="text-sm text-gray-500 mb-8">
        Configurá tu dominio para que tus clientes accedan desde{' '}
        <strong>turnos.tuempresa.com</strong> — Mensana queda completamente invisible.
      </p>

      {/* ── Plan no permite dominio propio ──────────────────────────── */}
      {step === 'plan-blocked' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="font-bold text-amber-800 mb-2">plan actual: {empresa?.plan}</p>
          <p className="text-sm text-amber-700">
            El dominio propio está disponible en los planes <strong>PRO</strong> y{' '}
            <strong>PRO-WEB</strong>. Contactate con Mensana para actualizar tu plan.
          </p>
        </div>
      )}

      {/* ── Formulario de dominio ────────────────────────────────────── */}
      {step === 'input' && (
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">
              Tu dominio
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="turnos.tuempresa.com"
              required
              className="w-full px-4 py-3 rounded-xl border text-gray-800 focus:outline-none focus:ring-2"
              style={{ borderColor: '#e2e8f0' }}
            />
            <p className="text-xs text-gray-400 mt-1">
              Sin <code>https://</code>. Solo el dominio o subdominio.
            </p>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 text-sm text-gray-700 space-y-2">
            <p className="font-bold text-gray-800">1. Configurá el DNS primero</p>
            <p>En el panel de tu proveedor (Nic.ar, GoDaddy, Namecheap…) agregá:</p>
            <div className="bg-white rounded-lg border p-3 font-mono text-xs space-y-1">
              <div className="flex gap-4">
                <span className="w-16 text-gray-400">Tipo</span>
                <span className="font-bold">CNAME</span>
              </div>
              <div className="flex gap-4">
                <span className="w-16 text-gray-400">Nombre</span>
                <span className="font-bold">turnos</span>
                <span className="text-gray-400">(el subdominio que quieras)</span>
              </div>
              <div className="flex gap-4">
                <span className="w-16 text-gray-400">Valor</span>
                <span className="font-bold select-all">{CNAME_TARGET}</span>
              </div>
              <div className="flex gap-4">
                <span className="w-16 text-gray-400">TTL</span>
                <span className="font-bold">3600</span>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              La propagación DNS puede tardar hasta 48 hs (generalmente menos de 1 hora).
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl text-white font-bold text-sm"
            style={{ backgroundColor: colors.primary }}
          >
            2. verificar y activar dominio
          </button>
        </form>
      )}

      {/* ── Verificando ──────────────────────────────────────────────── */}
      {step === 'verifying' && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: colors.primary }} />
          <p className="text-sm text-gray-500">verificando DNS de {domain}…</p>
        </div>
      )}

      {/* ── DNS pendiente ────────────────────────────────────────────── */}
      {step === 'dns-pending' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="font-bold text-amber-800 mb-1">el CNAME todavía no propagó</p>
            <p className="text-sm text-amber-700">
              No detectamos <strong>{domain}</strong> apuntando a{' '}
              <code className="text-xs">{CNAME_TARGET}</code>.
            </p>
            <p className="text-sm text-amber-700 mt-2">
              Revisá la configuración en tu proveedor y volvé a verificar en unos minutos.
              Guardamos el dominio como <strong>pendiente</strong> — podés reintentar cuando quieras.
            </p>
          </div>
          <button
            onClick={handleEdit}
            className="w-full py-3 rounded-xl text-sm font-bold border-2"
            style={{ borderColor: colors.primary, color: colors.primary }}
          >
            reintentar verificación
          </button>
        </div>
      )}

      {/* ── Guardando ────────────────────────────────────────────────── */}
      {step === 'saving' && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: colors.primary }} />
          <p className="text-sm text-gray-500">activando dominio…</p>
        </div>
      )}

      {/* ── Activo ───────────────────────────────────────────────────── */}
      {step === 'done' && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <p className="font-bold text-green-800 text-lg mb-1">dominio activo</p>
            <p className="text-sm text-green-700">
              Tus clientes acceden desde{' '}
              <a
                href={`https://${domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline"
              >
                {domain}
              </a>
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-2">
            <p className="font-bold text-gray-800">estado del dominio</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              <span className="text-gray-600">CNAME verificado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              <span className="text-gray-600">SSL automático (Let's Encrypt vía Vercel)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              <span className="text-gray-600">PWA instalable disponible</span>
            </div>
          </div>

          <button
            onClick={handleEdit}
            className="w-full py-3 rounded-xl text-sm font-bold border-2"
            style={{ borderColor: '#e2e8f0', color: '#6b7280' }}
          >
            cambiar dominio
          </button>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────── */}
      {step === 'error' && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="font-bold text-red-800 mb-1">algo salió mal</p>
            <p className="text-sm text-red-700">{errorMsg || 'Error al cargar los datos de la empresa.'}</p>
          </div>
          <button
            onClick={handleEdit}
            className="w-full py-3 rounded-xl text-sm font-bold border-2"
            style={{ borderColor: colors.primary, color: colors.primary }}
          >
            volver a intentar
          </button>
        </div>
      )}
    </div>
  );
}
