'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { ReservaController } from '@/src/controllers/ReservaController';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function AgendaMensualPage() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [año, setAño] = useState(now.getFullYear());
  const [fechasConReservas, setFechasConReservas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    const mesStr = mes.toString().padStart(2, '0');
    const ultimoDia = new Date(año, mes, 0).getDate();
    const inicio = `${año}-${mesStr}-01`;
    const fin = `${año}-${mesStr}-${ultimoDia.toString().padStart(2, '0')}`;

    const result = await ReservaController.obtenerFechasConReservas(inicio, fin, profile?.profesionalId, profile);
    if (result.success) {
      setFechasConReservas(new Set(((result as any).data as any[]).map((r: any) => r.fecha)));
    }
    setLoading(false);
  }, [mes, año, profile]);

  useEffect(() => { cargar(); }, [cargar]);

  const cambiarMes = (dir: number) => {
    let nuevoMes = mes + dir;
    let nuevoAño = año;
    if (nuevoMes > 12) { nuevoMes = 1; nuevoAño++; }
    else if (nuevoMes < 1) { nuevoMes = 12; nuevoAño--; }
    setMes(nuevoMes);
    setAño(nuevoAño);
  };

  const primerDia = new Date(año, mes - 1, 1).getDay();
  const ultimoDia = new Date(año, mes, 0).getDate();
  const hoy = new Date().toISOString().split('T')[0];

  const celdas = Array.from({ length: primerDia + ultimoDia }, (_, i) => {
    if (i < primerDia) return null;
    const d = i - primerDia + 1;
    const fecha = `${año}-${mes.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    return { dia: d, fecha };
  });

  const irAAgenda = (fecha: string) => {
    router.push(`/profesional/agenda?fecha=${fecha}`);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: colors.text }}>Agenda Mensual</h1>

      <div className="bg-white rounded-xl border p-5 shadow-sm" style={{ borderColor: colors.border }}>
        {/* Selector de mes */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => cambiarMes(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition">
            <ChevronLeft size={20} style={{ color: colors.text }} />
          </button>
          <span className="font-semibold text-lg" style={{ color: colors.text }}>{MESES[mes - 1]} {año}</span>
          <button onClick={() => cambiarMes(1)} className="p-2 rounded-lg hover:bg-gray-100 transition">
            <ChevronRight size={20} style={{ color: colors.text }} />
          </button>
        </div>

        {/* Encabezados de días */}
        <div className="grid grid-cols-7 mb-2">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="text-center text-xs font-medium py-1" style={{ color: colors.textSecondary }}>{d}</div>
          ))}
        </div>

        {/* Grilla de días */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2" style={{ borderColor: colors.primary }} />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {celdas.map((celda, i) => {
              if (!celda) return <div key={`empty-${i}`} />;
              const tieneReservas = fechasConReservas.has(celda.fecha);
              const esHoy = celda.fecha === hoy;
              return (
                <button
                  key={celda.fecha}
                  onClick={() => irAAgenda(celda.fecha)}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-all hover:opacity-90 relative"
                  style={{
                    background: esHoy ? colors.primary : tieneReservas ? colors.primaryFaded : 'transparent',
                    color: esHoy ? '#fff' : tieneReservas ? colors.primary : colors.text,
                    border: tieneReservas && !esHoy ? `1px solid ${colors.primaryLight}` : '1px solid transparent',
                  }}
                >
                  {celda.dia}
                  {tieneReservas && !esHoy && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ background: colors.primary }} />
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-4 mt-4 pt-4 border-t" style={{ borderColor: colors.borderLight }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: colors.textSecondary }}>
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: colors.primary }} />
            Hoy
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: colors.textSecondary }}>
            <span className="w-3 h-3 rounded-full inline-block border" style={{ background: colors.primaryFaded, borderColor: colors.primaryLight }} />
            Con reservas
          </div>
        </div>
      </div>
    </div>
  );
}
