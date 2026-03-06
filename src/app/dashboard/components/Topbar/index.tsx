import TopbarClient from './TopbarClient';
import { getCurrentTenantRole } from '@/lib/requireTenantRole';

export default async function Topbar() {
  const { role } = await getCurrentTenantRole();
  return <TopbarClient role={role} />;
}
