'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { ReservaClienteController } from '@/src/controllers/ReservaClienteController';

const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function getLunesDeSemana(fecha: Date) {
  const d = new Date(fecha);
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fechaISO(date: Date) {
  return date.toISOString().split('T')[0];
}

function formatearFechaLarga(date: Date) {
  return `${DIAS_CORTO[date.getDay()]} ${date.getDate()} de ${MESES[date.getMonth()]}`;
}

export default function ReservarPage() {
  const router = useRouter();
  const { profile, logout } = useAuth();
  const { colors } = useTheme();

  const color = profile?.colorPrimario || colors.primary;

  const [profesionales, setProfesionales] = useState<any[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);
  const [profSeleccionado, setProfSeleccionado] = useState<any>(null);
  const [servicioSeleccionado, setServicioSeleccionado] = useState<any>(null);
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date>(() => {
    const hoy = new Date(); hoy.setHours(0,0,0,0); return hoy;
  });
  const [slotSeleccionado, setSlotSeleccionado] = useState<string | null>(null);
  const [slotsDisponibles, setSlotsDisponibles] = useState<{ manana: string[]; tarde: string[] }>({ manana: [], tarde: [] });
  const [cargandoSlots, setCargandoSlots] = useState(false);
  const [sinHorario, setSinHorario] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const lunesBase = getLunesDeSemana(hoy);
  lunesBase.setDate(lunesBase.getDate() + semanaOffset * 7);
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunesBase); d.setDate(lunesBase.getDate() + i); return d;
  });
  const mesAnio = `${MESES[lunesBase.getMonth()]} ${lunesBase.getFullYear()}`;

  useEffect(() => {
    async function cargarDatos() {
      if (!profile?.empresaId) return;
      setCargandoDatos(true);
      const [resProf, resSvc] = await Promise.all([
        (ReservaClienteController as any).obtenerProfesionalesEmpresa(profile.empresaId),
        (ReservaClienteController as any).obtenerServiciosEmpresa(profile.empresaId),
      ]);
      if (resProf.success && resProf.data.length > 0) {
        setProfesionales(resProf.data);
        setProfSeleccionado(resProf.data[0]);
      }
      if (resSvc.success) {
        setServicios(resSvc.data);
        if (resSvc.data.length > 0) setServicioSeleccionado(resSvc.data[0]);
      }
      setCargandoDatos(false);
    }
    cargarDatos();
  }, [profile?.empresaId]);

  useEffect(() => {
    const profId = profSeleccionado?.id;
    if (!profId || !profile?.empresaId || !diaSeleccionado) return;
    let cancelado = false;

    async function cargarSlots() {
      setCargandoSlots(true);
      setSlotsDisponibles({ manana: [], tarde: [] });
      setSinHorario(false);
      setSlotSeleccionado(null);

      const diaSemana = diaSeleccionado.getDay();
      const fechaStr = fechaISO(diaSeleccionado);

      const [resHorarios, resOcupados] = await Promise.all([
        (ReservaClienteController as any).obtenerHorariosDelDia(profId, diaSemana),
        (ReservaClienteController as any).obtenerSlotsOcupados(profId, fechaStr),
      ]);

      if (cancelado) return;
      if (resHorarios.success && resHorarios.data.length > 0) {
        const { manana, tarde } = (ReservaClienteController as any).calcularSlotsDisponibles(
          resHorarios.data, resOcupados.success ? resOcupados.data : []
        );
        setSlotsDisponibles({ manana, tarde });
      } else {
        setSinHorario(true);
      }
      setCargandoSlots(false);
    }

    cargarSlots();
    return () => { cancelado = true; };
  }, [profSeleccionado?.id, profile?.empresaId, diaSeleccionado.getTime()]); // eslint-disable-line

  const handleSolicitar = async () => {
    if (!profSeleccionado || !slotSeleccionado || !diaSeleccionado) return;
    setEnviando(true);
    const res = await (ReservaClienteController as any).solicitarReserva({
      empresaId: profile!.empresaId,
      profesionalId: profSeleccionado.id,
      clienteId: profile!.usuarioId,
      servicioId: servicioSeleccionado?.id || null,
      fecha: fechaISO(diaSeleccionado),
      horaInicio: slotSeleccionado,
    });
    setEnviando(false);
    if (res.success) {
      window.alert('¡Solicitud enviada! Tu turno fue solicitado. El centro lo confirmará a la brevedad.');
      router.replace('/cliente');
    } else {
      window.alert('Error: ' + (res.error || 'No se pudo enviar la solicitud.'));
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('¿cerrar sesión?')) return;
    await logout();
    router.replace('/auth/login');
  };

  const puedeEnviar = profSeleccionado && slotSeleccionado && diaSeleccionado && !enviando;
  const resumenFecha = diaSeleccionado ? formatearFechaLarga(diaSeleccionado) : '—';
  const resumenPrecio = servicioSeleccionado?.precio
    ? `$${Number(servicioSeleccionado.precio).toLocaleString('es-AR')}` : null;

  if (cargandoDatos) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ backgroundColor: '#f8fbff' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: color }} />
        <p className="text-sm text-gray-400">Cargando información...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f8fbff' }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 text-white" style={{ backgroundColor: color }}>
        <button onClick={() => router.replace('/cliente')} className="text-white text-xl">‹</button>
        <h1 className="text-base font-bold">{profile?.empresaNombre || 'Reservar turno'}</h1>
      </header>

      <div className="flex-1 overflow-y-auto pb-48">
        {/* Profesionales */}
        <div className="px-5 py-4 border-b border-blue-50">
          <p className="text-base font-bold text-gray-800 mb-3">Seleccioná un profesional</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {profesionales.map(prof => {
              const activo = profSeleccionado?.id === prof.id;
              return (
                <button key={prof.id}
                  onClick={() => { setProfSeleccionado(prof); setSlotSeleccionado(null); }}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full border-2 text-sm font-bold transition-colors"
                  style={activo
                    ? { backgroundColor: color, borderColor: color, color: '#fff' }
                    : { backgroundColor: '#fff', borderColor: '#d0e8f5', color: '#475569' }}>
                  👤 {prof.nombre_completo}
                </button>
              );
            })}
            {profesionales.length === 0 && <p className="text-sm text-gray-400">Sin profesionales disponibles</p>}
          </div>
        </div>

        {/* Servicios */}
        {servicios.length > 0 && (
          <div className="px-5 py-4 border-b border-blue-50">
            <p className="text-base font-bold text-gray-800 mb-3">Seleccioná un servicio</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {servicios.map(svc => {
                const activo = servicioSeleccionado?.id === svc.id;
                return (
                  <button key={svc.id}
                    onClick={() => setServicioSeleccionado(svc)}
                    className="flex-shrink-0 px-3.5 py-2 rounded-full border-2 text-sm font-bold transition-colors"
                    style={activo
                      ? { backgroundColor: color, borderColor: color, color: '#fff' }
                      : { backgroundColor: '#fff', borderColor: '#d0e8f5', color: '#475569' }}>
                    {svc.nombre}{svc.precio ? `  ·  $${Number(svc.precio).toLocaleString('es-AR')}` : ''}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Calendario semanal */}
        <div className="px-5 py-4 border-b border-blue-50">
          <div className="flex items-center justify-between mb-3">
            <p className="text-base font-bold text-gray-800">{mesAnio}</p>
            <div className="flex gap-1">
              <button
                onClick={() => setSemanaOffset(o => Math.max(0, o - 1))}
                disabled={semanaOffset === 0}
                className="w-8 h-8 rounded-full bg-white border flex items-center justify-center text-gray-600 disabled:opacity-30"
                style={{ borderColor: '#e0eef8' }}>‹</button>
              <button
                onClick={() => setSemanaOffset(o => o + 1)}
                className="w-8 h-8 rounded-full bg-white border flex items-center justify-center text-gray-600"
                style={{ borderColor: '#e0eef8' }}>›</button>
            </div>
          </div>
          <div className="flex gap-1 bg-white rounded-2xl p-2 border border-blue-50">
            {diasSemana.map(dia => {
              const esHoy = fechaISO(dia) === fechaISO(hoy);
              const esPasado = dia < hoy;
              const seleccionado = fechaISO(dia) === fechaISO(diaSeleccionado);
              return (
                <button key={dia.toISOString()}
                  disabled={esPasado}
                  onClick={() => { if (!esPasado) { setDiaSeleccionado(dia); setSlotSeleccionado(null); } }}
                  className="flex-1 flex flex-col items-center py-2 rounded-xl transition-colors"
                  style={seleccionado ? { backgroundColor: color } : esPasado ? { opacity: 0.3 } : {}}>
                  <span className="text-xs font-bold uppercase"
                    style={{ color: seleccionado ? '#fff' : '#94a3b8' }}>
                    {DIAS_CORTO[dia.getDay()]}
                  </span>
                  <span className="text-base font-bold"
                    style={{ color: seleccionado ? '#fff' : esHoy ? color : '#1a2b3c' }}>
                    {dia.getDate()}
                  </span>
                  {esHoy && !seleccionado && (
                    <span className="w-1 h-1 rounded-full mt-0.5" style={{ backgroundColor: color }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Slots */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <span style={{ color: color }}>🕐</span>
            <p className="text-base font-bold text-gray-800">Horarios disponibles</p>
          </div>

          {cargandoSlots ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: color }} />
            </div>
          ) : sinHorario ? (
            <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
              <span className="text-4xl opacity-30">📅</span>
              <p className="text-sm">El profesional no atiende este día</p>
            </div>
          ) : slotsDisponibles.manana.length === 0 && slotsDisponibles.tarde.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
              <span className="text-4xl opacity-30">📅</span>
              <p className="text-sm">No hay turnos disponibles para este día</p>
            </div>
          ) : (
            <>
              {slotsDisponibles.manana.length > 0 && (
                <>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Mañana</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {slotsDisponibles.manana.map(slot => {
                      const activo = slotSeleccionado === slot;
                      return (
                        <button key={slot}
                          onClick={() => setSlotSeleccionado(slot)}
                          className="w-[30%] h-11 rounded-xl border-2 text-sm font-bold transition-colors"
                          style={activo
                            ? { backgroundColor: color, borderColor: color, color: '#fff' }
                            : { backgroundColor: '#fff', borderColor: '#d0e8f5', color: '#1a2b3c' }}>
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {slotsDisponibles.tarde.length > 0 && (
                <>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Tarde</p>
                  <div className="flex flex-wrap gap-2">
                    {slotsDisponibles.tarde.map(slot => {
                      const activo = slotSeleccionado === slot;
                      return (
                        <button key={slot}
                          onClick={() => setSlotSeleccionado(slot)}
                          className="w-[30%] h-11 rounded-xl border-2 text-sm font-bold transition-colors"
                          style={activo
                            ? { backgroundColor: color, borderColor: color, color: '#fff' }
                            : { backgroundColor: '#fff', borderColor: '#d0e8f5', color: '#1a2b3c' }}>
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {slotSeleccionado && (
            <div className="mt-4 flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
              <span>ℹ️</span>
              <p className="text-xs text-yellow-800">
                Tu reserva quedará <strong>pendiente de confirmación</strong> por parte del centro.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer fijo */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-5 py-4 space-y-3" style={{ borderColor: '#e1f5fe' }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Resumen de turno</p>
            <p className="text-sm font-bold text-gray-800 mt-0.5">{resumenFecha} · {slotSeleccionado || '—'}</p>
            {profSeleccionado && <p className="text-xs text-gray-500">{profSeleccionado.nombre_completo}</p>}
          </div>
          {resumenPrecio && (
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Precio</p>
              <p className="text-base font-bold" style={{ color }}>{resumenPrecio}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleSolicitar}
          disabled={!puedeEnviar}
          className="w-full py-4 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ backgroundColor: color }}>
          {enviando ? <span className="animate-spin">⏳</span> : '📅'} Solicitar Reserva
        </button>
        <div className="flex justify-between text-xs text-gray-400">
          <button onClick={() => router.replace('/cliente')}>‹ volver</button>
          <button onClick={handleLogout} className="text-red-400">salir</button>
        </div>
      </div>
    </div>
  );
}
