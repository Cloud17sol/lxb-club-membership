// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Save,
  X
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { API_URL } from '../apiConfig';

const emptyForm = {
  kind: 'announcement',
  title: '',
  subtitle: '',
  body: '',
  venue: '',
  sort_order: 0,
  is_active: true
};

const AdminClubUpdates = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/club-updates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setItems(await response.json());
      } else {
        toast.error('Failed to load club updates');
      }
    } catch {
      toast.error('Failed to load club updates');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const openEdit = (row: any) => {
    setEditingId(row.id);
    setForm({
      kind: row.kind,
      title: row.title || '',
      subtitle: row.subtitle || '',
      body: row.body || '',
      venue: row.venue || '',
      sort_order: row.sort_order ?? 0,
      is_active: row.is_active !== false
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        kind: form.kind,
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        body: form.body.trim(),
        venue: form.venue.trim(),
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active
      };

      if (editingId) {
        const response = await fetch(`${API_URL}/admin/club-updates/${editingId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.detail || 'Update failed');
        }
        toast.success('Club update saved');
      } else {
        const response = await fetch(`${API_URL}/admin/club-updates`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.detail || 'Create failed');
        }
        toast.success('Club update created');
      }
      cancelForm();
      fetchItems();
    } catch (error: any) {
      toast.error(error.message || 'Request failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try {
      const response = await fetch(`${API_URL}/admin/club-updates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Delete failed');
      toast.success('Deleted');
      fetchItems();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      <header className="bg-[#050505] border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            onClick={() => navigate('/admin')}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/5 hover:text-white rounded-sm"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-black bebas uppercase tracking-tight text-white flex items-center gap-2">
            <Megaphone size={28} className="text-[#FF5722]" />
            Club Updates
          </h1>
          <div className="w-24" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <p className="text-[#A0A0AB] text-sm">
          Control what members see on their dashboard under <strong className="text-white">Club Updates</strong>:
          announcements (title, subtitle, description) and upcoming events (title, date/time line, venue in orange).
        </p>

        <div className="flex gap-3">
          <Button
            onClick={openCreate}
            className="bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-sm font-bold uppercase tracking-wide"
          >
            <Plus size={18} className="mr-2" />
            Add update
          </Button>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-[#0F0F12] border border-[#FF5722]/30 rounded-sm p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold uppercase tracking-wide text-sm">
                {editingId ? 'Edit update' : 'New update'}
              </h2>
              <Button type="button" variant="ghost" size="sm" onClick={cancelForm} className="text-[#A0A0AB]">
                <X size={18} />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white text-sm">Type</Label>
                <Select
                  value={form.kind}
                  onValueChange={(v) => setForm((f) => ({ ...f, kind: v }))}
                >
                  <SelectTrigger className="mt-2 bg-[#0F0F12] border-white/10 text-white rounded-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="event">Upcoming event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white text-sm">Sort order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))
                  }
                  className="mt-2 bg-[#0F0F12] border-white/10 text-white rounded-sm"
                />
                <p className="text-[#A0A0AB] text-xs mt-1">Lower numbers appear first within each section.</p>
              </div>
            </div>

            <div>
              <Label className="text-white text-sm">Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="mt-2 bg-[#0F0F12] border-white/10 text-white rounded-sm"
                placeholder="e.g. Training this Saturday"
              />
            </div>

            <div>
              <Label className="text-white text-sm">Subtitle / meta line</Label>
              <Input
                value={form.subtitle}
                onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                className="mt-2 bg-[#0F0F12] border-white/10 text-white rounded-sm"
                placeholder={
                  form.kind === 'event'
                    ? 'e.g. Apr 12, 2026 • 4:00 PM'
                    : 'e.g. 8:00 AM • National Stadium'
                }
              />
            </div>

            {form.kind === 'announcement' && (
              <div>
                <Label className="text-white text-sm">Description</Label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  rows={3}
                  className="mt-2 w-full bg-[#0F0F12] border border-white/10 text-white rounded-sm p-3 text-sm focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722]"
                  placeholder="Optional longer text for members"
                />
              </div>
            )}

            {form.kind === 'event' && (
              <div>
                <Label className="text-white text-sm">Venue / location (shown in orange)</Label>
                <Input
                  value={form.venue}
                  onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
                  className="mt-2 bg-[#0F0F12] border-white/10 text-white rounded-sm"
                  placeholder="e.g. Teslim Balogun Stadium"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                id="cu-active"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="rounded border-white/20"
              />
              <Label htmlFor="cu-active" className="text-white text-sm cursor-pointer">
                Visible on member dashboard
              </Label>
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-sm"
              >
                <Save size={18} className="mr-2" />
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button type="button" variant="outline" onClick={cancelForm} className="border-white/20 text-white">
                Cancel
              </Button>
            </div>
          </form>
        )}

        <div className="bg-[#0F0F12] border border-white/10 rounded-sm overflow-hidden">
          {loading ? (
            <p className="text-[#A0A0AB] p-8 text-center">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-[#A0A0AB] p-8 text-center">No updates yet. Add one to show on the member dashboard.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[#A0A0AB] text-xs uppercase tracking-wider">
                    <th className="p-4">Type</th>
                    <th className="p-4">Title</th>
                    <th className="p-4">Order</th>
                    <th className="p-4">Active</th>
                    <th className="p-4 w-32">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-4 text-white capitalize">{row.kind}</td>
                      <td className="p-4 text-white max-w-xs truncate">{row.title}</td>
                      <td className="p-4 text-[#A0A0AB]">{row.sort_order}</td>
                      <td className="p-4">
                        <span
                          className={
                            row.is_active ? 'text-[#4CAF50] font-bold text-xs' : 'text-[#F44336] font-bold text-xs'
                          }
                        >
                          {row.is_active ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-[#FF5722] text-[#FF5722] h-8 w-8 p-0"
                            onClick={() => openEdit(row)}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-[#F44336] text-[#F44336] h-8 w-8 p-0"
                            onClick={() => handleDelete(row.id, row.title)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminClubUpdates;
