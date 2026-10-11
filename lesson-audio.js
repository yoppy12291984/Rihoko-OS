/* User-triggered device speech. No recording, microphone, or external API key. */
(function(root){
 'use strict';
 var current=null;
 function stop(){current=null;if(root.speechSynthesis)root.speechSynthesis.cancel();}
 function speak(text,status){
  stop();
  if(!root.speechSynthesis||!root.SpeechSynthesisUtterance){status.textContent='このブラウザーでは読み上げを使えません。';return;}
  var u=new root.SpeechSynthesisUtterance(text);current=u;u.lang='en-US';u.rate=0.7;u.pitch=1;
  var voices=root.speechSynthesis.getVoices(),voice=voices.find(function(v){return /^en-US$/i.test(v.lang);})||voices.find(function(v){return /^en[-_]/i.test(v.lang);});if(voice)u.voice=voice;
  u.onstart=function(){if(current===u)status.textContent='ゆっくり読んでいるよ。もう一度聞いても大丈夫。';};
  u.onend=function(){if(current===u){current=null;status.textContent='聞きおわったよ。気になった言葉をもう一度聞いてみよう。';}};
  u.onerror=function(e){if(current===u){current=null;status.textContent='音声を再生できませんでした。端末の音量と英語の読み上げ設定を確認してください。';}};
  status.textContent='音声を準備しています…';root.speechSynthesis.speak(u);
 }
 var api={speak:speak,stop:stop};if(typeof module!=='undefined'&&module.exports)module.exports=api;else{root.LessonAudio=api;root.addEventListener('pagehide',stop);}
})(typeof window!=='undefined'?window:globalThis);
