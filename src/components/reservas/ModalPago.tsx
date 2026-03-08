'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/src/context/ThemeContext';
import { ReservaController } from '@/src/controllers/ReservaController';
import { supabase } from '@/src/config/supabase';
import { X } from 'lucide-react';

const METODOS_PAGO = [
  { id: 'efectivo', nombre: 'Efectivo' },
  { id: 'transferencia', nombre: 'Transferencia' },
  { id: 'tarjeta_debito', nombre: 'Tarjeta de Débito' },
  { id: 'tarjeta_credito', nombre: 'Tarjeta de Crédito' },
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

export default function ModalPago({ open, onClose, onSaved, reserva, profile }: Props) {
  const { colors } = useTheme();
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState<string | null>(null);
  const [pagado, setPagado] = useState(false);
  const [precioServicio, setPrecioServicio] = useState<any>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open || !reserva) return;
    setMonto(reserva.precio_total ? reserva.precio_total.toString() : '');
    setMetodoPago(reserva.metodo_pago || null);
    setPagado(reserva.pagado || false);
    setPrecioServicio(null);

    if (reserva.servicio_id) {
      supabase.from('servicios').select('nombre, precio').eq('id', reserva.servicio_id).single()
        .then(({ data }) => { if (data) setPrecioServicio(data); });
    }
  }, [open, reserva]);

  const handleGuardar = async () => {
    setGuardando(true);
    const result = await ReservaController.registrarPago(
      reserva.id,
      { precio_total: monto ? parseFloat(monto) : null, metodo_pago: metodoPago, pagado },
      profile
    );
    setGuardando(false);
    if (result.success) onSaved();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: colors.text }}>Registrar Pago</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
            <X size={18} style={{ color: colors.textSecondary }} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Info del consultante */}
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="font-medium text-sm" style={{ color: colors.text }}>
              {reserva.consultante_nombre || 'Sin nombre'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
              {reserva.fecha} · {reserva.hora_inicio?.substring(0, 5)}
            </p>
            {precioServicio && (
              <p className="text-xs mt-1" style={{ color: colors.primary }}>
                {precioServicio.nombre} · Precio sugerido: ${precioServicio.precio}
              </p>
            )}
          </div>

          {/* Monto */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>Monto a cobrar</label>
            <input
              type="number"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              placeholder="2500"
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ borderColor: colors.border }}
            />
          </div>

          {/* Método de pago */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>Método de pago</label>
            <div className="grid grid-cols-2 gap-2">
              {METODOS_PAGO.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMetodoPago(m.id)}
                  className="py-2 px-3 rounded-lg text-xs font-medium transition text-left"
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

          {/* Pagado toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={pagado}
              onChange={e => setPagado(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm font-medium" style={{ color: colors.text }}>Marcar como pagado</span>
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border text-sm font-medium" style={{ borderColor: colors.border, color: colors.text }}>
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
  );
}
