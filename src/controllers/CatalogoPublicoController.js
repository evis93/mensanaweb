const CATEGORIAS = [
  { id: 'todos',    label: 'Todos',    icon: 'apps' },
  { id: 'masajes',  label: 'Masajes',  icon: 'spa' },
  { id: 'yoga',     label: 'Yoga',     icon: 'self-improvement' },
  { id: 'terapias', label: 'Terapias', icon: 'psychology' },
];

const SERVICIOS = [
  {
    id: '1',
    categoria_id: 'masajes',
    categoria_label: 'Bienestar Físico',
    nombre: 'Masaje Descontracturante',
    precio: 45,
    duracion_minutos: 60,
    tipo: 'Manual',
    tipo_icon: 'pan-tool',
    rating: 4.9,
    descripcion: 'Alivia la tensión muscular profunda y reduce el estrés acumulado con técnicas terapéuticas aplicadas por profesionales certificados.',
    accion: 'reservar',
    imagen: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBehpfKSgPvDLGSDPwWooPC0b9UUdb0EJLadMOxeF5vQfT9YJOlpKRXd-q4FKCcuyFzag4dRT5GPh1MFya5kVqZXmFdgZJmJY-6omZxFDKsUXrjseWqjHfkZA0Kg6UfD5THwDd7RDblcigA-av5PP-cwKFgm2lIW1U9-zfpLQnYkdxD9upKIAFGX_37uDd6vQgmgr150XixhK60TgJRI4HVYWNHAqKBPcF0uCK9sXX2oIZ_XKaEktlV9hXRFoJWT9GjI12Rw0hOTBMu',
  },
  {
    id: '2',
    categoria_id: 'yoga',
    categoria_label: 'Mente & Cuerpo',
    nombre: 'Hatha Yoga Personalizado',
    precio: 35,
    duracion_minutos: 60,
    tipo: 'Individual',
    tipo_icon: 'person',
    rating: 5.0,
    descripcion: 'Sesión privada adaptada a tu nivel. Enfocada en la alineación postural, respiración consciente y flexibilidad integral.',
    accion: 'consultar',
    imagen: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBrg5RvUWdsWqqW28QnjWLqXC0ggyRilmaZrhDByFiyIX485srS4iHgLFJ69AxqSlpktuaSRmPUoNF3eHFDYtvITBfoUbOwMHUdP03t10h7197GkwUFXLtUfbNdDjlxNaJZm_oUiAe0f4_u47UdNlC8IqLwIcshmyRiFQGToiG08pKGB3MlrHOHb2J3GJjo0votmHDvKgCKn82Rd348gfzvX1n3Hy1BbYOLj7FOVEO2S2ER1OYAeDivXCd5pdkY49LsQwRl0QPQab8d',
  },
  {
    id: '3',
    categoria_id: 'terapias',
    categoria_label: 'Energía Vital',
    nombre: 'Terapia Reiki',
    precio: 40,
    duracion_minutos: 45,
    tipo: 'Energético',
    tipo_icon: 'bolt',
    rating: 4.8,
    descripcion: 'Canalización de energía para restaurar el equilibrio físico y emocional, promoviendo una profunda sensación de paz y claridad mental.',
    accion: 'reservar',
    imagen: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCz_pQNZjgNTAoJxCvzCZdxv60-In3lhDDGms_JbnEhS4DTsALjG2DwJmBSNdrOA30NSHilZBmAAWdB6gqAiJ9nYXU-v7ENaPdfL9xKRwfJW0K6c9b7MAIn43fd4rgIYdeSOFO_a5q7fcso0JFoxh2_9Gcshdy-7XaiGvdwLNq4oWUJ-IrAj0vlO4n0OR7t0hGVyoUs4WnT6ndPzkM9wJbWzJ5DObjljOgexAOzEIyBNSgWjh4j_hHPnc459nD8zzGGQ3bZoOoJ_3ei',
  },
];

export class CatalogoPublicoController {
  static obtenerCategorias() {
    return { success: true, data: CATEGORIAS };
  }

  static obtenerServicios(categoriaId = 'todos') {
    const data = categoriaId === 'todos'
      ? SERVICIOS
      : SERVICIOS.filter(s => s.categoria_id === categoriaId);
    return { success: true, data };
  }
}
