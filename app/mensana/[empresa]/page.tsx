import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ empresa: string }>;
}

export default async function EmpresaPublicPage({ params }: Props) {
  const { empresa } = await params;
  redirect(`/mensana/${empresa}/auth/login`);
}
