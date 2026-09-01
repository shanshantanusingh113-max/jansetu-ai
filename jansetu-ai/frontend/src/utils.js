export const STATUS_META = {
  new: { label: 'New', hi: 'नया', tone: 'bg-corsair/10 text-corsair-deep' },
  in_progress: { label: 'In Progress', hi: 'प्रगति में', tone: 'bg-status-amber/10 text-status-amber' },
  resolved: { label: 'Resolved', hi: 'समाधान हुआ', tone: 'bg-status-green/10 text-status-green' },
  closed: { label: 'Closed', hi: 'बंद', tone: 'bg-status-gray/10 text-status-gray' },
};

export const notifyText = (status, lang) => {
  if (lang === 'hi') {
    const map = {
      new: 'आपके टिकट का स्थिति: नया',
      in_progress: 'आपकी शिकायत कार्यवाही में है',
      resolved: 'आपकी शिकायत का समाधान हो गया है',
      closed: 'आपकी शिकायत बंद कर दी गई है',
    };
    return map[status] || `स्थिति बदली: ${status}`;
  }
  const map = {
    new: 'Your ticket status is now: New',
    in_progress: 'Your complaint is now In Progress',
    resolved: 'Your complaint has been Resolved',
    closed: 'Your complaint has been Closed',
  };
  return map[status] || `Status changed: ${status}`;
};

export const fmt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const shareUrl = (ticketId) => {
  const base = window.location.origin;
  return `${base}/track?id=${encodeURIComponent(ticketId)}`;
};

export const copyToClipboard = async (text) => {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { return false; }
};

export const whatsappUrl = (ticketId) => {
  const u = shareUrl(ticketId);
  const msg = `Track my complaint on JanSetu AI (ID ${ticketId}): ${u}`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
};