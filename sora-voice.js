/**
 * Riho Study - Sora（英会話）音声接続 + 学習記録 + 英語クイズ モジュール
 *
 * 使い方(riho-study.html側):
 *   <audio id="soraAudio" autoplay></audio>
 *   <script src="sora-voice.js"></script>
 *   startSora({...}) で会話開始、stopSoraAndSummarize({...}) で会話終了＋記録保存、
 *   fetchEnglishQuiz(theme, count) でクイズ取得、fetchLearningLogs(limit) で履歴取得。
 *
 * 重要: このスクリプトはOpenAI・GASのサーバーへ直接ネットワーク接続するため、
 * claude.aiのアーティファクト上では動作しません(外部ドメインへの通信が
 * ブロックされるため)。里穂子アプリをGitHub Pagesにデプロイした本番環境で
 * 読み込んでください。
 *
 * 事前準備: Code.gs をGASプロジェクトにデプロイし、そのURLを下の
 * SORA_TOKEN_ENDPOINT に設定しておくこと。
 */

const SORA_TOKEN_ENDPOINT = "https://script.google.com/macros/s/AKfycbwGeaYz1QrRqxJ3vpNG31ZT_Sm_bhgLLmm9sh9ISBCu9CeMquX1100UMu3fhiP1Cc_QJA/exec";

let _pc = null;
let _micStream = null;
let _dataChannel = null;
let _transcriptSora = "";
let _transcriptChild = "";

async function callBackend_(payload) {
  const res = await fetch(SORA_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // preflight回避のためtext/plainで送る
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (data.error) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
  return data;
}

async function startSora({ onTranscript, onStatus, onError } = {}) {
  _transcriptSora = "";
  _transcriptChild = "";
  try {
    onStatus && onStatus("せつぞく中…");

    // 1. GASバックエンドから短命トークンを取得（前回の学習記録を踏まえた指示も含む）
    const tokenData = await callBackend_({ action: "token" });

    // client_secrets APIのレスポンス形式は変更されうるため、
    // 実際のレスポンスをコンソールで確認し、下のキー名を合わせること。
    const ephemeralKey = tokenData.value || (tokenData.client_secret && tokenData.client_secret.value);
    if (!ephemeralKey) throw new Error("ephemeral key not found in response: " + JSON.stringify(tokenData));

    // 2. マイクを取得(iPad Safariでも getUserMedia 自体は利用可能)
    _micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // 3. WebRTC接続を作成
    _pc = new RTCPeerConnection();

    const audioEl = document.getElementById("soraAudio");
    _pc.ontrack = (event) => {
      if (audioEl) audioEl.srcObject = event.streams[0];
    };

    _micStream.getTracks().forEach((track) => _pc.addTrack(track, _micStream));

    _dataChannel = _pc.createDataChannel("oai-events");
    _dataChannel.onmessage = (e) => {
      let evt;
      try { evt = JSON.parse(e.data); } catch (err) { return; }

      if (evt.type === "response.output_audio_transcript.delta") {
        _transcriptSora += evt.delta || "";
        if (onTranscript) onTranscript(evt.delta || "");
      }
      // 里穂子さん側の発話の文字起こし。イベント名・フィールド名はOpenAIの
      // 最新ドキュメントで要確認(session側でinput_audio_transcriptionを
      // 有効にしている前提)。
      if (evt.type === "conversation.item.input_audio_transcription.completed") {
        _transcriptChild += (evt.transcript || "") + "\n";
      }
      if (evt.type === "error" && onError) {
        onError(evt);
      }
    };

    const offer = await _pc.createOffer();
    await _pc.setLocalDescription(offer);

    // モデル名・エンドポイントはOpenAIの最新ドキュメントで要確認
    const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls?model=gpt-realtime-2.1", {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${ephemeralKey}`,
        "Content-Type": "application/sdp"
      }
    });
    const answerSdp = await sdpRes.text();
    await _pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

    onStatus && onStatus("おはなしできます");
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

/**
 * 会話を終了し、蓄積した文字起こしをGASへ送って要約(学習記録)を作らせる。
 * summary: { goodExpressions, struggles, nextTheme, comment }
 */
async function stopSoraAndSummarize({ onSummary, onError } = {}) {
  const transcript = ("Sora: " + _transcriptSora + "\n里穂子: " + _transcriptChild).trim();
  stopSora();
  if (_transcriptSora.length < 5 && _transcriptChild.length < 5) {
    // 会話がほぼ無かった場合は記録を送らない
    return;
  }
  try {
    const data = await callBackend_({ action: "log", transcript: transcript });
    onSummary && onSummary(data.summary || {});
  } catch (err) {
    onError && onError(err);
  }
}

/**
 * テーマに沿った英語の4択クイズをAIに作らせる。
 * 戻り値: [{ question, choices:[...], answerIndex, explanation }, ...]
 */
async function fetchEnglishQuiz(theme, count) {
  const data = await callBackend_({ action: "quiz", theme: theme || "学校、好きなもの、日常生活", count: count || 5 });
  return data.quiz || [];
}

/**
 * 直近の英会話の学習記録を取得する（保護者画面の学習履歴タブ用）。
 */
async function fetchLearningLogs(limit) {
  const data = await callBackend_({ action: "getLogs", limit: limit || 10 });
  return data.logs || [];
}
