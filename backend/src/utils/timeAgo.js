/**
 * Formats a Date as an Arabic relative-time string, matching the style
 * used throughout the نَفاذ UI (e.g. "منذ دقيقتين", "منذ ساعة").
 */
function timeAgoArabic(date){
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60000);

  if(minutes <= 0) return 'الآن';
  if(minutes === 1) return 'منذ دقيقة';
  if(minutes === 2) return 'منذ دقيقتين';
  if(minutes <= 10) return 'منذ ' + minutes + ' دقائق';
  if(minutes < 60) return 'منذ ' + minutes + ' دقيقة';

  const hours = Math.floor(minutes / 60);
  if(hours === 1) return 'منذ ساعة';
  if(hours === 2) return 'منذ ساعتين';
  if(hours <= 10) return 'منذ ' + hours + ' ساعات';
  if(hours < 24) return 'منذ ' + hours + ' ساعة';

  const days = Math.floor(hours / 24);
  if(days === 1) return 'منذ يوم';
  if(days === 2) return 'منذ يومين';
  return 'منذ ' + days + ' أيام';
}

module.exports = { timeAgoArabic };
