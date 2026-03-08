'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/src/config/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';

interface Reserva {
  id: string;
  servicio?: string;
  tipo_sesion?: string;
  fecha?: string;
}

interface Resena {
  id: string;
  calificacion: number;
  comentario?: string;
}

interface ModalResenaProps {
  visible: boolean;
  reserva: Reserva | null;
  resenaExistente: Resena | null;
  onCerrar: () => void;
  onGuardado: () => void;
}

export default function ModalResena({ visible, reserva, resenaExistente, onCerrar, onGuardado }: ModalResenaProps) {
  const { colors } = useTheme();
  const { profile } = useAuth();

  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const esEdicion = !!resenaExistente?.id;

  useEffect(() => {
    if (visible) {
      setEstrellas(resenaExistente?.calificacion || 0);
      setComentario(resenaExistente?.comentario || '');
      setEnviado(false);
    }
  }, [visible, resenaExistente]);

  const handleCerrar = () => {
    setEstrellas(0);
    setComentario('');
    setEnviado(false);
    onCerrar();
  };

  const handlePublicar = async () => {
    if (estrellas === 0) {
      window.alert('Por favor seleccioná una calificación.');
      return;
    }
    setGuardando(true);
    try {
      let error;
      if (esEdicion) {
        ({ error } = await supabase.from('resenas').update({
          calificacion: estrellas,
          comentario: comentario.trim() || null,
        }).eq('id', resenaExistente!.id));
      } else {
        ({ error } = await supabase.from('resenas').insert({
          reserva_id: reserva?.id || null,
          cliente_id: profile?.usuarioId || null,
          empresa_id: profile?.empresaId || null,
          calificacion: estrellas,
          comentario: comentario.trim() || null,
        }));
      }
      if (error) throw error;
      setEnviado(true);
      onGuardado();
    } catch (err) {
      console.error('[ModalResena]', err);
      window.alert('No se pudo guardar la reseña. Intentá de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  if (!visible) return null;

  const ETIQUETAS = ['', 'muy malo', 'malo', 'regular', 'bueno', 'excelente'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: colors.background }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold lowercase" style={{ color: colors.text }}>
            {esEdicion ? 'editar reseña' : 'dejar una reseña'}
          </h2>
          <button onClick={handleCerrar} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100">✕</button>
        </div>

        {enviado ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-xl font-bold lowercase mb-2" style={{ color: colors.text }}>¡gracias por tu reseña!</h3>
            <p className="text-sm lowercase mb-6" style={{ color: colors.textMuted }}>
              tu opinión ayuda a mejorar la experiencia de otros clientes.
            </p>
            <button onClick={handleCerrar}
              className="px-8 py-3 rounded-xl font-bold text-sm lowercase"
              style={{ backgroundColor: colors.primaryFaded, color: colors.primary }}>
              cerrar
            </button>
          </div>
        ) : (
          <>
            {/* Info sesión */}
            {reserva && (
              <div className="flex items-center gap-2 mb-5 px-4 py-3 rounded-xl border" style={{ backgroundColor: colors.surface, borderColor: colors.borderLight }}>
                <span className="text-gray-400">📅</span>
                <span className="text-sm lowercase" style={{ color: colors.textSecondary }}>
                  {reserva.servicio || reserva.tipo_sesion || 'sesión'}
                  {reserva.fecha ? ` · ${reserva.fecha}` : ''}
                </span>
              </div>
            )}

            <p className="text-center text-xs lowercase mb-6" style={{ color: colors.textMuted }}>
              tu opinión se compartirá para mejorar la experiencia
            </p>

            {/* Estrellas */}
            <div className="flex flex-col items-center mb-6 gap-2">
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setEstrellas(n)} className="text-4xl cursor-pointer hover:scale-110 transition-transform">
                    <span style={{ color: n <= estrellas ? colors.primary : colors.borderLight }}>★</span>
                  </button>
                ))}
              </div>
              <span className="text-sm lowercase" style={{ color: colors.textMuted }}>
                {estrellas === 0 ? 'tocá para calificar' : ETIQUETAS[estrellas]}
              </span>
            </div>

            {/* Comentario */}
            <div className="mb-5">
              <label className="block text-xs font-bold uppercase tracking-wide mb-2 lowercase" style={{ color: colors.textSecondary }}>
                tu experiencia
              </label>
              <textarea
                value={comentario}
                onChange={e => setComentario(e.target.value)}
                rows={5}
                placeholder="contanos tu experiencia..."
                className="w-full px-4 py-3 rounded-xl border text-sm resize-none focus:outline-none"
                style={{ borderColor: colors.borderLight, backgroundColor: colors.surface, color: colors.text }}
              />
            </div>

            {/* Botón */}
            <button
              onClick={handlePublicar}
              disabled={guardando}
              className="w-full py-3 rounded-xl font-bold text-sm text-white lowercase disabled:opacity-60"
              style={{ backgroundColor: colors.primary }}
            >
              {guardando ? 'guardando...' : esEdicion ? 'guardar cambios' : 'publicar reseña'}
            </button>

            <p className="text-center text-xs mt-4 opacity-40" style={{ color: colors.textMuted }}>
              mensana · progreso gentil
            </p>
          </>
        )}
      </div>
    </div>
  );
}
