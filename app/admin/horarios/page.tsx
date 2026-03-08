'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { HorarioController } from '@/src/controllers/HorarioController';
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

export default function HorariosPage() {
  const { profile } = useAuth();
  const { colors } = useTheme();

  const [horarios, setHorarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [diaSeleccionado, setDiaSeleccionado] = useState<number | null>(null);
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cargar = async () => {
    setLoading(true);
    const result = await HorarioController.obtenerHorarios(profile);
    if (result.success) setHorarios((result as any).data);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const handleGuardar = async () => {
    if (diaSeleccionado === null || !horaInicio || !horaFin) {
      setError('Complete todos los campos');
      return;
    }
    setGuardando(true);
    const result = await HorarioController.crearHorario({ dia_semana: diaSeleccionado, hora_inicio: horaInicio, hora_fin: horaFin }, profile);
    setGuardando(false);
    if (result.success) {
      setModalOpen(false);
      setError('');
      cargar();
    } else {
      setError((result as any).error || 'Error al guardar');
    }
  };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar este horario?')) return;
    await HorarioController.eliminarHorario(id, profile);
    cargar();
  };

  const handleToggle = async (id: string, activo: boolean) => {
    await HorarioController.toggleActivo(id, activo, profile);
    cargar();
  };

  const getNombreDia = (dia: number) => HorarioController.DIAS_SEMANA[dia]?.nombre || '';

  const diasOrdenados = [...horarios].sort((a, b) => a.dia_semana - b.dia_semana);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: colors.text }}>Horarios de Atención</h1>
        <button
          onClick={() => { setDiaSeleccionado(null); setHoraInicio(''); setHoraFin(''); setError(''); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ background: colors.primary }}
        >
          <Plus size={16} /> Agregar horario
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
        </div>
      ) : diasOrdenados.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🕒</p>
          <p style={{ color: colors.textSecondary }}>No hay horarios configurados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {diasOrdenados.map(h => (
            <div key={h.id} className="bg-white rounded-xl border p-4 flex items-center justify-between" style={{ borderColor: colors.border }}>
              <div>
                <p className="font-semibold" style={{ color: colors.text }}>{getNombreDia(h.dia_semana)}</p>
                <p className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>
                  {h.hora_inicio?.substring(0, 5)} – {h.hora_fin?.substring(0, 5)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => handleToggle(h.id, h.activo)} title={h.activo ? 'Desactivar' : 'Activar'}>
                  {h.activo
                    ? <ToggleRight size={28} style={{ color: colors.success }} />
                    : <ToggleLeft size={28} className="text-gray-300" />
                  }
                </button>
                <button onClick={() => handleEliminar(h.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition">
                  <Trash2 size={16} className="text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal agregar */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: colors.text }}>Nuevo Horario</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>Día de la semana</label>
                <div className="grid grid-cols-4 gap-2">
                  {HorarioController.DIAS_SEMANA.map(d => (
                    <button
                      key={d.id}
                      onClick={() => setDiaSeleccionado(d.id)}
                      className="py-2 rounded-lg text-xs font-medium transition"
                      style={{
                        background: diaSeleccionado === d.id ? colors.primary : colors.primaryFaded,
                        color: diaSeleccionado === d.id ? '#fff' : colors.primary,
                      }}
                    >
                      {d.nombre.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>Hora inicio</label>
                  <input
                    type="time"
                    value={horaInicio}
                    onChange={e => setHoraInicio(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ borderColor: colors.border }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>Hora fin</label>
                  <input
                    type="time"
                    value={horaFin}
                    onChange={e => setHoraFin(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ borderColor: colors.border }}
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-lg border text-sm font-medium" style={{ borderColor: colors.border, color: colors.text }}>
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
