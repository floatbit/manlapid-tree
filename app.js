$('#databaseRetry').onclick = () => location.reload();
window.addEventListener('DOMContentLoaded', () => connectDatabase(), { once: true });
setInterval(refreshShared, 5000);
window.addEventListener('focus', refreshShared);
