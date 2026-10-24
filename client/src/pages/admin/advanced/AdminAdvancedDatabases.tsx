import React, { useEffect, useState } from 'react';
import { Skeleton } from '../../../components/Skeleton.js';

interface TableMeta {
  name: string;
  count: number;
}

interface TableDataResponse {
  table: string;
  columns: string[];
  rows: Record<string, any>[];
  total: number;
  page: number;
  limit: number;
}

export default function AdminAdvancedDatabases() {
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('users');
  const [tableData, setTableData] = useState<TableDataResponse | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  async function loadTables() {
    try {
      const res = await fetch('/api/admin/advanced/databases/tables', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setTables(data);
      }
    } catch {
    }
  }

  async function loadTableData(tbl = selectedTable, p = page, q = search) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/advanced/databases/${tbl}?page=${p}&limit=20&search=${encodeURIComponent(q)}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (res.ok) {
        setTableData(data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    setPage(1);
    loadTableData(selectedTable, 1, search);
  }, [selectedTable]);

  useEffect(() => {
    loadTableData(selectedTable, page, search);
  }, [page]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadTableData(selectedTable, 1, search);
  }

  const totalPages = tableData ? Math.max(1, Math.ceil(tableData.total / 20)) : 1;

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-line rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <i className="bi bi-database text-cyan" /> Trình duyệt dữ liệu (CHỈ ĐỌC)
            </h3>
            <p className="text-[11px] text-muted">
              Duyệt các bảng trong danh sách allowlist. Tất cả các cột nhạy cảm (mật khẩu, mã bí mật, token) đều được ẩn tự động.
            </p>
          </div>
          <span className="text-[10px] font-mono text-muted bg-surface2 px-2.5 py-1 rounded-lg border border-line">
            READ-ONLY MODE
          </span>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <label className="text-xs text-muted">Chọn bảng:</label>
          <select
            value={selectedTable}
            onChange={(e) => {
              setSelectedTable(e.target.value);
              setSearch('');
            }}
            className="bg-surface2 border border-line rounded-xl px-3 py-1.5 text-xs font-mono font-semibold text-ink focus:outline-none focus:border-cyan"
          >
            {tables.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name} ({t.count} hàng)
              </option>
            ))}
          </select>

          <form onSubmit={handleSearchSubmit} className="flex gap-1.5 flex-1 min-w-[200px]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm trong bảng..."
              className="flex-1 bg-surface2 border border-line rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-cyan"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-cyan text-ink rounded-xl text-xs font-semibold hover:brightness-110 transition"
            >
              Tìm
            </button>
          </form>
        </div>
      </div>

      <div className="block sm:hidden space-y-3">
        {loading || !tableData ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
        ) : tableData.rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted bg-surface border border-line rounded-2xl">
            Không có hàng dữ liệu nào.
          </div>
        ) : (
          tableData.rows.map((row, idx) => (
            <div key={idx} className="bg-surface border border-line rounded-2xl p-4 space-y-2 text-xs">
              <div className="font-mono text-[10px] text-muted pb-1 border-b border-line flex items-center justify-between">
                <span>Hàng #{idx + 1 + (page - 1) * 20}</span>
                <span className="text-cyan font-bold">{selectedTable}</span>
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                {tableData.columns.slice(0, 8).map((col) => (
                  <div key={col} className="flex justify-between gap-2 overflow-hidden">
                    <span className="text-muted shrink-0">{col}:</span>
                    <span className="text-ink truncate text-right">
                      {row[col] === null ? (
                        <span className="text-muted/60">null</span>
                      ) : typeof row[col] === 'object' ? (
                        JSON.stringify(row[col])
                      ) : (
                        String(row[col])
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden sm:block border border-line rounded-2xl overflow-hidden bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-surface2 text-muted uppercase text-[10px] border-b border-line font-mono">
              <tr>
                {tableData?.columns.map((col) => (
                  <th key={col} className="text-left px-3.5 py-3 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-mono text-[11px]">
              {loading || !tableData ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={10} className="px-3.5 py-3">
                      <Skeleton className="h-5 w-full rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : tableData.rows.length === 0 ? (
                <tr>
                  <td colSpan={tableData.columns.length} className="px-3.5 py-8 text-center text-muted">
                    Không có hàng dữ liệu nào.
                  </td>
                </tr>
              ) : (
                tableData.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-surface2/50 transition">
                    {tableData.columns.map((col) => {
                      const val = row[col];
                      const display =
                        val === null ? (
                          <span className="text-muted/50 italic">null</span>
                        ) : typeof val === 'object' ? (
                          JSON.stringify(val)
                        ) : (
                          String(val)
                        );
                      return (
                        <td key={col} className="px-3.5 py-2.5 max-w-[220px] truncate" title={String(val)}>
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {tableData && totalPages > 1 && (
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-muted">
            Tổng cộng {tableData.total} hàng trong bảng <span className="font-mono text-cyan">{selectedTable}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-line disabled:opacity-40"
            >
              <i className="bi bi-chevron-left" />
            </button>
            <span className="font-mono text-muted px-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-line disabled:opacity-40"
            >
              <i className="bi bi-chevron-right" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
