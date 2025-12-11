"use client";

import {
  Pagination as ShadPagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

function getPages(current: number, total: number) {
  const pages = [];

  if (total <= 7)
    return Array.from({ length: total }, (_, i) => i + 1);

  pages.push(1);

  if (current > 3) pages.push("…");

  const start = Math.max(2, current - 2);
  const end = Math.min(total - 1, current + 2);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push("…");

  pages.push(total);

  return pages;
}

export default function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null;

  const pages = getPages(page, totalPages);

  const prev = page > 1 ? page - 1 : 1;
  const next = page < totalPages ? page + 1 : totalPages;

  return (
    <ShadPagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href={`?page=${prev}`} size="icon" />
        </PaginationItem>

        {pages.map((p, i) => (
          <PaginationItem key={i}>
            {p === "…" ? (
              <span className="px-4 py-2 text-muted-foreground">…</span>
            ) : (
              <PaginationLink
                href={`?page=${p}`}
                isActive={page === p}
                size="default"
              >
                {p}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext href={`?page=${next}`} size="icon" />
        </PaginationItem>
      </PaginationContent>
    </ShadPagination>
  );
}
