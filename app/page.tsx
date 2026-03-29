'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/src/context/AuthContext';
import { usePostLoginRouter } from '@/src/hooks/usePostLoginRouter';

export default function HomePage() {
  const { profile, loading } = useAuth();

  // Routing inteligente post-login según empresas y roles del usuario
  const { resolving } = usePostLoginRouter();

  // Mientras verifica sesión o está resolviendo destino, mostrar spinner
  if (loading || resolving || profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fbff]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Sin sesión → home pública de Mensana
  return (
    <div className="antialiased" style={{ backgroundColor: '#f8fbff', color: '#333', fontFamily: 'Manrope, sans-serif' }}>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-blue-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#3498db,#2980b9)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-slate-800" style={{ letterSpacing: '-0.02em' }}>mensana</span>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            {['inicio', 'novedades', 'profesionales', 'centros'].map(item => (
              <a key={item} href="#" className="text-slate-600 hover:text-blue-500 transition text-[0.95rem]">{item}</a>
            ))}
          </div>

          <div className="flex items-center space-x-3">
            <Link href="/auth/login" className="px-5 py-2 text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition text-sm font-medium">
              iniciar sesión
            </Link>
            <Link href="/auth/register" className="px-5 py-2 text-white rounded-xl shadow-lg shadow-blue-100 hover:opacity-90 transition text-sm font-semibold" style={{ background: 'linear-gradient(135deg,#3498db,#2980b9)' }}>
              comenzar gratis
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-12 pb-20 lg:pt-24 lg:pb-32" style={{ background: 'linear-gradient(to bottom,#f8fbff,#e1f5fe)' }}>
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight text-slate-800">
                tu camino hacia el{' '}
                <span style={{ background: 'linear-gradient(135deg,#3498db,#00d2ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  bienestar integral
                </span>{' '}
                comienza aquí
              </h1>
              <p className="text-lg text-gray-500 max-w-lg leading-relaxed">
                conecta con los mejores profesionales y centros de salud mental y física cerca de ti. una plataforma diseñada para tu calma y crecimiento personal.
              </p>
              <div className="flex items-center space-x-4">
                <Link href="/auth/register" className="px-8 py-4 text-white rounded-xl text-lg shadow-xl shadow-blue-200 hover:scale-[1.02] transition-transform font-bold" style={{ background: 'linear-gradient(135deg,#3498db,#2980b9)' }}>
                  explorar ahora
                </Link>
                <div className="flex -space-x-2">
                  {[
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuBvSQkkrW7KUIOAE3QMhfP2UgAnqfx9nydX4Vmh5nLKNnAnXk8_adbzTEQEQnignfx17APqO96mIMhQW4_iaADowtV1rNemc5l_RS0TRvlH4oGAH2c0tPZHzXEpMYMkXsu-2yHYHgJI_SjAkjS8Osuvt-KzTM7bObloOH0VwNqXGLS50nGjDgXMAUeiuXjnbxn4oMljxAgjhabNJVO84_oyUibk336kbjrRbvaKOEIJou6_zWZU4H_fYj6uqYl6G-xNAYDzjh4JvK2r',
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuA5w66uHh2dYAghAdZRYlgXB7AWAMTghjBdA4oRbG9rcg9nMMy_raLQy2WhUD1EQ0HSV6FNadq7gk0yLxGL69yKf61ikOUXLkNgjBDE3jO6cOOfkXoHKP1KGbkxHrGbxzRIOqwHKau_xWQtCEzlBKPoErd7b4GlSHHatjNcido_PTow0MHNMyhUvkaQ6j1o73RS5p8yHHbt5GZpjutd2L4FULg2mKeFZ2JwJYgyh7E7HcTDSEgqtDDeVDbSKYbKNEEccAQgJLgm87pz',
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuD4d8XcXCTu8pzQ-QqI0oDykIzU7MYKwwS9udklIp93EcM3zcik1PBWydgQ2H8Uj1ZMhvTp5kU9FTqwqDJsXh6uX8Z0-cSKuXq1RUJE5z_pPesOQr4loUlUHLwWkdGFPxeM9OMP6RQ3uKURGROWCukS7qKIS60C5NdYmnZnYuvaa__2BoJ3YDX4QDYh8MS52XA3WecxJoOg2VQBQq_rmul_rIV22eDaVqUsP6tFppn6E_z9ORi8s8roNzmLSns2-Rri9yAbxvVINGXh',
                  ].map((src, i) => (
                    <img key={i} src={src} alt="user" className="w-10 h-10 rounded-full border-2 border-white object-cover" />
                  ))}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs text-blue-600 font-bold border-2 border-white" style={{ backgroundColor: '#e1f5fe' }}>+2k</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBM81asIeiYqRBSvHd1IkZ_SCKRzS5ZOshq0MiIoRhZW3DBw0KpMdPDVBTbaF1biYiofBH-y2-gGcSHY7oxeRyoUF1nuvZmfsxP8l2dIyZA5mFK_O93lgmglwedzOxGVV4lvE9qivffKQlXE3tvqit3BBxa_2pHIWNVw370AfSlmeykHoJOaMjzuMsLxRZLBELKWRshDPcMcvpFVAqKuE53gg3Bzmfc7s9awGR1hq6IpbaeTObKRZ61CshDpdAo0dXF3GjkHJi8t9jU"
                  alt="Wellness and Serenity"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Novedades ─────────────────────────────────────────────────── */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-3xl font-bold" style={{ color: '#3498db' }}>novedades</h2>
                <p className="text-gray-500 mt-2">lo último para tu equilibrio diario</p>
              </div>
              <a href="#" className="font-medium hover:underline" style={{ color: '#46b3e6' }}>ver todo</a>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCH8B0xQfwCVUkwSd-T-YYqbx_Iakg29_AE1rKwksS-Ztv70f8BXJUf0Soau9Vtainrcn5RwfQ9OvwtJR7-iQT_kwXHL-UUd6QXQ6UYp3B3rghUBS6OZOz-07i7L-N835lwiFVvQj1hqvUFjwqw26oHO9QcvuWFQtERda-Qb-2SyECUrT0JbWg8SPJru1TdpVdLb43ioHgkcUgdoTAJjtfLbvZbMlZo_j9BVysQJGSqGc7japU3MOL8dqIr8Nuq3jw_IvsvmD18Aw0V', title: '5 minutos para tu calma', desc: 'pequeñas prácticas de mindfulness para resetear tu día.' },
                { img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBFunOjEi1bi_7xcPTM7VQKmGb7bXr1krzIcuoUvASfb8rPHlVyQfM8UHSd7Z-xSDM1At2UirfH4MUkJPHkZfisSRuwR32SnzEmWj0zq7XsZIxsKlcBwiaNhCes7MEJa978FB7ow5REWUb6TOH_FR_zHkY5VE2qesOl_E8SSVID_pMZXNyupoCT6U4z0TK59bzxtQllBiT8v8ih4GLRv1-BCJF7eqati8narzj5ZGdj0-EcLydLkWPn10kpVNQBx-pN7aa5Kk6soRte', title: 'alimentación consciente', desc: 'nutre tu cuerpo y mente con estos simples consejos.' },
                { img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBT4UA0gHzDtWo9cGeRdUv3SWAEUiSHyeV3GnmY5vXwYv7p0ntt29fuLvyJ0zEWGbVbiedTdDMrnI-SPsgmknstT68ILITrmzlVRgNz8o6BJv1_qHcJDUXMDdCtc5RVyreFpf-fgZGGXr0B1d37jinYtV7ZdHyYzsouafYARIjRrbRCNnj4MKESgKXcbFWd4OtsDr58ZXuwQjb8CA8f5XOhinvgruADNGJbdK4LvsQncGXerAAw25xaF8R2YBcp7Z-LAJbGJh_15KfX', title: 'yoga en la oficina', desc: 'estiramientos para mejorar tu postura durante el trabajo.' },
                { img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAN5xSBheJfshfd9fpUb5rcd5hFXBgBs3Z3dkf9YtwT7HDGYIO8ooC7sLXztfhhN96mr3rbFdad-db_j4UHWwcLMDif2kOfzkGZdIIgw76ZpggOaMrbkFtjk4R4PiQtbqTc8J00tjJgAzxlczGcNrHZvJlnOMAIptDPspJftdac0PL0ywxq-ge-8Q5dHyQBuMHLdN5B40qLEXJR-PWxsWhEI0JmFcGvsBQAmUY7ZwPPMRsu91vh93X3gjF7RvY6j7vgmmXoyoyHUlvo', title: 'higiene del sueño', desc: 'logra un descanso reparador con estos hábitos nocturnos.' },
              ].map(card => (
                <div key={card.title} className="group cursor-pointer">
                  <div className="rounded-xl overflow-hidden mb-4">
                    <img src={card.img} alt={card.title} className="w-full h-48 object-cover group-hover:scale-110 transition duration-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{card.title}</h3>
                  <p className="text-gray-500 text-sm">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Profesionales ──────────────────────────────────────────────── */}
        <section className="py-24" style={{ backgroundColor: 'rgba(248,251,255,0.5)' }}>
          <div className="max-w-7xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold mb-4" style={{ color: '#3498db' }}>profesionales destacados</h2>
            <p className="text-gray-500 mb-16 max-w-2xl mx-auto">expertos verificados listos para acompañarte en tu proceso de transformación.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10">
              {[
                { img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmcXnD6c8c43AEE8qgHkys9GgE0ZD4eAXKTFH8NphY9YTfznKEr6Tw_vcNmhCA2INKk6AOOpqn4aemqdeAF01iLVZFkTvRJxzFwp9ksDIBrTyd-pWRKjANHIDMsEL86C-W6IoYXAeZfQHt0Pyp49RFcIAdCLxfcOln6u9EuCwi--PA7QxurFdzjQLEBKkuegCSXjfXEYtUNBUo0xGmakffdmzBLwotz-e5-0F2jkpFWwmvgvaRvzt3MewRcwqtqxuyoTWx5yTysbAt', name: 'dra. elena soler', esp: 'psicología clínica' },
                { img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDii7ohgREimRgXgAD8e2WPLx8W3bjSJjDNT2pIpaIWa4Lpzj_4qTHvEZQLCTgONeifvwV2YF5EnhNSyPRBSrhFxuuhtG9XUDwSqSVWeucMVn0tqho5YZyYGjcrfG1k7lTrg6x5zZX-ajAgHYsqLkN04u8zuwAZId4bkfjvIxw2ImrUbiR-i8BUVIl3XFhR-D26N7utPeY1PatmUuWLaJntlxqxt9fc29xBq_KxDh6hQuEiv1_q1QinXjz7D2KGE-FkKkAb97u8JiYo', name: 'lic. marcos ruiz', esp: 'fisioterapia' },
                { img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9PMAx5HOoBTaeM6vdzHFRU6WR1jjCXfwppaa8ipOGJSpgWuGY7_ourkBYlFkn1ClOMIulA72E41IxNSGC1CMDByBjR90-YeS4C5Mo-1gl8329ZlA5SdH43GEc6JvqlRS9ePu7p_-yBop1ABTcca16A-_7wdz9IKVSnjR8_yYzzT97Fgvp8IQfO8-AtIHmz1Y7c87R-ju5oEUfoYNWDKH853d0zk5rJNyDIhQwRsdsZ4SW6fFP8sc3R4mFvTMTVmU7kiZL_ggspUI5', name: 'sofía méndez', esp: 'yoga e instrucción' },
                { img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBrHQG7ivBNCZn992YB0OX36LulwqFBX5lcpaTsX1r_xmq_5bip-piEfW3UqktXUxfMF3CxI4CLkvbInZUR4FL1mr2kfhQQfdxmQgbZnHQW2jstpRnTzEZ34AygfUzBng3_60jxJFjHqxy5dtpm_rWvRSZU9emsx7wtJKmEEmsS-38cyt-MGC2qJwCoYWsm37jvDCKHBiAnevAeOYvXBBbGt7gsQcdEBkP-JSyPeZuMhfj7d9BO6kvQri4jgj71eFQHREriSTl4kD5x', name: 'dr. julián sanz', esp: 'psiquiatría' },
                { img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBPLbWXQJxyXQpTY7-O1WRUmUKsXUps-p3AKt97wuJ1k0kpasbvf7xfZ-qWaHBPVFL_oUpqPddQSR46CEMWiQOBEl3YZM1-KBRiY7QA-KWQ5SW5DH_GzKtG9uiFHiVE8dAMTJpwymS_1rpEN-9B-B7BItcuqj6g6KqZPnRP2VQuUwI6eTNoN0U9mj0jAA11BstESiIbYeQeHnptPoTLrm0KIsaRVX8Xx6UEoJtf3MCDQQ2MRMlRSEWlvxgOqkagzh9q_6XIxSvUmVcV', name: 'lic. carla paz', esp: 'nutrición' },
              ].map(p => (
                <div key={p.name} className="flex flex-col items-center">
                  <div className="relative mb-4">
                    <img src={p.img} alt={p.name} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md" />
                    <div className="absolute bottom-0 right-0 p-1 rounded-full border-2 border-white" style={{ backgroundColor: '#00d2ff' }}>
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                      </svg>
                    </div>
                  </div>
                  <h4 className="font-bold text-slate-800">{p.name}</h4>
                  <p className="text-xs text-gray-400">{p.esp}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Empresas ───────────────────────────────────────────────── */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="rounded-3xl p-10 lg:p-20 flex flex-col lg:flex-row items-center justify-between shadow-2xl shadow-blue-100" style={{ background: 'linear-gradient(135deg,#3498db,#2980b9)' }}>
              <div className="text-white mb-10 lg:mb-0 lg:max-w-2xl">
                <h2 className="text-3xl lg:text-4xl font-bold mb-6">¿sos profesional o tenés un centro de bienestar? unite a nuestra comunidad</h2>
                <p className="text-blue-50 text-lg opacity-90">expandí tu alcance, gestioná tus turnos y conectá con miles de personas que buscan potenciar su bienestar.</p>
              </div>
              <button className="px-10 py-4 bg-white rounded-xl text-lg font-bold shadow-lg hover:bg-gray-50 transition" style={{ color: '#3498db' }}>
                contactar
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-gray-100 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div>
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#3498db,#2980b9)' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-slate-800">mensana</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">la plataforma líder en bienestar integral. conectamos mentes y cuerpos con los mejores recursos de salud.</p>
          </div>
          <div>
            <h5 className="font-bold mb-6 text-slate-800">plataforma</h5>
            <ul className="space-y-4 text-gray-500 text-sm">
              {['inicio', 'novedades', 'profesionales', 'centros'].map(l => <li key={l}><a href="#" className="hover:text-blue-600 transition">{l}</a></li>)}
            </ul>
          </div>
          <div>
            <h5 className="font-bold mb-6 text-slate-800">soporte</h5>
            <ul className="space-y-4 text-gray-500 text-sm">
              {['centro de ayuda', 'términos de servicio', 'privacidad', 'contacto'].map(l => <li key={l}><a href="#" className="hover:text-blue-600 transition">{l}</a></li>)}
            </ul>
          </div>
          <div>
            <h5 className="font-bold mb-6 text-slate-800">síguenos</h5>
            <div className="flex space-x-4">
              {[
                'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
                'M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.332 2.633-1.308 3.608-.975.975-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.332-3.608-1.308-.975-.975-1.246-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.332-2.633 1.308-3.608.975-.975 2.242-1.246 3.608-1.308 1.266-.058 1.646-.07 4.85-.07M12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12s.014 3.667.072 4.947c.2 4.353 2.612 6.766 6.965 6.966 1.28.058 1.688.072 4.963.072s3.683-.014 4.963-.072c4.354-.2 6.765-2.613 6.966-6.966.058-1.28.072-1.688.072-4.963s-.014-3.683-.072-4.963c-.2-4.354-2.613-6.765-6.966-6.966C15.667.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
              ].map((path, i) => (
                <a key={i} href="#" className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-700 transition">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d={path} /></svg>
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 border-t border-gray-50 pt-10 text-center">
          <p className="text-xs text-gray-400">© 2025 mensana. todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
