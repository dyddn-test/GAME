import React, { useEffect, useState } from 'react';
import { Trophy, RefreshCw } from 'lucide-react';
import { RankData } from '../types.ts';

export default function Leaderboard() {
  const [rankings, setRankings] = useState<RankData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dbStatus, setDbStatus] = useState<'supabase' | 'local'>('local');

  const fetchRankings = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch DB Configuration Status
      try {
        const statusRes = await fetch('/api/db-status');
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setDbStatus(statusData.status === 'active' ? 'supabase' : 'local');
        }
      } catch (err) {
        console.error("Failed to query database connection status:", err);
      }

      // Fetch Rankings List
      const res = await fetch('/api/ranking');
      if (!res.ok) {
        throw new Error('랭킹을 불러오는데 실패했습니다.');
      }
      const data = await res.json();
      setRankings(data);
    } catch (err: any) {
      setError(err?.message || '네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, []);

  return (
    <div className="bg-slate-900 border border-emerald-500/20 rounded-xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
      {/* Glow Effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl pointer-events-none rounded-full"></div>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Trophy className="w-6 h-6 text-emerald-400" />
          <h2 className="text-xl font-sans font-bold text-gray-100 tracking-tight mr-1">명예의 전당 (Leaderboard)</h2>
          {dbStatus === 'supabase' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm font-mono shadow-emerald-500/10">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              Supabase Cloud DB
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-850 text-slate-450 border border-slate-800">
              로컬 저장소 모드
            </span>
          )}
        </div>
        <button
          onClick={fetchRankings}
          disabled={loading}
          className="p-2 text-gray-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
          title="새로고침"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-mono text-emerald-400/80 font-semibold text-center">우주선 통신 위성 탐색 중...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-400 font-mono text-sm mb-4">{error}</p>
          <button
            onClick={fetchRankings}
            className="px-4 py-2 border border-emerald-500/40 text-emerald-400 rounded-lg hover:bg-emerald-500/10 text-xs font-mono transition-colors"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-450 text-xs uppercase tracking-wider">
                <th className="py-2.5 px-2 text-center w-14 text-slate-500">순위</th>
                <th className="py-2.5 px-3 text-slate-300">조종사</th>
                <th className="py-2.5 px-3 text-right text-slate-300">점수</th>
                <th className="py-2.5 px-3 text-center text-slate-300">클리어 스테이지</th>
                <th className="py-2.5 px-2 text-right hidden sm:table-cell text-slate-300">기록 일시</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((rank, i) => {
                const isTop3 = i < 3;
                const badgeColor = 
                  i === 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/45 shadow shadow-amber-500/20' : 
                  i === 1 ? 'bg-slate-300/20 text-slate-300 border-slate-400/45' : 
                  i === 2 ? 'bg-amber-700/20 text-amber-600 border-amber-700/45' : '';

                return (
                  <tr 
                    key={i} 
                    className={`border-b border-slate-800/40 hover:bg-slate-850/50 transition-colors ${
                      i === 0 ? 'bg-amber-950/10' : ''
                    }`}
                  >
                    <td className="py-2.5 px-2 text-center">
                      {isTop3 ? (
                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold border ${badgeColor}`}>
                          {i + 1}
                        </span>
                      ) : (
                        <span className="text-slate-500">{i + 1}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-sans font-medium text-slate-200">
                        {rank.name}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                      {rank.score.toLocaleString()} P
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 text-xs border border-slate-850">
                        ST {rank.stage}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-500 text-xs hidden sm:table-cell">
                      {new Date(rank.date).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                );
              })}
              {rankings.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-450 text-xs font-mono">
                    아직 등록된 기록이 없습니다. 최초의 파일럿이 되어보세요!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
