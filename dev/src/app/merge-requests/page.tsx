"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ExternalLink,
  RefreshCw,
  Loader2,
  GitPullRequest,
} from "lucide-react";

interface MergeRequestRow {
  id: string;
  gitlab_mr_id: number | null;
  gitlab_mr_url: string | null;
  source_branch: string;
  target_branch: string;
  status: string;
  title: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const statusVariants: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  OPEN: "bg-blue-100 text-blue-800",
  MERGED: "bg-green-100 text-green-800",
  CLOSED: "bg-slate-100 text-slate-800",
};

export default function MergeRequestsPage() {
  const [mergeRequests, setMergeRequests] = useState<MergeRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchMergeRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: "20",
      });
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const res = await fetch(`/api/v1/merge-requests?${params}`);
      const data = await res.json();
      setMergeRequests(data.data ?? []);
      setTotalPages(data.pagination?.total_pages ?? 1);
    } catch (err) {
      console.error("Failed to fetch MRs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchMergeRequests();
  }, [fetchMergeRequests]);

  const syncStatus = async (mrId: string) => {
    setSyncingId(mrId);
    try {
      await fetch(`/api/v1/merge-requests/${mrId}/sync-status`, {
        method: "POST",
      });
      await fetchMergeRequests();
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitPullRequest className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold text-slate-900">Merge Requests</h1>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMergeRequests}>
          <RefreshCw className="mr-2 h-4 w-4" />
          重新整理
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="狀態篩選" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="MERGED">Merged</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>標題</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>操作者</TableHead>
                <TableHead>建立時間</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : mergeRequests.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-slate-500"
                  >
                    尚未建立任何 Merge Request
                  </TableCell>
                </TableRow>
              ) : (
                mergeRequests.map((mr) => (
                  <TableRow key={mr.id}>
                    <TableCell className="font-medium">
                      {mr.gitlab_mr_url ? (
                        <a
                          href={mr.gitlab_mr_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          {mr.title ?? `MR !${mr.gitlab_mr_id}`}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        mr.title ?? "Untitled"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          statusVariants[mr.status] ??
                          "bg-slate-100 text-slate-800"
                        }
                      >
                        {mr.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs text-slate-600">
                        {mr.source_branch}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {mr.created_by ?? "-"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(mr.created_at).toLocaleString("zh-TW")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => syncStatus(mr.id)}
                        disabled={syncingId === mr.id}
                      >
                        {syncingId === mr.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            上一頁
          </Button>
          <span className="text-sm text-slate-600">
            第 {page} / {totalPages} 頁
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            下一頁
          </Button>
        </div>
      )}
    </div>
  );
}
