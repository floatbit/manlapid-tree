$('#databaseRetry').onclick = () => location.reload();
setInterval(refreshShared, 5000);
window.addEventListener('focus', refreshShared);
