'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/src/context/ThemeContext';
import { supabase } from '@/src/config/supabase';
import { MapPin, Search, Loader2 } from 'lucide-react';

export default function ExplorarProfesionalesPage() {
  const { colors } = useTheme();

  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [locationError, setLocationError] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const { latitude, longitude } = pos.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          cargarCercanas(latitude, longitude);
        },
        () => {
          setLocationError('No se pudo obtener tu ubicación. Mostrando todos los centros.');
          cargarTodas();
        }
      );
    } else {
      setLocationError('Tu navegador no soporta geolocalización.');
      cargarTodas();
    }
  }, []);

  const cargarCercanas = async (lat: number, lng: number) => {
    setLoading(true);
    const { data, error } = await supabase.rpc('buscar_empresas_cercanas', {
      p_lat: lat, p_lng: lng, p_radius_meters: 5000,
    });
    if (!error && data) {
      setEmpresas(data);
    } else {
      cargarTodas();
      return;
    }
    setLoading(false);
  };

  const cargarTodas = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('empresas')
      .select('id, nombre, descripcion, logo_url, direccion, color_primary')
      .eq('activo', true)
      .order('nombre');
    if (data) setEmpresas(data);
    setLoading(false);
  };

  const empresasFiltradas = empresas.filter(e =>
    e.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-1" style={{ color: colors.text }}>Explorar Profesionales</h1>

      {locationError && (
        <p className="text-sm mb-3" style={{ color: colors.warning }}>{locationError}</p>
      )}

      {/* Búsqueda */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar centros o profesionales..."
          className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          style={{ borderColor: colors.border }}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin" style={{ color: colors.primary }} />
        </div>
      ) : empresasFiltradas.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p style={{ color: colors.textSecondary }}>No se encontraron centros</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {empresasFiltradas.map(e => (
            <div
              key={e.id}
              className="bg-white rounded-2xl border overflow-hidden hover:shadow-md transition cursor-pointer"
              style={{ borderColor: colors.border }}
            >
              {/* Banner con color de empresa */}
              <div
                className="h-24 flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${e.color_primary || colors.primary}, ${colors.secondary})` }}
              >
                {e.logo_url ? (
                  <img src={e.logo_url} alt={e.nombre} className="h-12 w-12 rounded-full object-cover border-2 border-white" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-white/30 flex items-center justify-center text-white text-xl font-bold">
                    {e.nombre?.charAt(0)}
                  </div>
                )}
              </div>

              <div className="p-4">
                <p className="font-semibold" style={{ color: colors.text }}>{e.nombre}</p>
                {e.descripcion && (
                  <p className="text-sm mt-1 line-clamp-2" style={{ color: colors.textSecondary }}>{e.descripcion}</p>
                )}
                {(e.distancia_metros || e.direccion) && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <MapPin size={12} style={{ color: colors.primary }} />
                    <span className="text-xs" style={{ color: colors.textSecondary }}>
                      {e.distancia_metros ? `${(e.distancia_metros / 1000).toFixed(1)} km` : e.direccion}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
