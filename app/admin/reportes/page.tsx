'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { ReservaController } from '@/src/controllers/ReservaController';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function ReportesPage() {
  const { profile } = useAuth();
  const { colors } = useTheme();

  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [año, setAño] = useState(now.getFullYear());
  const [resumen, setResumen] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    setLoading(true);
    const mesStr = mes.toString().padStart(2, '0');
    const fecha = `${año}-${mesStr}-${now.getDate().toString().padStart(2, '0')}`;
    const result = await ReservaController.obtenerResumenCajaDiario(fecha, profile);
    if (result.success) setResumen((result as any).data);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [mes, año]);

  const cambiarMes = (dir: number) => {
    let nuevoMes = mes + dir;
    let nuevoAño = año;
    if (nuevoMes > 12) { nuevoMes = 1; nuevoAño++; }
    else if (nuevoMes < 1) { nuevoMes = 12; nuevoAño--; }
    setMes(nuevoMes);
    setAño(nuevoAño);
  };

  const metodoLabels: Record<string, string> = {
    efectivo: 'Efectivo',
    transferencia: 'Transferencia',
    tarjeta: 'Tarjeta',
    sin_especificar: 'Sin especificar',
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: colors.text }}>Reportes</h1>

      {/* Selector de mes */}
      <div className="flex items-center justify-between mb-6 bg-white rounded-xl border p-4" style={{ borderColor: colors.border }}>
        <button onClick={() => cambiarMes(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition">
          <ChevronLeft size={20} style={{ color: colors.text }} />
        </button>
        <span className="font-semibold text-lg" style={{ color: colors.text }}>{MESES[mes - 1]} {año}</span>
        <button onClick={() => cambiarMes(1)} className="p-2 rounded-lg hover:bg-gray-100 transition">
          <ChevronRight size={20} style={{ color: colors.text }} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
        </div>
      ) : resumen ? (
        <div className="space-y-4">
          {/* Total recaudado */}
          <div className="bg-white rounded-xl border p-5" style={{ borderColor: colors.border }}>
            <p className="text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Total Recaudado (día actual)</p>
            <p className="text-4xl font-bold" style={{ color: colors.primary }}>${resumen.totalRecaudado?.toFixed(2) || '0.00'}</p>
            <div className="flex gap-4 mt-3">
              <span className="text-sm" style={{ color: colors.textSecondary }}>
                ✅ {resumen.cantidadPagadas || 0} cobradas
              </span>
              <span className="text-sm" style={{ color: colors.textSecondary }}>
                ⏳ {resumen.cantidadPendientes || 0} pendientes
              </span>
            </div>
          </div>

          {/* Desglose por método de pago */}
          {Object.keys(resumen.desglosePagos || {}).length > 0 && (
            <div className="bg-white rounded-xl border p-5" style={{ borderColor: colors.border }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: colors.text }}>Desglose por método de pago</h2>
              <div className="space-y-2">
                {Object.entries(resumen.desglosePagos || {}).map(([metodo, monto]) => (
                  <div key={metodo} className="flex justify-between items-center py-1.5 border-b last:border-0" style={{ borderColor: colors.borderLight }}>
                    <span className="text-sm" style={{ color: colors.text }}>{metodoLabels[metodo] || metodo}</span>
                    <span className="font-semibold text-sm" style={{ color: colors.primary }}>${(monto as number).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transacciones pendientes */}
          {(resumen.transaccionesPendientes || []).length > 0 && (
            <div className="bg-white rounded-xl border p-5" style={{ borderColor: colors.border }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: colors.text }}>Pendientes de cobro</h2>
              <div className="space-y-2">
                {resumen.transaccionesPendientes.map((r: any) => (
                  <div key={r.id} className="flex justify-between items-center py-1.5 border-b last:border-0" style={{ borderColor: colors.borderLight }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: colors.text }}>
                        {r.consultante_nombre || 'Sin nombre'}
                      </p>
                      <p className="text-xs" style={{ color: colors.textSecondary }}>{r.hora_inicio?.substring(0, 5)}</p>
                    </div>
                    <span className="text-sm" style={{ color: colors.warning }}>
                      {r.precio_total ? `$${r.precio_total}` : 'Sin monto'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📊</p>
          <p style={{ color: colors.textSecondary }}>No hay datos disponibles</p>
        </div>
      )}
    </div>
  );
}
