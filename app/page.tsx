/**
 * 首页 - 重定向到登录或仪表盘
 */
import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/utils';

export default async function Home() {
  const auth = await getAuthContext();

  if (auth) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
