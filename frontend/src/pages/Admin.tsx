import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { 
  ShieldAlert, 
  Users, 
  Trash2, 
  Check, 
  ShieldCheck, 
  AlertTriangle,
  UserX,
  MessageSquare,
  History
} from 'lucide-react';

export const Admin: React.FC = () => {
  const { token } = useAuth();
  const { alert, confirm } = useDialog();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'tickets' | 'audit'>('reports');
  const [reports, setReports] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [revealedUsers, setRevealedUsers] = useState<Record<string, { name: string; email: string }>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);

  const handleRevealIdentity = async (targetId: string, type: 'post' | 'social-feed' | 'user') => {
    setRevealingId(targetId);
    try {
      const res = await axios.post('/api/admin/reveal-identity', { targetId, type });
      setRevealedUsers((prev) => ({
        ...prev,
        [targetId]: res.data
      }));
    } catch (err) {
      console.error('Failed to reveal identity:', err);
      alert('Failed to reveal identity. Check admin permissions.', 'Error');
    } finally {
      setRevealingId(null);
    }
  };

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      if (activeTab === 'reports') {
        const res = await axios.get('/api/admin/reports');
        setReports(res.data);
      } else if (activeTab === 'users') {
        const res = await axios.get('/api/admin/users');
        setUsers(res.data);
      } else if (activeTab === 'tickets') {
        const res = await axios.get('/api/admin/tickets');
        setTickets(res.data);
      } else if (activeTab === 'audit') {
        const res = await axios.get('/api/admin/audit-logs');
        setAuditLogs(res.data);
      }
    } catch (err) {
      console.error('Error fetching admin details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, token]);

  const handleResolveReport = async (reportId: string) => {
    try {
      await axios.patch(`/api/admin/reports/${reportId}/resolve`);
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: 'resolved' } : r))
      );
      alert('Report marked resolved successfully.', 'Success');
    } catch (err) {
      console.error('Error resolving report:', err);
      alert('Failed to resolve report.', 'Error');
    }
  };

  const handleDeleteListing = async (postId: string) => {
    const confirmed = await confirm('Are you sure you want to delete this listing from the platform permanently?', 'Confirm Delete');
    if (!confirmed) return;
    try {
      await axios.delete(`/api/admin/posts/${postId}`);
      alert('Listing deleted and related reports resolved.', 'Success');
      fetchData(); // Refresh list
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('Failed to delete listing.', 'Error');
    }
  };

  const handleDeleteReportLog = async (reportId: string) => {
    const confirmed = await confirm('Are you sure you want to permanently delete this resolved report log?', 'Confirm Delete');
    if (!confirmed) return;
    try {
      await axios.delete(`/api/admin/reports/${reportId}`);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      alert('Report log permanently deleted.', 'Success');
    } catch (err) {
      console.error('Error deleting report log:', err);
      alert('Failed to delete report log.', 'Error');
    }
  };

  const handleBanUser = async (userId: string) => {
    const confirmed = await confirm('WARNING: Banning this user will delete their profile, Firebase auth login, and ALL listings. Proceed?', 'Confirm Ban User');
    if (!confirmed) return;
    try {
      await axios.delete(`/api/admin/users/${userId}`);
      alert('User successfully banned and removed from database.', 'Success');
      fetchData(); // Refresh list
    } catch (err) {
      console.error('Error banning user:', err);
      alert('Failed to ban user.', 'Error');
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    try {
      await axios.patch(`/api/admin/tickets/${ticketId}/resolve`);
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: 'resolved' } : t))
      );
      alert('Support ticket resolved successfully.', 'Success');
    } catch (err) {
      console.error('Error resolving ticket:', err);
      alert('Failed to resolve support ticket.', 'Error');
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    const confirmed = await confirm('Are you sure you want to delete this support ticket permanently?', 'Confirm Delete');
    if (!confirmed) return;
    try {
      await axios.delete(`http://localhost:8085/api/admin/tickets/${ticketId}`); // Wait, check if backend URL is consistent
      alert('Support ticket deleted.', 'Success');
      fetchData();
    } catch (err) {
      // Fallback to localhost:8080 if 8085 was a typo in original code
      try {
        await axios.delete(`/api/admin/tickets/${ticketId}`);
        alert('Support ticket deleted.', 'Success');
        fetchData();
      } catch (err2) {
        console.error('Error deleting ticket:', err2);
        alert('Failed to delete support ticket.', 'Error');
      }
    }
  };

  const handleDeleteAllLogs = async () => {
    const confirmed = await confirm('Are you sure you want to permanently delete all activity audit logs? This action is non-reversible.', 'Confirm Purge');
    if (!confirmed) return;
    try {
      await axios.delete('/api/admin/audit-logs');
      alert('All activity audit logs have been successfully purged.', 'Success');
      setAuditLogs([]);
    } catch (err) {
      console.error('Error purging audit logs:', err);
      alert('Failed to purge activity audit logs.', 'Error');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-brand-600 animate-pulse" />
            Administration Console
          </h2>
          <p className="text-sm font-semibold text-slate-400 mt-1">
            Oversee flagged listings, review reports, and manage user platform credentials.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-100 dark:bg-slate-855 p-1.5 rounded-2xl border border-light-border dark:border-dark-border self-start flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
              activeTab === 'reports'
                ? 'bg-white dark:bg-dark-surface text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Report Logs
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
              activeTab === 'users'
                ? 'bg-white dark:bg-dark-surface text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-805 dark:hover:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            Platform Users
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
              activeTab === 'tickets'
                ? 'bg-white dark:bg-dark-surface text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-805 dark:hover:text-slate-300'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Support Tickets
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
              activeTab === 'audit'
                ? 'bg-white dark:bg-dark-surface text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-805 dark:hover:text-slate-300'
            }`}
          >
            <History className="w-4 h-4" />
            Audit Logs
          </button>
        </div>
      </div>

      {/* Content Pane */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 text-slate-400">
          <div className="w-10 h-10 border-4 border-brand-605 border-t-transparent rounded-full animate-spin mb-4" />
          <span className="text-sm font-semibold">Retrieving admin logs...</span>
        </div>
      ) : activeTab === 'reports' ? (
        /* Reports logs tab */
        reports.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-8 shadow-sm">
            <Check className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">All reports resolved</h3>
            <p className="text-sm font-semibold text-slate-400 max-w-sm mx-auto mt-1.5">
              Awesome job! There are no pending flagged listings in the queue.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {reports.map((report) => (
              <div
                key={report.id}
                className={`border rounded-2xl p-5 bg-white dark:bg-dark-surface shadow-sm flex flex-col md:flex-row justify-between gap-5 transition-all text-left ${
                  report.status === 'resolved' 
                    ? 'border-light-border dark:border-dark-border opacity-65' 
                    : 'border-rose-200 dark:border-rose-900/30'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      report.status === 'resolved'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        : 'bg-rose-100 dark:bg-rose-955/40 text-rose-600 dark:text-rose-455'
                    }`}>
                      {report.status}
                    </span>
                    <span className="text-xs font-bold text-slate-405">
                      Reported on {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-base mb-1">
                    Reference:{' '}
                    <button
                      onClick={() => {
                        const isSocial = report.postType === 'social' || report.postTitle?.startsWith('Social Post:');
                        if (isSocial) {
                          navigate(`/posts/${report.postId}`);
                        } else {
                          navigate(`/listings/${report.postId}`);
                        }
                      }}
                      className="text-brand-605 dark:text-brand-400 hover:underline bg-transparent border-none p-0 cursor-pointer font-extrabold text-base text-left inline-block"
                    >
                      {report.postTitle}
                    </button>
                  </h3>
                  <p className="text-xs text-slate-550 dark:text-slate-400 mb-2 leading-relaxed flex items-center gap-2 flex-wrap">
                    <span>Reporter: <span className="font-bold">{report.reporterEmail}</span></span>
                    <span>|</span>
                    <span>Seller/Author UID: <span className="font-semibold">{report.sellerId}</span></span>
                  </p>
                  
                  <div className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-900/40 border border-light-border dark:border-dark-border rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-355 leading-relaxed">
                      Reason: {report.reason}
                    </p>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex md:flex-col gap-2.5 justify-end md:justify-center self-start md:self-center shrink-0">
                  {report.status !== 'resolved' && (
                    <button
                      onClick={() => handleResolveReport(report.id)}
                      className="px-4 py-2 border border-emerald-500 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Check className="w-4 h-4" />
                      Approve & Resolve
                    </button>
                  )}
                  
                  {report.status === 'resolved' ? (
                    <button
                      onClick={() => handleDeleteReportLog(report.id)}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-955/20 text-rose-600 dark:text-rose-455 border border-rose-200 dark:border-rose-900/30 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Report
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDeleteListing(report.postId)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-rose-500/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove Listing
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'tickets' ? (
        /* Support Tickets tab */
        tickets.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-8 shadow-sm">
            <Check className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">No pending support tickets</h3>
            <p className="text-sm font-semibold text-slate-400 max-w-sm mx-auto mt-1.5">
              Everything is in order! No customer support inquiries are currently open.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 text-left">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className={`border rounded-2xl p-5 bg-white dark:bg-dark-surface shadow-sm flex flex-col md:flex-row justify-between gap-5 transition-all ${
                  ticket.status === 'resolved' 
                    ? 'border-light-border dark:border-dark-border opacity-65' 
                    : 'border-blue-200 dark:border-blue-900/30'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      ticket.status === 'resolved'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        : 'bg-blue-100 dark:bg-blue-955/40 text-blue-650 dark:text-blue-400'
                    }`}>
                      {ticket.status}
                    </span>
                    <span className="text-xs font-bold text-slate-450">
                      Submitted on {new Date(ticket.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-805 dark:text-slate-150 text-base mb-1">
                    From: <span className="text-brand-605 dark:text-brand-400">{ticket.name}</span> ({ticket.email})
                  </h3>
                  
                  <div className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-900/40 border border-light-border dark:border-dark-border rounded-xl mt-3">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-355 leading-relaxed whitespace-pre-wrap">
                      {ticket.message}
                    </p>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex md:flex-col gap-2.5 justify-end md:justify-center self-start md:self-center shrink-0">
                  {ticket.status !== 'resolved' && (
                    <button
                      onClick={() => handleResolveTicket(ticket.id)}
                      className="px-4 py-2 border border-emerald-500 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-655 dark:text-emerald-400 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Check className="w-4 h-4" />
                      Mark Resolved
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDeleteTicket(ticket.id)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-rose-500/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Ticket
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'users' ? (
        /* Users list tab */
        <div className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-55 dark:bg-slate-900/60 border-b border-light-border dark:border-dark-border">
                  <th className="p-4 text-xs font-extrabold text-slate-450 uppercase tracking-widest">Name</th>
                  <th className="p-4 text-xs font-extrabold text-slate-450 uppercase tracking-widest">Email</th>
                  <th className="p-4 text-xs font-extrabold text-slate-450 uppercase tracking-widest">College</th>
                  <th className="p-4 text-xs font-extrabold text-slate-450 uppercase tracking-widest">Role</th>
                  <th className="p-4 text-xs font-extrabold text-slate-450 text-right uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border dark:divide-dark-border">
                {users.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold uppercase">
                          {u.name ? u.name[0] : 'U'}
                        </div>
                        <button
                          onClick={() => navigate(`/profile/${u.uid}`)}
                          className="text-xs font-extrabold text-brand-600 dark:text-brand-400 hover:underline hover:text-brand-700 dark:hover:text-brand-300 transition-colors text-left bg-transparent border-none p-0 cursor-pointer"
                        >
                          {u.name || 'Unknown User'}
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-slate-550 dark:text-slate-400 font-semibold">{u.email}</td>
                    <td className="p-4 text-xs text-slate-550 dark:text-slate-400 font-semibold">{u.college}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        u.role === 'admin' 
                          ? 'bg-purple-100 dark:bg-purple-955/40 text-purple-600 dark:text-purple-400' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-555 dark:text-slate-400'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleBanUser(u.uid)}
                          className="p-2 border border-rose-200 hover:border-rose-350 bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-400 rounded-xl font-bold cursor-pointer transition-colors inline-flex items-center justify-center"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Audit logs tab */
        <div className="flex flex-col gap-5">
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/30 p-4.5 rounded-2xl border border-light-border dark:border-dark-border text-left">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Privileged Activity Log</h3>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">Total logs: {auditLogs.length}</p>
            </div>
            {auditLogs.length > 0 && (
              <button
                onClick={handleDeleteAllLogs}
                className="px-4.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md shadow-rose-500/10 cursor-pointer flex items-center gap-1.5 transition-all border-none"
              >
                <Trash2 className="w-4.5 h-4.5" />
                Delete All Logs
              </button>
            )}
          </div>

          {auditLogs.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-8 shadow-sm">
              <Check className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">No audit logs recorded</h3>
              <p className="text-sm font-semibold text-slate-400 max-w-sm mx-auto mt-1.5">
                Identity reveal audits will display here once actions are performed.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-55 dark:bg-slate-900/60 border-b border-light-border dark:border-dark-border">
                      <th className="p-4 text-xs font-extrabold text-slate-450 uppercase tracking-widest">Admin Email</th>
                      <th className="p-4 text-xs font-extrabold text-slate-450 uppercase tracking-widest">Action</th>
                      <th className="p-4 text-xs font-extrabold text-slate-450 uppercase tracking-widest">Details</th>
                      <th className="p-4 text-xs font-extrabold text-slate-450 uppercase tracking-widest">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-border dark:divide-dark-border">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-colors">
                        <td className="p-4 text-xs font-extrabold text-slate-800 dark:text-slate-200">{log.adminEmail}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-100 dark:bg-amber-955/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/20">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-slate-600 dark:text-slate-350 font-medium max-w-xs truncate" title={log.details}>
                          {log.details}
                        </td>
                        <td className="p-4 text-xs text-slate-450 font-medium">{new Date(log.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
