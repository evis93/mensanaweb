'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { DIAS_SEMANA } from '@/src/types/disponibilidad';
import { Plus, Trash2, Lock } from 'lucide-react';
import { supabase } from '@/src/config/supabase';

type HorarioBase = { diaSemana: number; horaInicio: string; horaFin: string; activo: boolean }
type Excepcion   = { id: string; fecha: string; tipo: 'bloqueo' | 'extension'; horaInicio: string; horaFin: string; motivo: string | null }

export default function HorariosPage() {
  const { profile } = useAuth();
  const { colors }  = useTheme();

  const [base, setBase]           = useState<HorarioBase[]>([]);
  const [excepciones, setExcepciones] = useState<Excepcion[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm]           = useState({ fecha: '', tipo: 'bloqueo', horaInicio: '', horaFin: '', motivo: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState('');

  const cargar = async () => {
    if (!profile?.empresaId || !profile?.usuarioId) return;
    setLoading(true);
    try {
      // Horario base de la empresa
      const resBase = await fetch(`/api/horarios?empresaId=${profile.empresaId}`);
      const jsonBase = await resBase.json();
      if (jsonBase.success) {
        setBase((jsonBase.data ?? []).map((h: any) => ({
          diaSemana:  h.dia_semana,
          horaInicio: h.hora_inicio?.substring(0, 5),
          horaFin:    h.hora_fin?.substring(0, 5),
          activo:     h.activo,
        })));
      }

      // Excepciones propias del profesional (próximos 30 días)
      const hoy    = new Date().toISOString().split('T')[0];
      const en30   = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      const { data } = await supabase
        .from('disponibilidad_profesional')
        .select('*')
        .eq('usuario_id', profile.usuarioId)
        .eq('empresa_id', profile.empresaId)
        .gte('fecha', hoy)
        .lte('fecha', en30)
        .order('fecha');
      setExcepciones((data ?? []).map((e: any) => ({
        id:         e.id,
        fecha:      e.fecha,
        tipo:       e.tipo,
        horaInicio: e.hora_inicio?.substring(0, 5),
        horaFin:    e.hora_fin?.substring(0, 5),
        motivo:     e.motivo,
      })));
    } catch {
      setError('Error al cargar horarios');
    }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [profile?.empresaId, profile?.usuarioId]);

  const handleGuardar = async () => {
    if (!form.fecha || !form.horaInicio || !form.horaFin) {
      setError('Completá fecha, hora inicio y hora fin'); return;
    }
    if (form.horaInicio >= form.horaFin) {
      setError('La hora de inicio debe ser antes que la de fin'); return;
    }
    setError('');
    setGuardando(true);
    const { error: dbErr } = await supabase
      .from('disponibilidad_profesional')
      .insert({
        usuario_id:  profile!.usuarioId,
        empresa_id:  profile!.empresaId,
        fecha:       form.fecha,
        tipo:        form.tipo,
        hora_inicio: form.horaInicio,
        hora_fin:    form.horaFin,
        motivo:      form.motivo || null,
      });
    setGuardando(false);
    if (dbErr) { setError(dbErr.message); return; }
    setModalOpen(false);
    setForm({ fecha: '', tipo: 'bloqueo', horaInicio: '', horaFin: '', motivo: '' });
    cargar();
  };

  const handleEliminar = async (id: string) => {
    await supabase.from('disponibilidad_profesional').delete().eq('id', id);
    setExcepciones(prev => prev.filter(e => e.id !== id));
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
    </div>
  );

  return (
    <div className="p-6 max-w-lg space-y-8">

      {/* Horario base (solo lectura) */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Lock size={14} style={{ color: colors.textSecondary }} />
          <h2 className="text-base font-semibold" style={{ color: colors.text }}>Horario base de la empresa</h2>
        </div>
        <div className="space-y-2">
          {DIAS_SEMANA.map(dia => {
            const h = base.find(x => x.diaSemana === dia.value);
            return (
              <div
                key={dia.value}
                className="flex items-center justify-between px-4 py-2.5 bg-white rounded-xl border"
                style={{ borderColor: colors.border, opacity: h?.activo ? 1 : 0.4 }}
              >
                <span className="text-sm font-medium" style={{ color: colors.text }}>{dia.label}</span>
                <span className="text-sm" style={{ color: colors.textSecondary }}>
                  {h?.activo ? `${h.horaInicio} – ${h.horaFin}` : 'No laboral'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Excepciones del profesional */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ color: colors.text }}>Mis excepciones (próximos 30 días)</h2>
          <button
            onClick={() => { setForm({ fecha: '', tipo: 'bloqueo', horaInicio: '', horaFin: '', motivo: '' }); setError(''); setModalOpen(true); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-sm font-medium"
            style={{ background: colors.primary }}
          >
            <Plus size={14} /> Agregar
          </button>
        </div>

        {excepciones.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: colors.textSecondary }}>
            Sin excepciones registradas
          </p>
        ) : (
          <div className="space-y-2">
            {excepciones.map(e => (
              <div
                key={e.id}
                className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border"
                style={{ borderColor: colors.border }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: colors.text }}>
                    {e.fecha} · {e.horaInicio} – {e.horaFin}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: e.tipo === 'bloqueo' ? '#ef4444' : colors.primary }}>
                    {e.tipo === 'bloqueo' ? 'Bloqueo' : 'Extensión'}
                    {e.motivo ? ` — ${e.motivo}` : ''}
                  </p>
                </div>
                <button onClick={() => handleEliminar(e.id)} className="p-1.5 rounded-lg hover:bg-red-50">
                  <Trash2 size={15} className="text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal nueva excepción */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: colors.text }}>Nueva excepción</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ v: 'bloqueo', l: 'Bloqueo' }, { v: 'extension', l: 'Extensión' }].map(({ v, l }) => (
                    <button
                      key={v}
                      onClick={() => setForm(prev => ({ ...prev, tipo: v }))}
                      className="py-2 rounded-lg text-sm font-medium transition"
                      style={{
                        background: form.tipo === v ? colors.primary : colors.primaryFaded,
                        color:      form.tipo === v ? '#fff' : colors.primary,
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <p className="text-xs mt-1.5" style={{ color: colors.textSecondary }}>
                  {form.tipo === 'bloqueo'
                    ? 'Marcá un horario como no disponible ese día'
                    : 'Agregá disponibilidad extra fuera del horario base'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>Fecha</label>
                <input
                  type="date"
                  value={form.fecha}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setForm(prev => ({ ...prev, fecha: e.target.value }))}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: colors.border }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[{ key: 'horaInicio', label: 'Desde' }, { key: 'horaFin', label: 'Hasta' }].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>{label}</label>
                    <input
                      type="time"
                      value={(form as any)[key]}
                      onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ borderColor: colors.border }}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>Motivo (opcional)</label>
                <input
                  type="text"
                  value={form.motivo}
                  onChange={e => setForm(prev => ({ ...prev, motivo: e.target.value }))}
                  placeholder="Ej: Capacitación, médico..."
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: colors.border }}
                />
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 rounded-lg border text-sm font-medium"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={guardando}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                style={{ background: colors.primary }}
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
