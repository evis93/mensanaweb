'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/src/context/ThemeContext';
import { ConsultanteController } from '@/src/controllers/ConsultanteController';
import { DatabaseService } from '@/src/services/database.service';
import { X, Search, Loader2 } from 'lucide-react';
import { calcularMontoSena } from '@/src/types/servicios';
import type { Slot } from '@/src/types/disponibilidad';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Callback opcional: se llama cuando se crea un cliente nuevo, para ofrecer acceso a la app */
  onNuevoClienteCreado?: (clienteId: string, clienteNombre: string, clienteTelefono: string) => void;
  fecha: string;
  horaInicial?: string | null;
  reservaEditar?: any | null;
  profesionales: any[];
  profile: any;
}

export default function ModalReserva({ open, onClose, onSaved, onNuevoClienteCreado, fecha, horaInicial, reservaEditar, profesionales, profile }: Props) {
  const { colors } = useTheme();

  const [consultanteSearch, setConsultanteSearch] = useState('');
  const [consultantesFiltrados, setConsultantesFiltrados] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [tiposSesion, setTiposSesion] = useState<any[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [cargandoSlots, setCargandoSlots] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const searchTimeout = useRef<any>(null);

  const [form, setForm] = useState({
    consultante_id: null as string | null,
    consultante_nombre: '',
    consultante_email: '',
    consultante_telefono: '',
    hora_inicio: horaInicial || '',
    profesional_id: profile?.profesionalId || '',
    tipo_sesion_id: null as string | null,
    precio_total: '',
    monto_seña: '',
  });

  useEffect(() => {
    if (open) {
      if (reservaEditar) {
        setForm({
          consultante_id: reservaEditar.consultante_id || reservaEditar.cliente_id,
          consultante_nombre: reservaEditar.consultante_nombre || '',
          consultante_email: reservaEditar.consultante_email || '',
          consultante_telefono: reservaEditar.consultante_telefono || '',
          hora_inicio: reservaEditar.hora_inicio?.substring(0, 5) || '',
          profesional_id: reservaEditar.profesional_id || profile?.profesionalId || '',
          tipo_sesion_id: reservaEditar.servicio_id || null,
          precio_total: reservaEditar.precio_total?.toString() || '',
          monto_seña: reservaEditar.monto_seña?.toString() || '',
        });
        setConsultanteSearch(reservaEditar.consultante_nombre || '');
      } else {
        setForm({
          consultante_id: null,
          consultante_nombre: '',
          consultante_email: '',
          consultante_telefono: '',
          hora_inicio: horaInicial || '',
          profesional_id: profile?.profesionalId || '',
          tipo_sesion_id: null,
          precio_total: '',
          monto_seña: '',
        });
        setConsultanteSearch('');
      }
    }
  }, [open, reservaEditar, horaInicial]);

  useEffect(() => {
    DatabaseService.obtenerTiposSesion(profile?.empresaId).then(result => {
      if (result.success) setTiposSesion(result.data as any[]);
    });
  }, [profile?.empresaId]);

  // Cargar slots reales cuando cambia profesional, servicio o fecha
  useEffect(() => {
    const { profesional_id, tipo_sesion_id } = form;
    if (!profesional_id || !tipo_sesion_id || !fecha || !profile?.empresaId) {
      setSlots([]);
      return;
    }
    setCargandoSlots(true);
    fetch(`/api/disponibilidad?profesionalId=${profesional_id}&empresaId=${profile.empresaId}&servicioId=${tipo_sesion_id}&fecha=${fecha}`)
      .then(r => r.json())
      .then(json => { if (json.success) setSlots(json.data.slots ?? []); })
      .finally(() => setCargandoSlots(false));
  }, [form.profesional_id, form.tipo_sesion_id, fecha, profile?.empresaId]);

  const buscarConsultante = (query: string) => {
    setConsultanteSearch(query);
    clearTimeout(searchTimeout.current);
    if (!query.trim()) { setConsultantesFiltrados([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      const result = await ConsultanteController.buscarConsultantes(query, profile);
      if (result.success && 'data' in result) setConsultantesFiltrados(result.data || []);
      setIsSearching(false);
    }, 300);
  };

  const seleccionarConsultante = (c: any) => {
    setForm(prev => ({ ...prev, consultante_id: c.id, consultante_nombre: c.nombre_completo, consultante_email: c.email, consultante_telefono: c.telefono }));
    setConsultanteSearch(c.nombre_completo);
    setConsultantesFiltrados([]);
  };

  const seleccionarServicio = (servicioId: string) => {
    const s = tiposSesion.find(t => t.id === servicioId);
    if (!s) { setForm(prev => ({ ...prev, tipo_sesion_id: null, precio_total: '', monto_seña: '' })); return; }
    const monto = calcularMontoSena({ senaTipo: s.sena_tipo ?? 'monto', senaValor: s.sena_valor ?? 0, precio: s.precio ?? null });
    setForm(prev => ({
      ...prev,
      tipo_sesion_id: servicioId,
      precio_total:   s.precio?.toString() ?? '',
      monto_seña:     monto > 0 ? monto.toString() : '',
    }));
  };

  const handleGuardar = async () => {
    if (!form.hora_inicio) { alert('Seleccioná la hora de inicio'); return; }
    if (!form.tipo_sesion_id) { alert('Seleccioná un servicio'); return; }
    setGuardando(true);

    let clienteId = form.consultante_id;
    if (!clienteId && form.consultante_nombre) {
      const r = await ConsultanteController.crearConsultante({
        nombre_completo: form.consultante_nombre,
        email: form.consultante_email,
        telefono: form.consultante_telefono,
      }, profile);
      if (r.success) clienteId = (r as any).data?.id;
    }

    if (!clienteId) { alert('Seleccioná o creá un cliente'); setGuardando(false); return; }

    // fecha + hora_inicio en timezone local → ISO UTC para almacenar
    const fechaHoraInicio = new Date(`${fecha}T${form.hora_inicio}:00`).toISOString();

    const res = await fetch('/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        empresaId:      profile.empresaId,
        clienteId,
        profesionalId:  form.profesional_id,
        servicioId:     form.tipo_sesion_id,
        fechaHoraInicio,
      }),
    });
    const json = await res.json();

    setGuardando(false);
    if (json.success) {
      const esClienteNuevo = !form.consultante_id && !!clienteId;
      if (esClienteNuevo && onNuevoClienteCreado) {
        onNuevoClienteCreado(clienteId, form.consultante_nombre, form.consultante_telefono);
      }
      if (form.profesional_id !== profile?.profesionalId) {
        alert(`La reserva fue enviada al gestor para que ${profesionales.find(p => p.id === form.profesional_id)?.nombre_completo || 'el profesional'} la confirme.`);
      }
      onSaved();
    } else {
      alert(json.error || 'Error al guardar');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: colors.text }}>
            {reservaEditar ? 'Editar Reserva' : 'Nueva Reserva'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
            <X size={18} style={{ color: colors.textSecondary }} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Fecha */}
          <div className="bg-gray-50 rounded-xl px-4 py-2.5">
            <p className="text-xs" style={{ color: colors.textSecondary }}>Fecha</p>
            <p className="font-semibold text-sm" style={{ color: colors.text }}>{fecha}</p>
          </div>

          {/* Búsqueda de consultante */}
          <div className="relative">
            <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>Cliente *</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={consultanteSearch}
                onChange={e => buscarConsultante(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: colors.border }}
              />
              {isSearching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
            </div>
            {consultantesFiltrados.length > 0 && (
              <div className="absolute z-10 w-full bg-white border rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto" style={{ borderColor: colors.border }}>
                {consultantesFiltrados.map(c => (
                  <button
                    key={c.id}
                    onClick={() => seleccionarConsultante(c)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition text-sm border-b last:border-0"
                    style={{ borderColor: colors.borderLight, color: colors.text }}
                  >
                    {c.nombre_completo}
                    {c.email && <span className="text-xs ml-2" style={{ color: colors.textSecondary }}>{c.email}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Datos del consultante si es nuevo */}
          {!form.consultante_id && consultanteSearch && (
            <div className="space-y-2 bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-medium" style={{ color: colors.textSecondary }}>Datos del nuevo cliente</p>
              {[
                { key: 'consultante_email', label: 'Email', type: 'email', placeholder: 'email@ejemplo.com' },
                { key: 'consultante_telefono', label: 'Teléfono', type: 'tel', placeholder: '+54 11...' },
              ].map(f => (
                <input
                  key={f.key}
                  type={f.type}
                  value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: colors.border }}
                />
              ))}
            </div>
          )}

          {/* Tipo de sesión — movido antes de hora para cargar slots */}
          {tiposSesion.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>Tipo de sesión</label>
              <select
                value={form.tipo_sesion_id || ''}
                onChange={e => seleccionarServicio(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                <option value="">Sin especificar</option>
                {tiposSesion.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}{t.duracion_minutos ? ` (${t.duracion_minutos} min)` : ''}{t.precio ? ` · $${t.precio}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Hora — slots reales de disponibilidad */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
              Hora de inicio *
              {cargandoSlots && <span className="ml-2 text-xs font-normal" style={{ color: colors.textSecondary }}>Cargando disponibilidad...</span>}
            </label>
            {slots.length > 0 ? (
              <div className="grid grid-cols-4 gap-1.5">
                {slots.map(s => (
                  <button
                    key={s.horaInicio}
                    type="button"
                    disabled={!s.disponible}
                    onClick={() => setForm(prev => ({ ...prev, hora_inicio: s.horaInicio }))}
                    className="py-2 rounded-lg text-xs font-medium transition disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background: form.hora_inicio === s.horaInicio ? colors.primary : s.disponible ? colors.primaryFaded : '#f3f4f6',
                      color:      form.hora_inicio === s.horaInicio ? '#fff' : s.disponible ? colors.primary : '#9ca3af',
                    }}
                  >
                    {s.horaInicio}
                  </button>
                ))}
              </div>
            ) : (
              <select
                value={form.hora_inicio}
                onChange={e => setForm(prev => ({ ...prev, hora_inicio: e.target.value }))}
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                <option value="">
                  {form.tipo_sesion_id ? 'Sin disponibilidad para este día' : 'Seleccioná un servicio primero'}
                </option>
              </select>
            )}
          </div>

          {/* Profesional */}
          {profesionales.length > 1 && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>Profesional</label>
              <select
                value={form.profesional_id}
                onChange={e => setForm(prev => ({ ...prev, profesional_id: e.target.value }))}
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                {profesionales.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
              </select>
            </div>
          )}

          {/* Precio */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>Precio ($)</label>
            <input
              type="number"
              value={form.precio_total}
              onChange={e => setForm(prev => ({ ...prev, precio_total: e.target.value }))}
              placeholder="2500"
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ borderColor: colors.border }}
            />
          </div>

          {/* Seña / depósito */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
              Seña / depósito ($) <span className="font-normal text-xs" style={{ color: colors.textSecondary }}>(opcional)</span>
            </label>
            <input
              type="number"
              value={form.monto_seña}
              onChange={e => setForm(prev => ({ ...prev, monto_seña: e.target.value }))}
              placeholder="0"
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ borderColor: colors.border }}
            />
          </div>

          {/* Aviso si es para otro profesional */}
          {form.profesional_id && form.profesional_id !== profile?.profesionalId && !reservaEditar && (
            <div className="rounded-lg px-3 py-2.5 text-xs" style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
              ⚠️ Esta reserva irá al <strong>gestor de reservas</strong> para que el profesional la confirme.
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border text-sm font-medium" style={{ borderColor: colors.border, color: colors.text }}>
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: colors.primary }}
          >
            {guardando && <Loader2 size={14} className="animate-spin" />}
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
