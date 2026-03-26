import React from 'react';

function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [12, 20, 50, 100],
}) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm text-slate-600">
        Página <span className="font-semibold">{safePage}</span> de{' '}
        <span className="font-semibold">{totalPages}</span> (total: {total || 0})
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          Prev
        </button>

        <button
          type="button"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          Next
        </button>

        <select
          className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>
              {n}/página
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function Table({
  columns = [],
  rows = [],
  page = 1,
  pageSize = 10,
  total = rows.length,
  onPageChange,
  onPageSizeChange,
  showPagination = true,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="px-4 py-3 text-left align-top font-semibold leading-tight text-slate-700 whitespace-normal"
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={columns.length}>
                  Sem dados
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={r.id ?? idx} className="border-t border-slate-100 hover:bg-slate-50/50">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3 text-slate-700">
                      {typeof c.render === 'function' ? c.render(r) : r[c.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showPagination ? (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      ) : null}
    </div>
  );
}

