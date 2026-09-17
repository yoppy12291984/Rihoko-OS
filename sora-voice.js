/**
 * Riho Study - Sora音声接続 + 学習記録 + 多教科クイズ + プリント取り込み + 利用額 モジュール
 *
 * 重要: このスクリプトはOpenAI・GASのサーバーへ直接ネットワーク接続するため、
 * claude.aiのアーティファクト上では動作しません。GitHub Pagesの本番環境で
 * 読み込んでください。
 *
 * 事前準備: Code.gs をデプロイし、そのURLを下の SORA_TOKEN_ENDPOINT に設定。
 */

const SORA_TOKEN_ENDPOINT = "https://script.google.com/macros/s/AKfycbwGeaYz1QrRqxJ3vpNG31ZT_Sm_bhgLLmm9sh9ISBCu9CeMquX1100UMu3fhiP1Cc_QJA/exec";

// Realtimeモデル名。Code.gs側のトークン発行時のmodelとも必ず一致させること
// (2箇所に同じ文字列を書く必要があり将来ずれうるので、変更時はこのファイルの
// コメントとCode.gsの両方を検索して直すこと)。
const SORA_MODEL = "gpt-realtime-2.1-mini";

// スピーカーモード用のVAD(発話検出)設定。
// iPad本体スピーカーで再生すると、その音をマイクが拾ってSora自身の声を
// 子どもの発話と誤認し、自己中断してしまう問題への対策。
// interrupt_response:false により、誤検知してもSoraの発話を止めないようにする。
// Code.gs側のセッション作成時にも同じ値を設定しているので、変更時は両方直すこと。
const SORA_TURN_DETECTION = {
  type: "server_vad",
  threshold: 0.6,
  prefix_padding_ms: 300,
  silence_duration_ms: 700,
  create_response: true,
  interrupt_response: false
};

let _pc = null;
let _micStream = null;
let _dataChannel = null;
let _transcriptSora = "";
let _transcriptChild = "";

// iOS Safariでは fetch() の POST + GAS側リダイレクトの組み合わせで
// 「Load failed」になる既知の問題があるため、通常のやり取りはGET(クエリパラメータ)で行う。
// 画像や長文などペイロードが大きいものだけ callBackendPost_ (POST) を使う。
async function callBackend_(payload) {
  const url = SORA_TOKEN_ENDPOINT + "?data=" + encodeURIComponent(JSON.stringify(payload));
  const res = await fetch(url, { method: "GET" });
  const data = await res.json();
  if (data.error) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
  return data;
}

async function callBackendPost_(payload) {
  const res = await fetch(SORA_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // preflight回避のためtext/plainで送る
    credentials: "omit",
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (data.error) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
  return data;
}

/* ---------------- Sora（音声会話） ---------------- */

// マイクの許可ダイアログをできるだけ早く出すため、望ましい制約を試し、
// Safari等で一部の制約が非対応でも(OverconstrainedError等で)落ちないように、
// ダメなら単純な audio:true にフォールバックする。
async function getMicStream_() {
  var preferred = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1
    }
  };
  try {
    return await navigator.mediaDevices.getUserMedia(preferred);
  } catch (err) {
    // 一部制約が非対応の場合のフォールバック。ここでの失敗(マイク拒否等)はそのまま投げる。
    return await navigator.mediaDevices.getUserMedia({ audio: true });
  }
}

// マイク関連のエラーを、子ども・保護者にも分かる日本語にする
function describeMicError_(err) {
  var name = err && err.name;
  if (name === "NotAllowedError" || name === "SecurityError") return "マイクの使用が許可されていません";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "マイクが見つかりません";
  return "マイクの準備に失敗しました: " + (err && err.message || err);
}

