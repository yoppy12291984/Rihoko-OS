(function(root){
  'use strict';
  const KEY='rihoko-color-mode-v1';
  function read(storage){try{const saved=storage.getItem(KEY);if(['light','dark','system'].includes(saved))return saved;return storage.getItem('riho-study-parent-dark')==='1'?'dark':'light';}catch(_){return 'light';}}
  function save(storage,mode){if(!['light','dark','system'].includes(mode))throw Error('表示設定を確認してください');storage.setItem(KEY,mode);}
  function isDark(mode,systemDark){return mode==='dark'||mode==='system'&&systemDark;}
  function toggle(state,visible,fallback,scroll){
    if(state.view==='parent'){state.view=visible.includes(state.settingsReturnView)?state.settingsReturnView:fallback;return {closing:true,scroll:state.settingsReturnScroll||0};}
    state.settingsReturnView=state.view;state.settingsReturnScroll=scroll||0;state.view='parent';state.parentTab='family';state.parentAdvanced=false;return {closing:false,scroll:0};
  }
  const api={KEY,read,save,isDark,toggle};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DisplaySettings=api;
})(typeof window!=='undefined'?window:globalThis);
