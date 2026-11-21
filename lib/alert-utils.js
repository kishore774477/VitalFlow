export const sortAlertsByDateAndSeverity = (alerts) => {
  if (!alerts || alerts.length === 0) return [];
  
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  
  return [...alerts].sort((a, b) => {
    // First sort by date (newest first)
    const dateA = new Date(a.created_at);
    const dateB = new Date(b.created_at);
    
    if (dateB - dateA !== 0) {
      return dateB - dateA;
    }
    
    // Then by severity
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
};

export const groupAlertsByDate = (alerts) => {
  if (!alerts || alerts.length === 0) {
    return {};
  }
  
  const groups = {};
  
  alerts.forEach((alert, index) => {
    const date = new Date(alert.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let label;
    if (date.toDateString() === today.toDateString()) {
      label = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday';
    } else {
      label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(alert);
  });
  return groups;
};

export const formatAlertTime = (timestamp) => {
  if (!timestamp) return 'Unknown';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const severityColors = {
  critical: '#e74c3c',
  high: '#e67e22',
  medium: '#f39c12',
  low: '#3498db',
};

export const severityBackgrounds = {
  critical: 'rgba(231, 76, 60, 0.2)',
  high: 'rgba(230, 126, 34, 0.2)',
  medium: 'rgba(243, 156, 18, 0.2)',
  low: 'rgba(52, 152, 219, 0.2)',
};

export const alertTypeColors = {
  vital: '#e74c3c',
  risk: '#e67e22',
  emergency: '#c0392b',
  system: '#3498db',
};

export const alertTypeIcons = {
  vital: 'favorite',
  risk: 'warning',
  emergency: 'local-hospital',
  system: 'info',
};