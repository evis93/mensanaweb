'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { DatabaseService } from '@/src/services/database.service';
import { TrendingUp, ChevronLeft, ChevronRight, Clock, Users, Sparkles, Eye, EyeOff, LoaderCircle } from 'lucide-react';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function AdminPage() {
  const { colors } = useTheme();
  const { profile, loading } = useAuth();

  const now = new Date();
  const [dia, setDia] = useState(now.getDate());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [año, setAño] = useState(now.getFullYear());
  const [totalDia, setTotalDia] = useState(0);
  const [totalMes, setTotalMes] = useState(0);
  const [diasConIngresos, setDiasConIngresos] = useState<number[]>([]);

  const terapeutaId = profile?.profesionalId;

  useEffect(() => {
    if (!terapeutaId) return;
    const mesStr = mes.toString().padStart(2, '0');
    const diaStr = dia.toString().padStart(2, '0');
    const fecha = `${año}-${mesStr}-${diaStr}`;

    DatabaseService.query('reservas', {
      select: 'precio_total',
      filters: [
        { field: 'profesional_id', operator: 'eq', value: terapeutaId },
        { field: 'fecha', operator: 'eq', value: fecha },
      ],
    }).then(result => {
      if (result.success) {
        const total = ((result as any).data as any[])
          .filter(r => r.precio_total && parseFloat(r.precio_total) > 0)
          .reduce((sum: number, r: any) => sum + parseFloat(r.precio_total), 0);
        setTotalDia(total);
      }
    });
  }, [dia, mes, año, terapeutaId]);

  useEffect(() => {
    if (!terapeutaId) return;
    const mesStr = mes.toString().padStart(2, '0');
    const ultimoDia = new Date(año, mes, 0).getDate();
    const inicio = `${año}-${mesStr}-01`;
    const fin = `${año}-${mesStr}-${ultimoDia.toString().padStart(2, '0')}`;

    DatabaseService.query('reservas', {
      select: 'precio_total, fecha',
      filters: [
        { field: 'profesional_id', operator: 'eq', value: terapeutaId },
        { field: 'fecha', operator: 'gte', value: inicio },
        { field: 'fecha', operator: 'lte', value: fin },
      ],
    }).then(result => {
      if (result.success) {
        const conMonto = ((result as any).data as any[]).filter(r => r.precio_total && parseFloat(r.precio_total) > 0);
        setTotalMes(conMonto.reduce((sum: number, r: any) => sum + parseFloat(r.precio_total), 0));
        const dias = conMonto.map((r: any) => parseInt(r.fecha.split('-')[2], 10));
        setDiasConIngresos([...new Set(dias)]);
      }
    });
  }, [mes, año, terapeutaId]);

  const cambiarMes = (dir: number) => {
    let nuevoMes = mes + dir;
    let nuevoAño = año;
    if (nuevoMes > 12) { nuevoMes = 1; nuevoAño++; }
    else if (nuevoMes < 1) { nuevoMes = 12; nuevoAño--; }
    setMes(nuevoMes);
    setAño(nuevoAño);
    const ultimoDia = new Date(nuevoAño, nuevoMes, 0).getDate();
    if (dia > ultimoDia) setDia(ultimoDia);
  };

  const diasDelMes = Array.from({ length: new Date(año, mes, 0).getDate() }, (_, i) => i + 1);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: colors.text }}>
        Administración
        {loading && <LoaderCircle size={16} className="animate-spin inline ml-2" />}
      </h1>

      {/* Totales */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border" style={{ borderColor: colors.border }}>
          <p className="text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
            Total del día {dia}
          </p>
          <p className="text-3xl font-bold" style={{ color: colors.primary }}>
            ${totalDia.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border" style={{ borderColor: colors.border }}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} style={{ color: colors.primary }} />
            <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>
              Total del mes
            </p>
          </div>
          <p className="text-3xl font-bold" style={{ color: colors.primary }}>
            ${totalMes.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Selector de mes + mini calendario */}
      <div className="bg-white rounded-xl p-5 shadow-sm border mb-6" style={{ borderColor: colors.border }}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => cambiarMes(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition">
            <ChevronLeft size={20} style={{ color: colors.text }} />
          </button>
          <span className="font-semibold text-lg" style={{ color: colors.text }}>
            {MESES[mes - 1]} {año}
          </span>
          <button onClick={() => cambiarMes(1)} className="p-2 rounded-lg hover:bg-gray-100 transition">
            <ChevronRight size={20} style={{ color: colors.text }} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {diasDelMes.map(d => {
            const tieneIngreso = diasConIngresos.includes(d);
            const isSelected = d === dia;
            return (
              <button
                key={d}
                onClick={() => setDia(d)}
                className="aspect-square rounded-lg text-sm font-medium transition-all flex items-center justify-center"
                style={{
                  background: isSelected ? colors.primary : tieneIngreso ? '#dcfce7' : 'transparent',
                  color: isSelected ? '#fff' : tieneIngreso ? '#15803d' : colors.text,
                  border: tieneIngreso && !isSelected ? '1px solid #22c55e' : '1px solid transparent',
                }}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="bg-white rounded-xl p-5 shadow-sm border" style={{ borderColor: colors.border }}>
        <h2 className="text-base font-semibold mb-4" style={{ color: colors.text }}>Configuración rápida</h2>
        <div className="space-y-1">
          {[
            { href: '/admin/horarios', icon: <Clock size={18} />, label: 'Horarios de Atención' },
            { href: '/admin/profesionales', icon: <Users size={18} />, label: 'Profesionales' },
            { href: '/admin/servicios', icon: <Sparkles size={18} />, label: 'Servicios' },
          ].map(item => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 transition group"
            >
              <span style={{ color: colors.primary }}>{item.icon}</span>
              <span className="flex-1 text-sm font-medium" style={{ color: colors.text }}>
                {item.label}
              </span>
              <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600 transition" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
