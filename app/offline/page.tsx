/**
 * /offline — Página fallback del Service Worker.
 * Se muestra cuando el usuario no tiene conexión y la página no está cacheada.
 */
export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-[#f8fbff]">
      <div className="text-6xl mb-6">📡</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">sin conexión</h1>
      <p className="text-sm text-gray-500 max-w-xs">
        Parece que no tenés internet en este momento. Revisá tu conexión y volvé a intentarlo.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-8 px-8 py-3 rounded-full text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors"
      >
        reintentar
      </button>
    </div>
  );
}
