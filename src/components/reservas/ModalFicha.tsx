'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/src/context/ThemeContext';
import { supabase } from '@/src/config/supabase';
import { X, Lock, CheckCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  reserva: any;   // from v_reservas_detalle: fecha_hora_inicio, profesional_usuario_id, empresa_id, cliente_usuario_id, etc.
  profile: any;
}

export default function ModalFicha({ open, onClose, onSaved, reserva, profile }: Props) {
  const { colors } = useTheme();

  const [notas, setNotas]       = useState('');
  const [fichaId, setFichaId]   = useState<string | null>(null);
  const [historial, setHistorial] = useState<any[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando]   = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Extraer fecha y hora en timezone Argentina (UTC-3, sin DST) para buscar la ficha.
  // El API guarda la ficha con este mismo offset, así que debe coincidir.
  const AR_OFFSET_MS = -3 * 60 * 60 * 1000;
  const arTime  = reserva?.fecha_hora_inicio
    ? new Date(new Date(reserva.fecha_hora_inicio).getTime() + AR_OFFSET_MS)
    : null;
  const fechaLocal = arTime ? arTime.toISOString().split('T')[0] : null;
  const horaLocal  = arTime ? arTime.toISOString().split('T')[1].substring(0, 5) : null; // "HH:MM"

  useEffect(() => {
    if (!open || !reserva || !fechaLocal || !horaLocal) return;

    setCargando(true);
    setError(null);
    setNotas('');
    setFichaId(null);
    setHistorial([]);

    const profesionalId = reserva.profesional_usuario_id;
    const empresaId     = reserva.empresa_id;

    // Buscar la ficha creada automáticamente al confirmar
    supabase
      .from('fichas')
      .select('id, nota, usuario_empresa_id')
      .eq('profesional_id', profesionalId)
      .eq('empresa_id', empresaId)
      .eq('fecha', fechaLocal)
      .eq('hora', horaLocal)
      .maybeSingle()
      .then(async ({ data: ficha }) => {
        if (ficha) {
          setFichaId(ficha.id);
          setNotas(ficha.nota || '');

          // Cargar historial: últimas 3 fichas del mismo cliente en esta empresa
          if (ficha.usuario_empresa_id) {
            const { data: hist } = await supabase
              .from('fichas')
              .select('id, fecha, hora, servicio_nombre, nota')
              .eq('usuario_empresa_id', ficha.usuario_empresa_id)
              .eq('empresa_id', empresaId)
              .neq('id', ficha.id)
              .order('fecha', { ascending: false })
              .order('hora', { ascending: false })
              .limit(3);

            setHistorial(hist || []);
          }
        }
        setCargando(false);
      });
  }, [open, reserva]);

  const handleGuardar = async () => {
    if (!fichaId) { setError('No hay ficha para guardar. La ficha se crea automáticamente al confirmar la reserva.'); return; }
    setGuardando(true);
    setError(null);

    const { error: err } = await supabase
      .from('fichas')
      .update({ nota: notas })
      .eq('id', fichaId);

    setGuardando(false);
    if (err) { setError(err.message); return; }
    onSaved();
  };

  if (!open) return null;

  const horaDisplay = reserva?.fecha_hora_inicio
    ? new Date(reserva.fecha_hora_inicio).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: colors.borderLight }}>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition">
            <X size={18} style={{ color: colors.textSecondary }} />
          </button>
          <h2 className="flex-1 text-center text-base font-bold lowercase" style={{ color: colors.text }}>
            ficha del turno
          </h2>
          <div className="w-8" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-5">

          {/* Resumen */}
          <div className="rounded-xl p-4" style={{ background: colors.primaryFaded }}>
            <p className="font-medium text-sm lowercase" style={{ color: colors.text }}>
              {reserva?.cliente_nombre || 'sin nombre'}
            </p>
            <p className="text-xs mt-0.5 lowercase" style={{ color: colors.textSecondary }}>
              {fechaLocal} · {horaDisplay}
              {reserva?.servicio_nombre ? ` · ${reserva.servicio_nombre}` : ''}
            </p>
          </div>

          {cargando ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: colors.primary }} />
            </div>
          ) : !fichaId ? (
            <div className="rounded-xl p-4 bg-amber-50 border border-amber-200 text-sm text-amber-800">
              La ficha se crea automáticamente cuando confirmás la reserva.
            </div>
          ) : (
            <>
              {/* Historial */}
              {historial.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold lowercase tracking-wide" style={{ color: colors.primary }}>
                    últimas visitas
                  </h3>
                  <div className="space-y-1.5">
                    {historial.map(h => (
                      <div key={h.id} className="rounded-lg px-3 py-2" style={{ background: colors.primaryFaded }}>
                        <p className="text-xs font-medium" style={{ color: colors.text }}>
                          {h.fecha} · {h.hora?.substring(0, 5)}
                          {h.servicio_nombre ? ` · ${h.servicio_nombre}` : ''}
                        </p>
                        {h.nota && (
                          <p className="text-xs mt-0.5 italic" style={{ color: colors.textMuted }}>{h.nota}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Notas */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold lowercase tracking-wide" style={{ color: colors.primary }}>
                  notas internas
                </h3>
                <div className="relative">
                  <textarea
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                    placeholder="observaciones clínicas o notas privadas — no visibles para el cliente..."
                    className="w-full min-h-[140px] rounded-xl p-4 text-sm resize-none focus:outline-none"
                    style={{
                      background: colors.primaryFaded,
                      border: `1px solid ${colors.borderLight}`,
                      color: colors.text,
                    }}
                  />
                  <div className="absolute bottom-3 right-3 pointer-events-none">
                    <Lock size={14} style={{ color: colors.borderLight }} />
                  </div>
                </div>
              </section>
            </>
          )}

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        </div>

        {/* Footer */}
        {fichaId && (
          <div className="px-6 py-4 border-t" style={{ borderColor: colors.borderLight, background: colors.primaryFaded }}>
            <button
              onClick={handleGuardar}
              disabled={guardando}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition disabled:opacity-60"
              style={{ background: colors.primary }}
            >
              <CheckCircle size={18} />
              {guardando ? 'guardando...' : 'guardar notas'}
            </button>
            <p className="text-center text-[10px] mt-3 italic" style={{ color: colors.textMuted }}>
              esta información es confidencial y solo para uso profesional
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
