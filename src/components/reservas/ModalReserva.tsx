'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/src/context/ThemeContext';
import { ReservaController } from '@/src/controllers/ReservaController';
import { ConsultanteController } from '@/src/controllers/ConsultanteController';
import { DatabaseService } from '@/src/services/database.service';
import { X, Search, Loader2 } from 'lucide-react';

const HORARIOS_DISPONIBLES = Array.from({ length: 27 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? '00' : '30';
  return `${h.toString().padStart(2, '0')}:${m}`;
});

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  fecha: string;
  horaInicial?: string | null;
  reservaEditar?: any | null;
  profesionales: any[];
  profile: any;
}

export default function ModalReserva({ open, onClose, onSaved, fecha, horaInicial, reservaEditar, profesionales, profile }: Props) {
  const { colors } = useTheme();

  const [consultanteSearch, setConsultanteSearch] = useState('');
  const [consultantesFiltrados, setConsultantesFiltrados] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [tiposSesion, setTiposSesion] = useState<any[]>([]);
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

  const buscarConsultante = (query: string) => {
    setConsultanteSearch(query);
    clearTimeout(searchTimeout.current);
    if (!query.trim()) { setConsultantesFiltrados([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      const result = await ConsultanteController.buscarConsultantes(query, profile);
      if (result.success) setConsultantesFiltrados(result.data || []);
      setIsSearching(false);
    }, 300);
  };

  const seleccionarConsultante = (c: any) => {
    setForm(prev => ({ ...prev, consultante_id: c.id, consultante_nombre: c.nombre_completo, consultante_email: c.email, consultante_telefono: c.telefono }));
    setConsultanteSearch(c.nombre_completo);
    setConsultantesFiltrados([]);
  };

  const handleGuardar = async () => {
    if (!form.hora_inicio) { alert('Seleccioná la hora de inicio'); return; }
    setGuardando(true);

    let consultanteId = form.consultante_id;
    if (!consultanteId && form.consultante_nombre) {
      const r = await ConsultanteController.crearConsultante({
        nombre_completo: form.consultante_nombre,
        email: form.consultante_email,
        telefono: form.consultante_telefono,
      }, profile);
      if (r.success) consultanteId = (r as any).data?.id;
    }

    const reservaData = {
      cliente_id: consultanteId,
      consultante_id: consultanteId,
      fecha,
      hora_inicio: form.hora_inicio,
      servicio_id: form.tipo_sesion_id,
      precio_total: form.precio_total ? parseFloat(form.precio_total) : null,
      estado: 'confirmada',
    };

    const result = reservaEditar
      ? await ReservaController.actualizarReserva(reservaEditar.id, reservaData, profile)
      : await ReservaController.crearReserva(reservaData, form.profesional_id, profile);

    setGuardando(false);
    if (result.success) onSaved();
    else alert((result as any).error || 'Error al guardar');
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

          {/* Hora */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>Hora de inicio *</label>
            <select
              value={form.hora_inicio}
              onChange={e => setForm(prev => ({ ...prev, hora_inicio: e.target.value }))}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              <option value="">Seleccionar hora</option>
              {HORARIOS_DISPONIBLES.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
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

          {/* Tipo de sesión */}
          {tiposSesion.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>Tipo de sesión</label>
              <select
                value={form.tipo_sesion_id || ''}
                onChange={e => setForm(prev => ({ ...prev, tipo_sesion_id: e.target.value || null }))}
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                <option value="">Sin especificar</option>
                {tiposSesion.map(t => <option key={t.id} value={t.id}>{t.nombre}{t.precio ? ` · $${t.precio}` : ''}</option>)}
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
