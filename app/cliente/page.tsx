'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { supabase } from '@/src/config/supabase';
import { ReservaController } from '@/src/controllers/ReservaController';
import ModalResena from '@/src/components/ModalResena';

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const DIAS  = ['dom','lun','mar','mié','jue','vie','sáb'];

function formatProxima(fecha: string, hora: string) {
  if (!fecha) return '';
  const hoy = new Date();
  const todayStr = hoy.toISOString().split('T')[0];
  const mañanaStr = new Date(hoy.getTime() + 86400000).toISOString().split('T')[0];
  const horaFmt = hora ? hora.slice(0, 5) : '';
  if (fecha === todayStr) return `hoy, ${horaFmt}`;
  if (fecha === mañanaStr) return `mañana, ${horaFmt}`;
  const d = new Date(fecha + 'T12:00:00');
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}, ${horaFmt}`;
}

function formatFechaHistorial(fechaStr: string) {
  const d = new Date(fechaStr + 'T12:00:00');
  return `${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export default function ClientePage() {
  const router = useRouter();
  const { colors, logoUrl } = useTheme();
  const { profile, logout } = useAuth();

  const nombreCorto = profile?.nombre_completo?.split(' ')[0]?.toLowerCase() || 'hola';

  const [loading, setLoading] = useState(true);
  const [proximaSesion, setProximaSesion] = useState<any>(null);
  const [historial, setHistorial] = useState<any[]>([]);
  const [resenasMap, setResenasMap] = useState<Record<string, any>>({});
  const [reservaParaResena, setReservaParaResena] = useState<any>(null);

  const cargar = useCallback(async () => {
    if (!profile?.usuarioId) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .eq('cliente_id', profile.usuarioId)
        .eq('empresa_id', profile.empresaId)
        .order('fecha', { ascending: false });

      if (error) throw error;

      const todas = await (ReservaController as any).enriquecerReservas(data || []);

      const proximas = todas
        .filter((r: any) => r.fecha >= today && ['pendiente', 'confirmada'].includes(r.estado))
        .sort((a: any, b: any) => a.fecha.localeCompare(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio));

      const pasadas = todas.filter((r: any) => r.fecha < today).slice(0, 3);

      setProximaSesion(proximas[0] || null);
      setHistorial(pasadas);

      const pasadasIds = pasadas.map((r: any) => r.id).filter(Boolean);
      if (pasadasIds.length > 0) {
        const { data: resenasData } = await supabase.from('resenas').select('*').in('reserva_id', pasadasIds);
        const map: Record<string, any> = {};
        (resenasData || []).forEach((r: any) => { map[r.reserva_id] = r; });
        setResenasMap(map);
      }
    } catch (e) {
      console.error('[ClientePage]', e);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleBorrarResena = async (reservaId: string) => {
    const resena = resenasMap[reservaId];
    if (!resena?.id) return;
    if (!window.confirm('¿Eliminar esta reseña?')) return;
    const { error } = await supabase.from('resenas').delete().eq('id', resena.id);
    if (!error) setResenasMap(prev => { const n = { ...prev }; delete n[reservaId]; return n; });
  };

  const handleLogout = async () => {
    if (!window.confirm('¿cerrar sesión?')) return;
    await logout();
    router.replace('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background }}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: colors.primary }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest" style={{ color: colors.textMuted }}>bienvenido</p>
          <h1 className="text-xl font-bold" style={{ color: colors.primary }}>hola, {nombreCorto}</h1>
        </div>
        {logoUrl && <img src={logoUrl} alt="logo" className="w-9 h-9 rounded-xl object-cover" />}
      </header>

      <div className="px-6 space-y-7">
        {/* Próxima sesión */}
        <section>
          <p className="text-xs uppercase tracking-wider mb-3" style={{ color: colors.textSecondary }}>próxima sesión</p>

          {proximaSesion ? (
            <>
              <div className="bg-white rounded-2xl p-5 shadow-sm border" style={{ borderColor: colors.borderLight }}>
                {/* Badge estado */}
                {proximaSesion.estado === 'pendiente' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 mb-3">
                    ⏰ pendiente de confirmación
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-700 mb-3">
                    ✓ confirmada
                  </span>
                )}

                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: colors.primary }}>
                  {formatProxima(proximaSesion.fecha, proximaSesion.hora_inicio)}
                </p>
                <p className="text-lg font-bold lowercase mb-1" style={{ color: colors.text }}>
                  {proximaSesion.servicio || proximaSesion.tipo_sesion || 'sesión'}
                </p>
                {proximaSesion.profesional_nombre && (
                  <p className="text-xs lowercase mb-4" style={{ color: colors.textMuted }}>
                    👤 {proximaSesion.profesional_nombre}
                  </p>
                )}
                <div className="flex gap-2">
                  <button className="flex-1 py-2.5 rounded-xl text-xs font-bold border" style={{ borderColor: colors.border, color: colors.textSecondary }}>
                    cancelar
                  </button>
                  {proximaSesion.estado === 'confirmada' && (
                    <button className="flex-1 py-2.5 rounded-xl text-xs font-bold" style={{ backgroundColor: colors.primaryFaded, color: colors.primary }}>
                      cambiar horario
                    </button>
                  )}
                </div>
              </div>

              {proximaSesion.estado === 'pendiente' && (
                <div className="mt-3 flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <span className="text-green-600">💬</span>
                  <p className="text-xs text-green-800 lowercase">
                    tu reserva depende de la aprobación del centro. te avisaremos cuando sea confirmada.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3 border" style={{ borderColor: colors.borderLight }}>
              <span className="text-3xl opacity-30">📅</span>
              <p className="text-sm lowercase" style={{ color: colors.textMuted }}>sin sesiones próximas</p>
              <Link href="/cliente/reservar"
                className="flex items-center gap-1 px-4 py-2 rounded-full border text-xs font-bold"
                style={{ borderColor: colors.primary, color: colors.primary }}>
                + reservar ahora
              </Link>
            </div>
          )}
        </section>

        {/* Historial */}
        <section>
          <p className="text-xs uppercase tracking-wider mb-3" style={{ color: colors.textSecondary }}>mi historial</p>

          {historial.length > 0 ? (
            <div>
              {historial.map((h: any, idx: number) => (
                <div key={h.id} className="flex gap-4 pb-6">
                  <div className="flex flex-col items-center w-3">
                    <div className="w-3 h-3 rounded-full border-2 border-white z-10" style={{ backgroundColor: colors.primaryFaded }} />
                    {idx < historial.length - 1 && <div className="w-px flex-1 mt-1" style={{ backgroundColor: colors.primaryFaded }} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs lowercase mb-0.5" style={{ color: colors.textMuted }}>{formatFechaHistorial(h.fecha)}</p>
                    <p className="text-sm font-bold lowercase mb-0.5" style={{ color: colors.text }}>{h.servicio || h.tipo_sesion || 'sesión'}</p>
                    {h.profesional_nombre && <p className="text-xs lowercase mb-2" style={{ color: colors.textSecondary }}>{h.profesional_nombre}</p>}

                    {resenasMap[h.id] ? (
                      <div className="flex gap-2">
                        <button onClick={() => setReservaParaResena(h)}
                          className="flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-bold lowercase"
                          style={{ borderColor: colors.primary, color: colors.primary }}>
                          ✏️ editar
                        </button>
                        <button onClick={() => handleBorrarResena(h.id)}
                          className="flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-bold lowercase"
                          style={{ borderColor: colors.error, color: colors.error }}>
                          🗑 borrar
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setReservaParaResena(h)}
                        className="flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-bold lowercase"
                        style={{ borderColor: colors.primary, color: colors.primary }}>
                        calificar ★
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3 border" style={{ borderColor: colors.borderLight }}>
              <span className="text-3xl opacity-30">📋</span>
              <p className="text-sm lowercase" style={{ color: colors.textMuted }}>sin sesiones anteriores</p>
            </div>
          )}
        </section>

        {/* Para vos */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-wider" style={{ color: colors.textSecondary }}>para vos</p>
            <button className="text-xs font-bold lowercase" style={{ color: colors.primary }}>ver más</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { icon: '🧘', tag: 'ejercicio', titulo: 'mindfulness: respiración consciente', sub: '5 minutos de calma absoluta' },
              { icon: '🌿', tag: 'rutina', titulo: 'estiramientos de mañana', sub: 'mejora tu postura hoy' },
            ].map((c, i) => (
              <div key={i} className="flex-shrink-0 w-56 rounded-2xl overflow-hidden border" style={{ borderColor: colors.borderLight }}>
                <div className="h-24 flex items-center justify-center text-4xl" style={{ backgroundColor: colors.primaryFaded }}>{c.icon}</div>
                <div className="p-3">
                  <p className="text-xs font-bold uppercase tracking-wide lowercase mb-1" style={{ color: colors.primary }}>{c.tag}</p>
                  <p className="text-xs font-bold lowercase leading-snug mb-0.5" style={{ color: colors.text }}>{c.titulo}</p>
                  <p className="text-xs lowercase" style={{ color: colors.textMuted }}>{c.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Modal reseña */}
      <ModalResena
        visible={!!reservaParaResena}
        reserva={reservaParaResena}
        resenaExistente={reservaParaResena ? resenasMap[reservaParaResena.id] : null}
        onCerrar={() => setReservaParaResena(null)}
        onGuardado={() => { setReservaParaResena(null); cargar(); }}
      />

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 border-t flex justify-between px-6 py-3" style={{ borderColor: colors.borderLight }}>
        <Link href="/cliente/reservar" className="flex flex-col items-center gap-0.5">
          <span className="text-lg">📅</span>
          <span className="text-xs lowercase" style={{ color: colors.textMuted }}>sesiones</span>
        </Link>
        <button className="flex flex-col items-center gap-0.5">
          <span className="text-lg">👤</span>
          <span className="text-xs lowercase" style={{ color: colors.textMuted }}>perfil</span>
        </button>
        <button onClick={handleLogout} className="flex flex-col items-center gap-0.5">
          <span className="text-lg">🚪</span>
          <span className="text-xs font-bold lowercase" style={{ color: colors.error }}>salir</span>
        </button>
      </nav>
    </div>
  );
}
