'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { ServiciosController } from '@/src/controllers/ServiciosController';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

export default function ServiciosPage() {
  const { profile } = useAuth();
  const { colors } = useTheme();

  const [servicios, setServicios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '', duracion_minutos: '', precio: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cargar = async () => {
    setLoading(true);
    const result = await ServiciosController.obtenerServicios(profile);
    if (result.success) setServicios((result as any).data);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => {
    setEditandoId(null);
    setForm({ nombre: '', descripcion: '', duracion_minutos: '', precio: '' });
    setError('');
    setModalOpen(true);
  };

  const abrirEditar = (s: any) => {
    setEditandoId(s.id);
    setForm({ nombre: s.nombre, descripcion: s.descripcion || '', duracion_minutos: s.duracion_minutos?.toString() || '', precio: s.precio?.toString() || '' });
    setError('');
    setModalOpen(true);
  };

  const handleGuardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setGuardando(true);
    const result = editandoId
      ? await ServiciosController.actualizarServicio(editandoId, form, profile)
      : await ServiciosController.crearServicio(form, profile);
    setGuardando(false);
    if (result.success) {
      setModalOpen(false);
      cargar();
    } else {
      setError((result as any).error || 'Error al guardar');
    }
  };

  const handleToggle = async (id: string, activo: boolean) => {
    await ServiciosController.toggleActivo(id, !activo, profile);
    cargar();
  };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar este servicio?')) return;
    await ServiciosController.eliminarServicio(id, profile);
    cargar();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: colors.text }}>Servicios</h1>
        <button
          onClick={abrirCrear}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ background: colors.primary }}
        >
          <Plus size={16} /> Agregar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
        </div>
      ) : servicios.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📋</p>
          <p style={{ color: colors.textSecondary }}>No hay servicios configurados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {servicios.map(s => (
            <div
              key={s.id}
              className="bg-white rounded-xl border p-4 flex items-center gap-4"
              style={{ borderColor: colors.border, opacity: s.activo ? 1 : 0.5 }}
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold" style={{ color: colors.text }}>{s.nombre}</p>
                <p className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>
                  {s.duracion_minutos ? `${s.duracion_minutos} min` : ''}{s.duracion_minutos && s.precio ? ' · ' : ''}{s.precio ? `$${s.precio}` : ''}
                  {s.descripcion ? ` · ${s.descripcion}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleToggle(s.id, s.activo)} title={s.activo ? 'Desactivar' : 'Activar'}>
                  {s.activo
                    ? <ToggleRight size={26} style={{ color: colors.success }} />
                    : <ToggleLeft size={26} className="text-gray-300" />
                  }
                </button>
                <button onClick={() => abrirEditar(s)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
                  <Pencil size={15} style={{ color: colors.primary }} />
                </button>
                <button onClick={() => handleEliminar(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition">
                  <Trash2 size={15} className="text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: colors.text }}>
              {editandoId ? 'Editar Servicio' : 'Nuevo Servicio'}
            </h2>

            <div className="space-y-3">
              {[
                { key: 'nombre', label: 'Nombre *', placeholder: 'Sesión individual', type: 'text' },
                { key: 'descripcion', label: 'Descripción', placeholder: 'Descripción opcional', type: 'text' },
                { key: 'duracion_minutos', label: 'Duración (minutos)', placeholder: '60', type: 'number' },
                { key: 'precio', label: 'Precio ($)', placeholder: '2500', type: 'number' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>{field.label}</label>
                  <input
                    type={field.type}
                    value={(form as any)[field.key]}
                    onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ borderColor: colors.border }}
                  />
                </div>
              ))}

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
