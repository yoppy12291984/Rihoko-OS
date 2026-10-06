# Rihoko OS 公開版の申し送り

2026-09-24: 保護者→詳しい設定→その他の設定にタブの表示・非表示と起動時の画面を追加。最低1タブを残す。riho-study-tab-preferences-v1へ端末別保存。非表示でも記録は保持。スワイプは可視タブのみ。
編集元はOneDriveのドキュメント/OS App/Rihoko OS/index.html。tools/build-release.cjs release-deviceで作る同梱HTMLが公開用。公開版を古いローカルコードで上書きしない。GAS、認証、同期方式は今回変更なし。

## 2026-10-07 左右スワイプでのタブ切り替えを廃止
- 利用者の依頼によりsetupSwipeNav_と起動時の呼び出しを削除。下部タブのタップ、タブの表示設定・順序・起動先は維持。
- 版はv2026.10.07.1。GAS・認証・保存データ・同期処理は変更なし。編集元はOS App/Rihoko OS、今回の作業コピーはChatGPT/Rihoko OS/swipe-work。
- 確認：公開版の全11インラインJSの構文検査成功。旧公開版との差分はスワイプ関数・呼出しの削除と版番号だけで、既存タップハンドラーは同一。iPhone/iPad実機は未検証。
