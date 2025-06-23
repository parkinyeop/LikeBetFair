import Layout from '../components/Layout';
import Sidebar from '../components/Sidebar';

const dummyCategories = [
  '축구',
  '야구',
  '농구',
  '배구',
  'e스포츠'
];

export default function ExchangePage() {
  return (
    <Layout>
      <div className="flex min-h-screen">
        <Sidebar
          categories={dummyCategories}
          selected={dummyCategories[0]}
          onSelect={() => {}}
        />
        <main className="flex-1 flex flex-col items-center justify-center bg-gray-50">
          <div className="w-full max-w-2xl p-8 bg-white rounded shadow text-center">
            <h1 className="text-2xl font-bold mb-4">Exchange 준비중</h1>
            <p className="text-gray-500">이 영역은 곧 Exchange 기능으로 대체됩니다.</p>
          </div>
        </main>
        {/* 배트슬립 영역도 임시로 비워둠 */}
      </div>
    </Layout>
  );
} 