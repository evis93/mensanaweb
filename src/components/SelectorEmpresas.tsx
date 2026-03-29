'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useUserEmpresas, type UserEmpresa } from '../hooks/useUserEmpresas';

const ROL_LABEL: Record<string, string> = {
  superadmin: 'administrador general',
  admin: 'administrador',
  profesional: 'profesional de salud',
  cliente: 'consultante',
};

function rutaPorRol(rol: string): string {
  if (rol === 'admin' || rol === 'superadmin') return '/admin';
  if (rol === 'profesional') return '/profesional/agenda';
  return '/cliente';
}

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' }}>
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#43b9e5]" />
    </div>
  );
}

function EmpresaAvatar({ empresa }: { empresa: UserEmpresa }) {
  if (empresa.logoUrl) {
    return (
      <img
        src={empresa.logoUrl}
        alt={empresa.empresaNombre}
        className="w-full h-full object-cover"
      />
    );
  }
  // Fallback: inicial con color de la empresa
  const bg = empresa.colorPrimario || '#43b9e5';
  return (
    <div
      className="w-full h-full flex items-center justify-center text-white font-bold text-xl"
      style={{ backgroundColor: bg }}
    >
      {empresa.empresaNombre.charAt(0).toUpperCase()}
    </div>
  );
}

export default function SelectorEmpresas() {
  const router = useRouter();
  const { profile, loading: authLoading, setActiveEmpresa, logout } = useAuth();
  const { empresas, loading: empresasLoading } = useUserEmpresas();

  if (authLoading || empresasLoading) return <Spinner />;

  const handleSeleccionar = (empresa: UserEmpresa) => {
    setActiveEmpresa({
      empresaId: empresa.empresaId,
      empresaNombre: empresa.empresaNombre,
      rol: empresa.rol,
      colorPrimario: empresa.colorPrimario ?? undefined,
      colorSecundario: empresa.colorSecundario ?? undefined,
      colorBackground: empresa.colorBackground ?? undefined,
      logoUrl: empresa.logoUrl ?? undefined,
    });
    router.replace(rutaPorRol(empresa.rol));
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login');
  };

  const nombreCorto = profile?.nombre_completo?.split(' ')[0]?.toLowerCase() || '';

  return (
    <div
      className="min-h-screen flex flex-col items-center px-6 py-12 md:py-20"
      style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' }}
    >
      {/* Header */}
      <header className="w-full max-w-md mb-12 text-center">
        <h1 className="text-2xl font-bold tracking-tight lowercase mb-2" style={{ color: '#43b9e5' }}>
          mensana
        </h1>
        <div className="h-1 w-8 mx-auto rounded-full" style={{ backgroundColor: 'rgba(67,185,229,0.2)' }} />
      </header>

      <main className="w-full max-w-md space-y-8">
        {/* Saludo */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-semibold leading-tight tracking-tight lowercase" style={{ color: '#121616' }}>
            {nombreCorto ? `hola ${nombreCorto}, ` : ''}¿a qué centro deseas ingresar?
          </h2>
          <p className="text-sm font-normal lowercase tracking-wide" style={{ color: '#6a8180' }}>
            seleccioná el espacio donde querés trabajar hoy
          </p>
        </div>

        {/* Lista de empresas */}
        <div className="space-y-4">
          {empresas.length === 0 ? (
            <p className="text-center text-sm lowercase" style={{ color: '#6a8180' }}>
              no tenés empresas asignadas
            </p>
          ) : (
            empresas.map(empresa => (
              <button
                key={empresa.empresaId}
                onClick={() => handleSeleccionar(empresa)}
                className="w-full group relative bg-white p-5 rounded-lg flex items-center gap-5 border border-transparent text-left transition-all duration-300"
                style={{
                  boxShadow: '0 10px 25px -5px rgba(67,185,229,0.1), 0 8px 10px -6px rgba(67,185,229,0.05)',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(67,185,229,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div
                    className="size-16 rounded-full overflow-hidden flex items-center justify-center"
                    style={{ border: '1px solid #e2e8f0', backgroundColor: '#f9fafb' }}
                  >
                    <EmpresaAvatar empresa={empresa} />
                  </div>
                  {/* Badge de tipo de app */}
                  <div
                    className="absolute -bottom-1 -right-1 size-5 rounded-full border-2 border-white flex items-center justify-center text-white"
                    style={{ backgroundColor: empresa.appType === 'tusturnos' ? '#6366f1' : '#43b9e5' }}
                    title={empresa.appType}
                  >
                    <span style={{ fontSize: 9, fontWeight: 700 }}>
                      {empresa.appType === 'tusturnos' ? 'TT' : 'M'}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 overflow-hidden">
                  <h3
                    className="font-semibold text-lg leading-tight lowercase truncate"
                    style={{ color: '#121616' }}
                  >
                    {empresa.empresaNombre}
                  </h3>
                  <p className="text-sm lowercase mt-0.5" style={{ color: '#6a8180' }}>
                    {ROL_LABEL[empresa.rol] || empresa.rol}
                  </p>
                </div>

                {/* Chevron */}
                <span
                  className="material-symbols-outlined transition-colors"
                  style={{ color: '#6a8180' }}
                >
                  chevron_right
                </span>
              </button>
            ))
          )}
        </div>

        {/* Acciones inferiores */}
        <footer className="pt-12 text-center">
          <div className="pt-4 flex items-center justify-center gap-8">
            <button
              onClick={handleLogout}
              className="flex flex-col items-center gap-1 group"
            >
              <div
                className="size-10 rounded-full bg-white flex items-center justify-center transition-colors"
                style={{
                  boxShadow: '0 10px 25px -5px rgba(67,185,229,0.1)',
                  color: '#6a8180',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#f87171')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#6a8180')}
              >
                <span className="material-symbols-outlined">logout</span>
              </div>
              <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: '#6a8180' }}>
                salir
              </span>
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}
