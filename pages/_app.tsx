import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../contexts/AuthContext';
import { ExchangeProvider } from '../contexts/ExchangeContext';
import Layout from '../components/Layout';
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  // admin 페이지들은 Layout을 사용하지 않음
  const isAdminPage = router.pathname.startsWith('/admin');
  
  if (isAdminPage) {
    return (
      <AuthProvider>
        <ExchangeProvider>
          <Component {...pageProps} />
        </ExchangeProvider>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <ExchangeProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </ExchangeProvider>
    </AuthProvider>
  );
}

export default MyApp; 