async function startSora({ onTranscript, onStatus, onError } = {}) {
  _transcriptSora = "";
  _transcriptChild = "";
  try {
    onStatus && onStatus("マイクを準備中…");

    // マイク許可ダイアログをできるだけ早く出すため、マイク取得とGASからの
    // トークン取得を並列で開始する(直列にすると、トークン取得を待ってから
    // マイク許可が出るため体感が遅くなる)。
    const micPromise = getMicStream_().catch(function (err) {
      throw new Error("[マイク許可] " + describeMicError_(err));
    });
    const tokenPromise = callBackend_({ action: "token" }).catch(function (err) {
      throw new Error("[通信] トークン取得に失敗しました: " + (err && err.message || err));
    });

    const results = await Promise.all([tokenPromise, micPromise]);
    const tokenData = results[0];
    _micStream = results[1];

    const ephemeralKey = tokenData.value || (tokenData.client_secret && tokenData.client_secret.value);
    if (!ephemeralKey) throw new Error("[通信] ephemeral key not found: " + JSON.stringify(tokenData));

    onStatus && onStatus("Solaにつないでいるよ…");

    _pc = new RTCPeerConnection();

    // iPad本体スピーカーでの再生を安定させるための設定
    const audioEl = document.getElementById("soraAudio");
    if (audioEl) {
      audioEl.autoplay = true;
      audioEl.playsInline = true;
      audioEl.muted = false;
      audioEl.volume = 0.75; // 大きすぎるとスピーカー→マイクの回り込みが増えるため控えめに
    }
    _pc.ontrack = (event) => {
      if (!audioEl) return;
      audioEl.srcObject = event.streams[0];
      var playPromise = audioEl.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(function (err) {
          onError && onError(new Error("[再生] 音声の再生がブロックされました: " + (err && err.message || err)));
        });
      }
    };

    // 通話中に接続が切れた場合、分かる形で知らせる
    _pc.oniceconnectionstatechange = () => {
      if (!_pc) return;
      var st = _pc.iceConnectionState;
      if (st === "failed" || st === "disconnected" || st === "closed") {
        onError && onError(new Error("[接続] Solaとの接続が切れました"));
      }
    };

    _micStream.getTracks().forEach((track) => _pc.addTrack(track, _micStream));

    _dataChannel = _pc.createDataChannel("oai-events");
    _dataChannel.onopen = () => {
      // GAS側のセッション作成時にもVAD設定を渡しているが、確実に反映されるよう
      // データチャンネル開通直後にも同じ設定をsession.updateとして送る。
      try {
        _dataChannel.send(JSON.stringify({
          type: "session.update",
          session: { audio: { input: { turn_detection: SORA_TURN_DETECTION } } }
        }));
      } catch (err) { /* 失敗しても致命的ではないため無視 */ }
    };
    _dataChannel.onmessage = (e) => {
      let evt;
      try { evt = JSON.parse(e.data); } catch (err) { return; }
      if (evt.type === "response.output_audio_transcript.delta") {
        _transcriptSora += evt.delta || "";
        if (onTranscript) onTranscript(evt.delta || "");
      }
      // イベント名・フィールド名はOpenAIの最新ドキュメントで要確認
      if (evt.type === "conversation.item.input_audio_transcription.completed") {
        _transcriptChild += (evt.transcript || "") + "\n";
      }
      if (evt.type === "error" && onError) onError(new Error("[Sora] " + JSON.stringify(evt)));
    };

    const offer = await _pc.createOffer();
    await _pc.setLocalDescription(offer);

    var sdpRes, answerSdp;
    try {
      sdpRes = await fetch("https://api.openai.com/v1/realtime/calls?model=" + SORA_MODEL, {
        method: "POST",
        body: offer.sdp,
        headers: { Authorization: `Bearer ${ephemeralKey}`, "Content-Type": "application/sdp" }
      });
      answerSdp = await sdpRes.text();
    } catch (err) {
      throw new Error("[通信] Solaへの接続に失敗しました: " + (err && err.message || err));
    }
    if (!sdpRes.ok) {
      throw new Error("[通信] Solaへの接続に失敗しました (HTTP " + sdpRes.status + ")");
    }

    try {
      await _pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (err) {
      throw new Error("[接続] Solaとの接続に失敗しました: " + (err && err.message || err));
    }

    onStatus && onStatus("Solaとおはなしできるよ");
  } catch (err) {
    onError && onError(err);
    stopSora();
  }
}

function stopSora() {
  if (_dataChannel) { try { _dataChannel.close(); } catch (e) {} }
  if (_pc) { try { _pc.close(); } catch (e) {} }
  if (_micStream) { _micStream.getTracks().forEach((t) => t.stop()); }
  _pc = null; _dataChannel = null; _micStream = null;
}

async function stopSoraAndSummarize({ onSummary, onError } = {}) {
  const transcript = ("Sora: " + _transcriptSora + "\n里穂子: " + _transcriptChild).trim();
  stopSora();
  if (_transcriptSora.length < 5 && _transcriptChild.length < 5) return;
  try {
    const data = await callBackendPost_({ action: "log", transcript: transcript });
    onSummary && onSummary(data.summary || {});
  } catch (err) {
    onError && onError(err);
  }
}

/* ---------------- 多教科クイズ ---------------- */

/**
 * subject: "算数"|"国語"|"理科"|"社会"|"英語" など
 * context: 参考にする単元名などの補足文字列(任意)
 */
async function fetchQuiz(subject, context, count) {
  const data = await callBackend_({ action: "quiz", subject: subject, context: context || "", count: count || 5 });
  return data.quiz || [];
}

async function logQuizResult(subject, score, total) {
  try { await callBackend_({ action: "logQuiz", subject: subject, score: score, total: total }); }
  catch (err) { /* 記録の失敗はUIをブロックしない */ }
}

/* ---------------- 学習履歴 ---------------- */

async function fetchLearningLogs(limit) {
  const data = await callBackend_({ action: "getLogs", limit: limit || 10 });
  return { logs: data.logs || [], quizzes: data.quizzes || [] };
}

/* ---------------- 学校プリント等の取り込み ---------------- */

function fileToBase64_(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result; // "data:image/jpeg;base64,xxxx"
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * file: <input type="file"> から得たFileオブジェクト(画像)
 * 戻り値: { homework, items, testRange, events:[{title,date,type}], note }
 */
async function extractPrintFromFile(file) {
  const base64 = await fileToBase64_(file);
  const data = await callBackendPost_({ action: "extractPrint", imageBase64: base64, mimeType: file.type || "image/jpeg" });
  return data.extracted || {};
}

/* ---------------- AI利用額の概算 ---------------- */

async function fetchUsage() {
  return await callBackend_({ action: "getUsage" });
}

async function setUsageLimit(capJpy, warnJpy) {
  return await callBackend_({ action: "setUsageLimit", capJpy, warnJpy });
}

/* ---------------- Googleカレンダー連携 ---------------- */

async function fetchCalendarEvents(days) {
  const data = await callBackend_({ action: "getCalendarEvents", days: days || 30 });
  return data.events || [];
}

async function addCalendarEvent(title, date, time) {
  return await callBackend_({ action: "addCalendarEvent", title, date, time: time || "" });
}

/** dueDate(YYYY-MM-DD)の前日19時にリマインドの予定を作る */
async function addReminder(title, dueDate) {
  return await callBackend_({ action: "addReminder", title, dueDate });
}

/* ---------------- 週の振り返りレポート ---------------- */

async function fetchWeeklyReport() {
  const data = await callBackend_({ action: "weeklyReport" });
  return data.report || null;
}
