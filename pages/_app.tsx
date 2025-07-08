import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../contexts/AuthContext';
import { ExchangeProvider } from '../contexts/ExchangeContext';
import Layout from '../components/Layout';

function MyApp({ Component, pageProps }: AppProps) {
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