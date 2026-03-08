'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/src/context/ThemeContext';
import { supabase } from '@/src/config/supabase';
import { DatabaseService } from '@/src/services/database.service';
import { X, Lock, CheckCircle } from 'lucide-react';

const METODOS_PAGO = [
  { id: 'efectivo', nombre: 'Efectivo' },
  { id: 'transferencia', nombre: 'Transferencia' },
  { id: 'tarjeta_debito', nombre: 'Tarj. Débito' },
  { id: 'tarjeta_credito', nombre: 'Tarj. Crédito' },
  { id: 'mercadopago', nombre: 'Mercado Pago' },
  { id: 'obra_social', nombre: 'Obra Social' },
  { id: 'otro', nombre: 'Otro' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  reserva: any;
  profile: any;
}

export default function ModalFicha({ open, onClose, onSaved, reserva, profile }: Props) {
  const { colors } = useTheme();
  const [notas, setNotas] = useState('');
  const [fichaId, setFichaId] = useState<string | null>(null);
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState<string | null>(null);
  const [pagado, setPagado] = useState(false);
  const [servicioId, setServicioId] = useState<string | null>(null);
  const [servicios, setServicios] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !reserva) return;

    // Datos de pago desde reserva
    setMonto(reserva.precio_total ? reserva.precio_total.toString() : '');
    setMetodoPago(reserva.metodo_pago || null);
    setPagado(reserva.pagado || false);
    setServicioId(reserva.servicio_id || null);
    setNotas('');
    setFichaId(null);
    setHistorial([]);
    setError(null);

    // Cargar ficha existente para esta reserva
    supabase
      .from('fichas')
      .select('id, nota')
      .eq('reserva_id', reserva.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFichaId(data.id);
          setNotas(data.nota || '');
        }
      });

    // Cargar servicios de la empresa
    DatabaseService.obtenerTiposSesion(profile?.empresaId || null).then(r => {
      if (r.success) setServicios(r.data || []);
    });

    // Historial: últimas 3 reservas pagadas del mismo cliente (con ficha si tiene)
    const clienteId = reserva.cliente_id || reserva.consultante_id;
    if (clienteId) {
      supabase
        .from('reservas')
        .select('id, fecha, hora_inicio, precio_total, servicio_id, servicios(nombre), fichas(nota)')
        .eq('cliente_id', clienteId)
        .eq('pagado', true)
        .neq('id', reserva.id)
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false })
        .limit(3)
        .then(({ data }) => { if (data) setHistorial(data); });
    }
  }, [open, reserva]);

  const handleGuardar = async () => {
    setGuardando(true);
    setError(null);

    // 1. Actualizar reserva (pago + servicio)
    const { error: errReserva } = await supabase
      .from('reservas')
      .update({
        servicio_id: servicioId,
        precio_total: monto ? parseFloat(monto) : null,
        metodo_pago: metodoPago,
        pagado,
        profesional_id: reserva.profesional_id || profile?.profesionalId || null,
        empresa_id: reserva.empresa_id || profile?.empresaId || null,
        autor_id: reserva.autor_id || profile?.usuarioId || null,
      })
      .eq('id', reserva.id);

    if (errReserva) { setError(errReserva.message); setGuardando(false); return; }

    // 2. Guardar notas en fichas (upsert por reserva_id)
    if (notas.trim() || fichaId) {
      if (fichaId) {
        await supabase.from('fichas').update({ nota: notas }).eq('id', fichaId);
      } else {
        await supabase.from('fichas').insert({
          reserva_id: reserva.id,
          nota: notas,
          fecha: new Date().toISOString(),
        });
      }
    }

    setGuardando(false);
    onSaved();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: colors.borderLight }}>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition">
            <X size={18} style={{ color: colors.textSecondary }} />
          </button>
          <h2 className="flex-1 text-center text-base font-bold lowercase" style={{ color: colors.text }}>
            ficha · cobro
          </h2>
          <div className="w-8" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">

          {/* Resumen de la cita */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold lowercase tracking-wide" style={{ color: colors.primary }}>
              resumen de la cita
            </h3>
            <div className="rounded-xl p-4" style={{ background: colors.primaryFaded }}>
              <p className="font-medium text-sm lowercase" style={{ color: colors.text }}>
                cliente: {reserva?.consultante_nombre || 'sin nombre'}
              </p>
              <p className="text-xs mt-0.5 lowercase" style={{ color: colors.textSecondary }}>
                {reserva?.fecha} · {reserva?.hora_inicio?.substring(0, 5)}
                {reserva?.estado ? ` · ${reserva.estado}` : ''}
              </p>
            </div>
          </section>

          {/* Historial reciente */}
          {historial.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold lowercase tracking-wide" style={{ color: colors.primary }}>
                últimas visitas
              </h3>
              <div className="space-y-1.5">
                {historial.map(h => (
                  <div key={h.id} className="rounded-lg px-3 py-2" style={{ background: colors.primaryFaded }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium lowercase" style={{ color: colors.text }}>
                          {h.fecha} · {h.hora_inicio?.substring(0, 5)}
                        </p>
                        {h.servicios?.nombre && (
                          <p className="text-xs lowercase" style={{ color: colors.textSecondary }}>{h.servicios.nombre}</p>
                        )}
                      </div>
                      {h.precio_total != null && (
                        <span className="text-xs font-semibold" style={{ color: colors.primary }}>${h.precio_total}</span>
                      )}
                    </div>
                    {h.fichas?.[0]?.nota && (
                      <p className="text-xs mt-1 italic" style={{ color: colors.textMuted }}>
                        {h.fichas[0].nota}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Notas internas → fichas.nota */}
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

          {/* Servicio */}
          {servicios.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold lowercase tracking-wide" style={{ color: colors.primary }}>
                servicio
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {servicios.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setServicioId(s.id);
                      if (!monto && s.precio) setMonto(s.precio.toString());
                    }}
                    className="py-2 px-3 rounded-lg text-xs font-medium text-left transition"
                    style={{
                      background: servicioId === s.id ? colors.primary : colors.primaryFaded,
                      color: servicioId === s.id ? '#fff' : colors.primary,
                    }}
                  >
                    <span className="block truncate">{s.nombre}</span>
                    {s.precio ? <span className="opacity-70">${s.precio}</span> : null}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Detalles del pago */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold lowercase tracking-wide" style={{ color: colors.primary }}>
              detalles del pago
            </h3>

            <div>
              <label className="block text-xs mb-1 lowercase" style={{ color: colors.textSecondary }}>cobro realizado</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: colors.textSecondary }}>$</span>
                <input
                  type="number"
                  value={monto}
                  onChange={e => setMonto(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={{ background: colors.primaryFaded, border: `1px solid ${colors.borderLight}`, color: colors.text }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs mb-2 lowercase" style={{ color: colors.textSecondary }}>método de pago</label>
              <div className="grid grid-cols-3 gap-2">
                {METODOS_PAGO.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMetodoPago(m.id)}
                    className="py-2 px-2 rounded-lg text-xs font-medium transition"
                    style={{
                      background: metodoPago === m.id ? colors.primary : colors.primaryFaded,
                      color: metodoPago === m.id ? '#fff' : colors.primary,
                    }}
                  >
                    {m.nombre}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={pagado}
                onChange={e => setPagado(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm lowercase" style={{ color: colors.text }}>marcar como pagado</span>
            </label>
          </section>

          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t" style={{ borderColor: colors.borderLight, background: colors.primaryFaded }}>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition disabled:opacity-60"
            style={{ background: colors.primary }}
          >
            <CheckCircle size={18} />
            {guardando ? 'guardando...' : 'finalizar y guardar'}
          </button>
          <p className="text-center text-[10px] mt-3 italic" style={{ color: colors.textMuted }}>
            esta información es confidencial y solo para uso profesional
          </p>
        </div>
      </div>
    </div>
  );
}
