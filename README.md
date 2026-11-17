# PyBot — browser demo (unofficial)

重みなし・訓練なし、純粋な Python のルール（if-else / 正規表現 / ルックアップテーブル、約64万行）だけで作られたチャットボット [PyBot](https://github.com/huggingface/pybot) を、サーバーを使わずブラウザの中だけで動かす非公式デモです。

**Demo:** https://diawel.github.io/pybot-web/

## 仕組み

- [Pyodide](https://pyodide.org/)（WebAssembly 版 CPython）を Web Worker で実行
- PyBot の `bot` パッケージを zip 化した `bot.zip`（約13MB）を配置。ブラウザが Pyodide のファイルシステムに展開し、オリジナルのコードをそのまま `import` します
- チャットは `bot.runtime.turn()` を呼ぶだけ。返信ごとに担当モジュール名と応答時間を表示します
- 入力した文章がサーバーに送信されることはありません（会話の記憶はタブの中だけ）

## ライセンス / クレジット

PyBot © Hugging Face / HuggingFaceSwarms — [Apache License 2.0](LICENSE)
（このリポジトリの `LICENSE` は上流リポジトリのもの。デモ側のコードも同じ条件で扱ってください。）

公式のブラウザデモ（サーバー実行版）は [Hugging Face Space](https://huggingface.co/spaces/HuggingFaceSwarms/PyBot) で公開されています。
