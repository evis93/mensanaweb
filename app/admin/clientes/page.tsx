'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { Plus, Pencil, UserX } from 'lucide-react';


export default function ClientesPage() {
  const { profile } = useAuth();
  const { colors } = useTheme();

  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cargar = async () => {
    if (!profile?.empresaId) return;
    setLoading(true);
    const result = await fetch(`/api/admin/clientes?empresaId=${profile.empresaId}`).then(r => r.json());
    if (result.success) setClientes(result.data);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => {
    setEditandoId(null);
    setForm({ nombre: '', email: '', telefono: '' });
    setError('');
    setModalOpen(true);
  };

  const abrirEditar = (cliente: any) => {
    setEditandoId(cliente.id);
    setForm({ nombre: cliente.nombre_completo, email: cliente.email || '', telefono: cliente.telefono || '' });
    setError('');
    setModalOpen(true);
  };

  const handleGuardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (!editandoId && !form.email.trim()) { setError('El email es obligatorio'); return; }

    setGuardando(true);
    setError('');

    let result: any;

    if (editandoId) {
      result = await fetch('/api/admin/clientes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuarioId: editandoId,
          nombre: form.nombre,
          email: form.email,
          telefono: form.telefono,
        }),
      }).then(r => r.json());
    } else {
      result = await fetch('/api/admin/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre,
          email: form.email,
          telefono: form.telefono,
          empresaId: profile?.empresaId,
        }),
      }).then(r => r.json());
    }

    setGuardando(false);

    if (result.success) {
      if (!editandoId) {
        alert(`Cliente creado exitosamente.\nContraseña de acceso: 123456`);
      }
      setModalOpen(false);
      cargar();
    } else {
      setError(result.error || 'Error al guardar');
    }
  };

  const handleDesactivar = async (id: string) => {
    if (!confirm('¿Quitar este cliente de la empresa?')) return;
    await fetch('/api/admin/clientes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioId: id, empresaId: profile?.empresaId }),
    });
    cargar();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: colors.text }}>Clientes</h1>
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
      ) : clientes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">👤</p>
          <p style={{ color: colors.textSecondary }}>No hay clientes registrados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clientes.map(cliente => (
            <div key={cliente.id} className="bg-white rounded-xl border p-4 flex items-center gap-4" style={{ borderColor: colors.border }}>
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: colors.primary }}
              >
                {cliente.nombre_completo?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate" style={{ color: colors.text }}>{cliente.nombre_completo}</p>
                <p className="text-sm truncate" style={{ color: colors.textSecondary }}>
                  {cliente.email}{cliente.telefono ? ` · ${cliente.telefono}` : ''}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => abrirEditar(cliente)} className="p-2 rounded-lg hover:bg-gray-100 transition">
                  <Pencil size={16} style={{ color: colors.primary }} />
                </button>
                <button onClick={() => handleDesactivar(cliente.id)} className="p-2 rounded-lg hover:bg-red-50 transition">
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
              {editandoId ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h2>

            <div className="space-y-3">
              {(['nombre', 'email', 'telefono'] as const).map(field => (
                <div key={field}>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    {field === 'nombre' ? 'Nombre completo' : field.charAt(0).toUpperCase() + field.slice(1)}
                    {field === 'nombre' || (field === 'email' && !editandoId) ? ' *' : ''}
                  </label>
                  <input
                    type={field === 'email' ? 'email' : 'text'}
                    value={form[field]}
                    onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                    placeholder={field === 'nombre' ? 'Juan Pérez' : field === 'email' ? 'email@ejemplo.com' : '+54 11 ...'}
                    disabled={field === 'email' && !!editandoId}
                    className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                    style={{ borderColor: colors.border }}
                  />
                </div>
              ))}

              {!editandoId && (
                <p className="text-xs px-3 py-2 rounded-lg bg-blue-50 text-blue-700">
                  El cliente podrá ingresar con contraseña <strong>123456</strong>. Se recomienda que la cambie al primer ingreso.
                </p>
              )}

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
