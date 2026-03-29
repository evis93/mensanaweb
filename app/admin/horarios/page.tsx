'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { DIAS_SEMANA } from '@/src/types/disponibilidad';

type HorarioDia = {
  diaSemana: number
  horaInicio: string
  horaFin: string
  activo: boolean
}

function horarioInicial(): HorarioDia[] {
  return DIAS_SEMANA.map(d => ({
    diaSemana:  d.value,
    horaInicio: '09:00',
    horaFin:    '18:00',
    activo:     d.value >= 1 && d.value <= 5,
  }))
}

export default function HorariosPage() {
  const { profile } = useAuth();
  const { colors } = useTheme();

  const [horarios, setHorarios]   = useState<HorarioDia[]>(horarioInicial());
  const [loading, setLoading]     = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado]   = useState(false);
  const [error, setError]         = useState('');

  const cargar = async () => {
    if (!profile?.empresaId) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/horarios?empresaId=${profile.empresaId}`);
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        const mapa: Record<number, HorarioDia> = {};
        for (const h of json.data) {
          mapa[h.dia_semana] = {
            diaSemana:  h.dia_semana,
            horaInicio: h.hora_inicio?.substring(0, 5),
            horaFin:    h.hora_fin?.substring(0, 5),
            activo:     h.activo,
          };
        }
        setHorarios(horarioInicial().map(d => mapa[d.diaSemana] ?? d));
      }
    } catch {
      setError('Error al cargar horarios');
    }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [profile?.empresaId]);

  const toggleDia = (diaSemana: number) => {
    setHorarios(prev => prev.map(h =>
      h.diaSemana === diaSemana ? { ...h, activo: !h.activo } : h
    ));
    setGuardado(false);
  };

  const cambiarHora = (diaSemana: number, campo: 'horaInicio' | 'horaFin', valor: string) => {
    setHorarios(prev => prev.map(h =>
      h.diaSemana === diaSemana ? { ...h, [campo]: valor } : h
    ));
    setGuardado(false);
  };

  const handleGuardar = async () => {
    if (!profile?.empresaId) return;
    for (const h of horarios) {
      if (h.activo && h.horaInicio >= h.horaFin) {
        const dia = DIAS_SEMANA.find(d => d.value === h.diaSemana)?.label;
        setError(`El horario del ${dia} es inválido (el inicio debe ser antes que el fin)`);
        return;
      }
    }
    setError('');
    setGuardando(true);
    try {
      const res  = await fetch('/api/horarios', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ empresaId: profile.empresaId, horarios }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setGuardado(true);
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    }
    setGuardando(false);
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
    </div>
  );

  return (
    <div className="p-6 max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: colors.text }}>Horarios de Atención</h1>
        <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
          Horario base de la empresa. Los profesionales pueden agregar excepciones por día.
        </p>
      </div>

      <div className="space-y-3">
        {DIAS_SEMANA.map(dia => {
          const h = horarios.find(x => x.diaSemana === dia.value)!;
          return (
            <div
              key={dia.value}
              className="bg-white rounded-xl border p-4"
              style={{ borderColor: colors.border, opacity: h.activo ? 1 : 0.55 }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-sm" style={{ color: colors.text }}>{dia.label}</p>
                <button
                  onClick={() => toggleDia(dia.value)}
                  className="text-xs px-3 py-1 rounded-full font-medium transition"
                  style={{
                    background: h.activo ? colors.primary : colors.primaryFaded,
                    color:      h.activo ? '#fff' : colors.primary,
                  }}
                >
                  {h.activo ? 'Activo' : 'Inactivo'}
                </button>
              </div>

              {h.activo && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: colors.textSecondary }}>Desde</label>
                    <input
                      type="time"
                      value={h.horaInicio}
                      onChange={e => cambiarHora(dia.value, 'horaInicio', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ borderColor: colors.border }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: colors.textSecondary }}>Hasta</label>
                    <input
                      type="time"
                      value={h.horaFin}
                      onChange={e => cambiarHora(dia.value, 'horaFin', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ borderColor: colors.border }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error   && <p className="mt-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      {guardado && <p className="mt-4 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">Horarios guardados correctamente</p>}

      <button
        onClick={handleGuardar}
        disabled={guardando}
        className="mt-6 w-full py-3 rounded-xl text-white font-medium disabled:opacity-60"
        style={{ background: colors.primary }}
      >
        {guardando ? 'Guardando...' : 'Guardar horarios'}
      </button>
    </div>
  );
}
