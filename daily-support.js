/* 毎日の予定とアイコン。画面や保存先に依存しない共通定義。 */
(function(root){
  'use strict';
  var paths = {
    home: '<path d="M5 14 16 5l11 9v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z"/><path d="M12 29v-9h8v9"/><path d="M11 12h.01M21 12h.01"/>',
    manabu: '<path d="M16 9C12 6 7 6 3 8v19c5-2 9-1 13 1 4-2 8-3 13-1V8c-4-2-9-2-13 1Z"/><path d="M16 9v19M7 13h5M20 13h5M7 18h4M20 18h4"/>',
    dekita: '<path d="m16 3 4.1 8.3 9.2 1.4-6.7 6.5 1.6 9.2-8.2-4.3-8.2 4.3 1.6-9.2-6.7-6.5 9.2-1.4Z"/><path d="M12 17h.01M20 17h.01M13 20q3 3 6 0"/>',
    sora: '<path d="M8 25a7 7 0 0 1-1-14 9 9 0 0 1 17-1 7.5 7.5 0 0 1 0 15Z"/><path d="M12 16h.01M21 16h.01M14 20q3 3 5 0"/>',
    calendar: '<rect x="4" y="7" width="24" height="22" rx="6"/><path d="M10 3v8M22 3v8M4 15h24M10 20h.01M16 20h.01M22 20h.01M10 25h.01M16 25h.01"/>',
    bag: '<rect x="6" y="8" width="20" height="21" rx="6"/><path d="M12 8V6a4 4 0 0 1 8 0v2M6 17h20M12 21h8v5h-8Z"/>',
    medicine: '<rect x="9" y="9" width="14" height="20" rx="4"/><path d="M10 9V4h12v5M12 19h8M16 15v8"/>',
    check: '<circle cx="16" cy="16" r="12"/><path d="m10 16 4 4 8-9"/>'
  };
  function icon(id){ return '<svg class="study-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(paths[id]||paths.check)+'</svg>'; }
  function occurs(r, date){
    if (r.paused) return false;
    var day = new Date(date+'T00:00:00').getDay();
    return (r.days || [0,1,2,3,4,5,6]).indexOf(day) !== -1 && (r.skipDates || []).indexOf(date) === -1;
  }
  var api = {icon:icon, occurs:occurs, periods:{morning:'あさ', afternoon:'かえってから', evening:'よる', anytime:'いつでも'}, presets:{
    medicine:{title:'おくすりをのむ',days:[],period:'anytime',kind:'medicine',note:'飲む曜日・タイミングは、ご家庭で決めている内容を選んでください。'},
    school:{title:'あしたの学校のじゅんび',days:[0,1,2,3,4],period:'evening',kind:'bag',note:'翌日が月〜金の学校なら、準備するのは日〜木の夜です。土曜は表示しません。祝日や休校日は「お休みの日」で調整できます。'},
    custom:{title:'',days:[0,1,2,3,4,5,6],period:'anytime',kind:'check',note:'習い事の持ち物や、毎日の習慣にも使えます。'}
  }};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DailySupport = api;
})(typeof window !== 'undefined' ? window : globalThis);
