/**
 * Riho Study - Sora（英会話）音声接続モジュール
 *
 * 使い方(riho-study.html側):
 *   <audio id="soraAudio" autoplay></audio>
 *   <script src="sora-voice.js"></script>
 *   <script>
 *     document.getElementById('soraBtn').onclick = async () => {
 *       await startSora({
 *         onTranscript: (text) => console.log('Sora:', text),
 *         onStatus: (msg) => console.log('status:', msg)
 *       });
 *     };
 *   </script>
 *
 * 重要: このスクリプトはOpenAIのサーバーへ直接ネットワーク接続するため、
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

async function startSora({ onTranscript, onStatus, onError } = {}) {
  try {
    onStatus && onStatus("せつぞく中…");

    // 1. GASバックエンドから短命トークンを取得
    const tokenRes = await fetch(SORA_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // preflight回避のためtext/plainで送る
      body: "{}"
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error);

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
      if (evt.type === "response.output_audio_transcript.delta" && onTranscript) {
        onTranscript(evt.delta);
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
