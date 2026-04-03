// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { format } from 'date-fns';
import { API_URL } from '../apiConfig';

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const AdminPayments = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  // Data
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total_payments: 0, successful: 0, total_collected: 0 });
  const [availablePeriods, setAvailablePeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Sorting
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      params.set('sort_by', sortBy);
      params.set('sort_order', sortOrder);

      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (minAmount) params.set('min_amount', minAmount);
      if (maxAmount) params.set('max_amount', maxAmount);

      if (periodFilter && periodFilter !== 'all') {
        const [m, y] = periodFilter.split('-');
        params.set('month', m);
        params.set('year', y);
      }

      const response = await fetch(`${API_URL}/admin/payments?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setRecords(data.records || []);
        setTotalCount(data.total_count || 0);
        setTotalPages(data.total_pages || 1);
        setSummary(data.summary || { total_payments: 0, successful: 0, total_collected: 0 });
        if (data.available_periods) setAvailablePeriods(data.available_periods);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }, [token, page, pageSize, sortBy, sortOrder, statusFilter, debouncedSearch, minAmount, maxAmount, periodFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: Function, value: any) => {
    setter(value);
    setPage(1);
  };

  // Sort handler
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return <ArrowUpDown size={14} className="ml-1.5 text-[#A0A0AB]/40" />;
    return sortOrder === 'asc'
      ? <ArrowUp size={14} className="ml-1.5 text-[#FF5722]" />
      : <ArrowDown size={14} className="ml-1.5 text-[#FF5722]" />;
  };

  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      <header className="bg-[#050505] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            onClick={() => navigate('/admin')}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/5 hover:text-white rounded-sm"
            data-testid="back-to-admin-button"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-black bebas uppercase tracking-tight text-white">Payment Records</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" data-testid="payment-summary-section">
          <div className="bg-[#0F0F12] border border-white/10 rounded-sm p-6">
            <div className="text-[#A0A0AB] text-xs uppercase tracking-[0.2em] mb-2">Total Payments</div>
            <div className="text-3xl font-black bebas text-white">{summary.total_payments}</div>
          </div>
          <div className="bg-[#0F0F12] border border-white/10 rounded-sm p-6">
            <div className="text-[#A0A0AB] text-xs uppercase tracking-[0.2em] mb-2">Successful</div>
            <div className="text-3xl font-black bebas text-[#4CAF50]">{summary.successful}</div>
          </div>
          <div className="bg-[#0F0F12] border border-white/10 rounded-sm p-6">
            <div className="text-[#A0A0AB] text-xs uppercase tracking-[0.2em] mb-2">Total Collected</div>
            <div className="text-2xl font-black bebas text-white">{'\u20A6'}{summary.total_collected.toLocaleString()}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#0F0F12] border border-white/10 rounded-sm p-5 mb-6" data-testid="payment-filters">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A0AB]" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by reference, name, email..."
                className="pl-9 bg-[#050505] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm text-sm"
                data-testid="search-input"
              />
            </div>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={(v) => handleFilterChange(setStatusFilter, v)}>
              <SelectTrigger className="bg-[#050505] border-white/10 text-white rounded-sm text-sm" data-testid="status-filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A20] border-white/10">
                <SelectItem value="all" className="text-white hover:bg-white/10">All Statuses</SelectItem>
                <SelectItem value="success" className="text-white hover:bg-white/10">Success</SelectItem>
                <SelectItem value="pending" className="text-white hover:bg-white/10">Pending</SelectItem>
                <SelectItem value="failed" className="text-white hover:bg-white/10">Failed</SelectItem>
              </SelectContent>
            </Select>

            {/* Period filter */}
            <Select value={periodFilter} onValueChange={(v) => handleFilterChange(setPeriodFilter, v)}>
              <SelectTrigger className="bg-[#050505] border-white/10 text-white rounded-sm text-sm" data-testid="period-filter">
                <SelectValue placeholder="All Periods" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A20] border-white/10">
                <SelectItem value="all" className="text-white hover:bg-white/10">All Periods</SelectItem>
                {availablePeriods.map((p) => (
                  <SelectItem key={`${p.month}-${p.year}`} value={`${p.month}-${p.year}`} className="text-white hover:bg-white/10">
                    {MONTH_NAMES[p.month]} {p.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Rows per page */}
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="bg-[#050505] border-white/10 text-white rounded-sm text-sm" data-testid="page-size-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A20] border-white/10">
                {[20, 30, 40, 50].map(n => (
                  <SelectItem key={n} value={String(n)} className="text-white hover:bg-white/10">{n} per page</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount range row */}
          <div className="grid grid-cols-2 gap-4 mt-4 max-w-md">
            <div>
              <Input
                type="number"
                min="0"
                value={minAmount}
                onChange={(e) => handleFilterChange(setMinAmount, e.target.value)}
                placeholder="Min amount"
                className="bg-[#050505] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm text-sm"
                data-testid="min-amount-input"
              />
            </div>
            <div>
              <Input
                type="number"
                min="0"
                value={maxAmount}
                onChange={(e) => handleFilterChange(setMaxAmount, e.target.value)}
                placeholder="Max amount"
                className="bg-[#050505] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm text-sm"
                data-testid="max-amount-input"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#0F0F12] border border-white/10 rounded-sm overflow-hidden" data-testid="payments-table">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                {[
                  { key: 'reference', label: 'Reference' },
                  { key: 'member', label: 'Member' },
                  { key: 'amount', label: 'Amount' },
                  { key: 'period', label: 'Period' },
                  { key: 'status', label: 'Status' },
                  { key: 'date', label: 'Date' },
                ].map(col => (
                  <TableHead
                    key={col.key}
                    className="text-xs uppercase tracking-[0.2em] text-[#A0A0AB] cursor-pointer select-none hover:text-white transition-colors"
                    onClick={() => col.key !== 'member' && handleSort(col.key)}
                    data-testid={`sort-${col.key}`}
                  >
                    <span className="flex items-center">
                      {col.label}
                      {col.key !== 'member' && <SortIcon column={col.key} />}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-[#A0A0AB] py-12">
                    Loading payments...
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-[#A0A0AB] py-12" data-testid="empty-state">
                    No payments found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                records.map((payment) => (
                  <TableRow key={payment.id || payment.reference} className="border-white/5 hover:bg-white/5" data-testid="payment-row">
                    <TableCell className="text-white font-mono text-sm">{payment.reference}</TableCell>
                    <TableCell>
                      <div className="text-white text-sm">{payment.member_name || '—'}</div>
                      {payment.member_email && (
                        <div className="text-[#A0A0AB] text-xs">{payment.member_email}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-white font-bold">{'\u20A6'}{payment.amount?.toLocaleString()}</TableCell>
                    <TableCell className="text-[#A0A0AB] text-sm">
                      {MONTH_NAMES[payment.month]} {payment.year}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-bold uppercase px-3 py-1 rounded-sm ${
                        payment.status === 'success' ? 'bg-[#4CAF50] text-white' :
                        payment.status === 'pending' ? 'bg-[#FFC107] text-black' :
                        'bg-[#F44336] text-white'
                      }`}>
                        {payment.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-[#A0A0AB] text-sm whitespace-nowrap">
                      {payment.paid_at
                        ? format(new Date(payment.paid_at), 'MMM dd, yyyy HH:mm')
                        : format(new Date(payment.created_at), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {!loading && totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6" data-testid="pagination-controls">
            <p className="text-[#A0A0AB] text-sm">
              Showing <span className="text-white font-medium">{rangeStart}</span>–<span className="text-white font-medium">{rangeEnd}</span> of <span className="text-white font-medium">{totalCount}</span> payments
            </p>

            <div className="flex items-center gap-1.5">
              {/* First page */}
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(1)}
                className="border-white/10 text-[#A0A0AB] hover:text-white hover:bg-white/5 rounded-sm h-9 w-9 p-0 disabled:opacity-30"
                data-testid="first-page-button"
              >
                <ChevronsLeft size={16} />
              </Button>
              {/* Prev page */}
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="border-white/10 text-[#A0A0AB] hover:text-white hover:bg-white/5 rounded-sm h-9 w-9 p-0 disabled:opacity-30"
                data-testid="prev-page-button"
              >
                <ChevronLeft size={16} />
              </Button>

              {/* Page numbers */}
              {getPageNumbers().map((pn, idx) =>
                pn === '...' ? (
                  <span key={`ellipsis-${idx}`} className="text-[#A0A0AB] px-1.5">...</span>
                ) : (
                  <Button
                    key={pn}
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Number(pn))}
                    className={`rounded-sm h-9 w-9 p-0 text-sm font-medium ${
                      page === pn
                        ? 'bg-[#FF5722] border-[#FF5722] text-white hover:bg-[#E64A19] hover:text-white'
                        : 'border-white/10 text-[#A0A0AB] hover:text-white hover:bg-white/5'
                    }`}
                    data-testid={`page-${pn}-button`}
                  >
                    {pn}
                  </Button>
                )
              )}

              {/* Next page */}
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="border-white/10 text-[#A0A0AB] hover:text-white hover:bg-white/5 rounded-sm h-9 w-9 p-0 disabled:opacity-30"
                data-testid="next-page-button"
              >
                <ChevronRight size={16} />
              </Button>
              {/* Last page */}
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(totalPages)}
                className="border-white/10 text-[#A0A0AB] hover:text-white hover:bg-white/5 rounded-sm h-9 w-9 p-0 disabled:opacity-30"
                data-testid="last-page-button"
              >
                <ChevronsRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPayments;
