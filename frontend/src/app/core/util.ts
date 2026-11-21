import Swal from 'sweetalert2';

export function errMsg(err: any): string {
  const e = err?.error;
  if (e?.errors) {
    const first = (Object.values(e.errors) as string[][])[0];
    if (first?.[0]) return first[0];
  }
  if (e?.message) return e.message;
  if (err?.status === 0) return 'Cannot reach the server. Is the API running?';
  return 'Something went wrong. Please try again.';
}

export function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export const ok = (text: string) =>
  Swal.fire({ icon: 'success', title: 'Done', text, timer: 1600, showConfirmButton: false });

export const fail = (err: any) => Swal.fire({ icon: 'error', title: 'Error', text: errMsg(err) });

export async function confirmBox(title: string, text: string, confirmText = 'Yes'): Promise<boolean> {
  const r = await Swal.fire({
    icon: 'question', title, text, showCancelButton: true, confirmButtonText: confirmText,
  });
  return r.isConfirmed;
}

export async function askText(title: string, label: string, type: 'text' | 'password' = 'text'): Promise<string | null> {
  const r = await Swal.fire({
    title, input: type, inputLabel: label, showCancelButton: true,
    inputValidator: (v) => (v && v.trim().length >= 3 ? null : 'Please enter at least 3 characters.'),
  });
  return r.isConfirmed ? String(r.value).trim() : null;
}

export const STATUS_LABEL: Record<string, string> = {
  upcoming: 'Upcoming', due: 'Due', overdue: 'Overdue',
  in_stock: 'In Stock', low_stock: 'Low Stock', out_of_stock: 'Out of Stock',
  active: 'Active', transferred: 'Transferred', inactive: 'Inactive', deceased: 'Deceased',
  contacted: 'Contacted', rescheduled: 'Rescheduled', completed: 'Completed',
};

export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
