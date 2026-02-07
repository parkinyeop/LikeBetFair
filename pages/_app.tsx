import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../contexts/AuthContext';
import { ExchangeProvider } from '../contexts/ExchangeContext';
import Layout from '../components/Layout';
import { useRouter } from 'next/router';
import { Toaster } from 'react-hot-toast';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  // admin 페이지들은 Layout을 사용하지 않음
  const isAdminPage = router.pathname.startsWith('/admin');
  
  if (isAdminPage) {
    return (
      <AuthProvider>
        <ExchangeProvider>
          <Component {...pageProps} />
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
              },
            }}
          />
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
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </ExchangeProvider>
    </AuthProvider>
  );
}

export default MyApp; 