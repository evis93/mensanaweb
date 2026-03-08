'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { ProfesionalController } from '@/src/controllers/ProfesionalController';
import { Plus, Pencil, UserX } from 'lucide-react';

export default function ProfesionalesPage() {
  const { profile } = useAuth();
  const { colors } = useTheme();

  const [profesionales, setProfesionales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', esAdmin: false });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [passwordTemporal, setPasswordTemporal] = useState('');

  const cargar = async () => {
    setLoading(true);
    const result = await ProfesionalController.obtenerProfesionales(profile);
    if (result.success) setProfesionales((result as any).data);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => {
    setEditandoId(null);
    setForm({ nombre: '', email: '', telefono: '', esAdmin: false });
    setPasswordTemporal('');
    setError('');
    setModalOpen(true);
  };

  const abrirEditar = (prof: any) => {
    setEditandoId(prof.id);
    setForm({ nombre: prof.nombre_completo, email: prof.email || '', telefono: prof.telefono || '', esAdmin: prof.rol === 'admin' });
    setPasswordTemporal('');
    setError('');
    setModalOpen(true);
  };

  const handleGuardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (!editandoId && !form.email.trim()) { setError('El email es obligatorio'); return; }

    setGuardando(true);
    const data = { nombre: form.nombre, nombre_completo: form.nombre, email: form.email, telefono: form.telefono, esAdmin: form.esAdmin };

    const result = editandoId
      ? await ProfesionalController.actualizarProfesional(editandoId, data, profile)
      : await ProfesionalController.crearProfesional(data, profile);

    setGuardando(false);

    if (result.success) {
      if (!editandoId && (result as any).passwordTemporal) {
        setPasswordTemporal((result as any).passwordTemporal);
        alert(`Profesional creado. Contraseña temporal: ${(result as any).passwordTemporal}`);
      }
      setModalOpen(false);
      cargar();
    } else {
      setError((result as any).error || 'Error al guardar');
    }
  };

  const handleDesactivar = async (id: string) => {
    if (!confirm('¿Quitar este profesional de la empresa?')) return;
    await ProfesionalController.desactivarProfesional(id, profile);
    cargar();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: colors.text }}>Profesionales</h1>
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
      ) : profesionales.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">👥</p>
          <p style={{ color: colors.textSecondary }}>No hay profesionales configurados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {profesionales.map(prof => (
            <div key={prof.id} className="bg-white rounded-xl border p-4 flex items-center gap-4" style={{ borderColor: colors.border }}>
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: colors.primary }}
              >
                {prof.nombre_completo?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate" style={{ color: colors.text }}>{prof.nombre_completo}</p>
                <p className="text-sm truncate" style={{ color: colors.textSecondary }}>
                  {prof.email} {prof.rol === 'admin' ? '· Admin' : ''}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => abrirEditar(prof)} className="p-2 rounded-lg hover:bg-gray-100 transition">
                  <Pencil size={16} style={{ color: colors.primary }} />
                </button>
                <button onClick={() => handleDesactivar(prof.id)} className="p-2 rounded-lg hover:bg-red-50 transition">
                  <UserX size={16} className="text-red-500" />
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
              {editandoId ? 'Editar Profesional' : 'Nuevo Profesional'}
            </h2>

            <div className="space-y-3">
              {(['nombre', 'email', 'telefono'] as const).map(field => (
                <div key={field}>
                  <label className="block text-sm font-medium mb-1 capitalize" style={{ color: colors.text }}>
                    {field === 'nombre' ? 'Nombre completo' : field.charAt(0).toUpperCase() + field.slice(1)}
                    {field === 'nombre' || (field === 'email' && !editandoId) ? ' *' : ''}
                  </label>
                  <input
                    type={field === 'email' ? 'email' : 'text'}
                    value={form[field]}
                    onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                    placeholder={field === 'nombre' ? 'María García' : field === 'email' ? 'email@ejemplo.com' : '+54 11 ...'}
                    className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ borderColor: colors.border }}
                  />
                </div>
              ))}

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.esAdmin}
                  onChange={e => setForm(prev => ({ ...prev, esAdmin: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-medium" style={{ color: colors.text }}>Es administrador</span>
              </label>

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
