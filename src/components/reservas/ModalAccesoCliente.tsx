'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/src/context/ThemeContext';
import { X, Copy, CheckCheck, Smartphone, Globe, MessageCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  clienteId: string;
  clienteNombre: string;
  clienteTelefono?: string;
  empresaId: string;
}

interface AccesoData {
  webUrl: string;
  email: string;
  passwordTemporal: string;
  qrDataUrl: string;
}

export default function ModalAccesoCliente({
  open,
  onClose,
  clienteId,
  clienteNombre,
  clienteTelefono,
  empresaId,
}: Props) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [datos, setDatos] = useState<AccesoData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<'email' | 'password' | 'url' | null>(null);

  useEffect(() => {
    if (!open || !clienteId || !empresaId) return;
    setDatos(null);
    setError(null);
    setLoading(true);

    fetch('/api/admin/cliente-acceso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clienteId, empresaId }),
    })
      .then(r => r.json())
      .then(json => {
        if (json.error) setError(json.error);
        else setDatos(json);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, clienteId, empresaId]);

  const copiar = async (texto: string, tipo: 'email' | 'password' | 'url') => {
    await navigator.clipboard.writeText(texto);
    setCopiado(tipo);
    setTimeout(() => setCopiado(null), 2000);
  };

  const enviarWhatsApp = () => {
    if (!datos || !clienteTelefono) return;
    const tel = clienteTelefono.replace(/\D/g, '');
    const msg =
      `Hola ${clienteNombre}! 👋\n\n` +
      `Te compartimos tus datos de acceso a la app:\n\n` +
      `🌐 Web: ${datos.webUrl}\n` +
      `📧 Email: ${datos.email}\n` +
      `🔑 Contraseña: ${datos.passwordTemporal}\n\n` +
      `Podés escanear el QR o ingresar directamente con estos datos.\n` +
      `Te recomendamos cambiar la contraseña la primera vez que ingreses.`;
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-2xl w-full max-w-sm flex flex-col overflow-hidden"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: colors.borderLight }}
        >
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition">
            <X size={18} style={{ color: colors.textSecondary }} />
          </button>
          <h2 className="flex-1 text-center text-sm font-bold lowercase" style={{ color: colors.text }}>
            acceso a la app · {clienteNombre}
          </h2>
          <div className="w-8" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5 space-y-5">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-10">
              <div
                className="animate-spin rounded-full h-8 w-8 border-b-2"
                style={{ borderColor: colors.primary }}
              />
              <p className="text-sm lowercase" style={{ color: colors.textSecondary }}>
                generando acceso...
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-xl p-4 text-sm text-red-700 bg-red-50">
              {error}
            </div>
          )}

          {datos && (
            <>
              {/* QR para smartphone */}
              <section className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <Smartphone size={14} style={{ color: colors.primary }} />
                  <p className="text-xs font-semibold lowercase" style={{ color: colors.primary }}>
                    escanear con smartphone
                  </p>
                </div>
                <img
                  src={datos.qrDataUrl}
                  alt="QR acceso"
                  className="rounded-xl border"
                  style={{ width: 200, height: 200, borderColor: colors.borderLight }}
                />
                <p className="text-[11px] text-center lowercase" style={{ color: colors.textMuted }}>
                  el cliente escanea este QR y accede a la web de la empresa
                </p>
              </section>

              {/* Datos de acceso */}
              <section className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Globe size={14} style={{ color: colors.primary }} />
                  <p className="text-xs font-semibold lowercase" style={{ color: colors.primary }}>
                    datos de acceso
                  </p>
                </div>

                {/* Web URL */}
                <CampoCopia
                  label="web"
                  valor={datos.webUrl}
                  copiado={copiado === 'url'}
                  onCopiar={() => copiar(datos.webUrl, 'url')}
                  colors={colors}
                />

                {/* Email */}
                <CampoCopia
                  label="email"
                  valor={datos.email}
                  copiado={copiado === 'email'}
                  onCopiar={() => copiar(datos.email, 'email')}
                  colors={colors}
                />

                {/* Password */}
                <CampoCopia
                  label="contraseña temporal"
                  valor={datos.passwordTemporal}
                  copiado={copiado === 'password'}
                  onCopiar={() => copiar(datos.passwordTemporal, 'password')}
                  colors={colors}
                />
              </section>

              <p className="text-[11px] text-center lowercase italic" style={{ color: colors.textMuted }}>
                el cliente puede cambiar la contraseña desde su perfil
              </p>

              {/* WhatsApp */}
              {clienteTelefono && (
                <button
                  onClick={enviarWhatsApp}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition"
                >
                  <MessageCircle size={16} />
                  enviar datos por whatsapp
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CampoCopia({
  label,
  valor,
  copiado,
  onCopiar,
  colors,
}: {
  label: string;
  valor: string;
  copiado: boolean;
  onCopiar: () => void;
  colors: any;
}) {
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5"
      style={{ background: colors.primaryFaded }}
    >
      <div className="min-w-0">
        <p className="text-[10px] lowercase" style={{ color: colors.textMuted }}>
          {label}
        </p>
        <p className="text-sm font-medium truncate" style={{ color: colors.text }}>
          {valor}
        </p>
      </div>
      <button
        onClick={onCopiar}
        className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/60 transition"
      >
        {copiado ? (
          <CheckCheck size={15} style={{ color: colors.primary }} />
        ) : (
          <Copy size={15} style={{ color: colors.textSecondary }} />
        )}
      </button>
    </div>
  );
}
