import { NextRequest, NextResponse } from 'next/server';
import dns from 'dns/promises';

/**
 * POST /api/admin/domain/verify
 * Body: { domain: string }
 *
 * Verifica que el CNAME del dominio apunte al target de Mensana/Vercel.
 * Responde: { valid: boolean, cname?: string, error?: string }
 */

const ALLOWED_CNAME_TARGETS = [
  'cname.vercel-dns.com',
  'alias.vercel.com', // dominio custom alias alternativo
];

export async function POST(request: NextRequest) {
  let domain: string;

  try {
    const body = await request.json();
    domain = (body.domain ?? '').trim().toLowerCase();
  } catch {
    return NextResponse.json({ valid: false, error: 'JSON inválido' }, { status: 400 });
  }

  if (!domain) {
    return NextResponse.json({ valid: false, error: 'Falta el campo domain' }, { status: 400 });
  }

  // Validación básica de formato
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    return NextResponse.json({ valid: false, error: 'Formato de dominio inválido' }, { status: 400 });
  }

  try {
    const addresses = await dns.resolveCname(domain);
    const cname = addresses[0] ?? '';
    const cnameClean = cname.replace(/\.$/, '').toLowerCase();

    const valid = ALLOWED_CNAME_TARGETS.some(
      (target) => cnameClean === target || cnameClean.endsWith(`.${target}`),
    );

    return NextResponse.json({ valid, cname: cnameClean });
  } catch (err: any) {
    // ENODATA / ENOTFOUND = el CNAME no existe todavía
    if (err.code === 'ENODATA' || err.code === 'ENOTFOUND' || err.code === 'ESERVFAIL') {
      return NextResponse.json({ valid: false, cname: null });
    }
    return NextResponse.json(
      { valid: false, error: 'Error al resolver DNS: ' + err.message },
      { status: 500 },
    );
  }
}
