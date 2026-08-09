# onprem_log_training — オンプレ研修用ログ収集対象環境

`projects/log_collector` のデモアプリ(RoboMart)とログ出力部分を、別のオンプレミス環境でも動かせるよう
切り出した独立プロジェクトです ([Issue #40](https://github.com/shiftrepo/ai_workshop/issues/40))。

既存の `log_collector` とは異なり、このプロジェクトは**研修受講者がAIエージェントを使って
自分でログ収集ツールを作ってみる練習環境**です。そのため、SSHログ収集ツール本体
(`log_collector/log-collector-skill`)は含みません — 受講者が自作する対象です。

## 構成

- **`client/`** — アプリケーションサーバ役。RoboMart(架空のロボット販売ECサイト)のWeb/API層。
  ローカルの `node` プロセスとして動作し、`client/logs/app.log` にリクエストログを記録します。
- **`server/`** — 機能(業務ロジック)サーバ役。在庫・注文計算などの業務ロジックを提供するAPI。
  Dockerコンテナとして動作し、SSH経由でログ(`server/logs/service.log`)にアクセスできます
  (収集練習の対象)。
- `client` → `server` へのHTTP呼び出しには `X-Track-Id` ヘッダでTrackIDを伝播させ、
  両方のログに同一TrackIDが残るようにしています。これにより「別サーバーのログをTrackIDで
  紐づけて収集する」という研修テーマを体験できます。

## クイックスタート(Docker、推奨)

`client` と `server` を1つの docker-compose で同時に起動します。

```bash
cp .env.example .env
cd docker
./setup-containers.sh start
# または: cd docker && docker compose up -d --build
```

ブラウザで `http://localhost:3002/` を開きます(ポートは `.env` の `CLIENT_HTTP_PORT` で変更可)。

- 在庫切れ商品「WalkyDog Mk2」の詳細ページを開く → 500エラー(`PRODUCT_STOCK_ZERO_NPE`)
- カートに商品を追加し、決済方法「請求書払い」で注文確定 → 500エラー(`ORDER_TOTAL_UNDEFINED_TAX`)

いずれのエラーもレスポンスに `track_id` が含まれ、`client/logs/app.log`(ホストへbind mount済み、
SSH不要で直接読めます)と `server/logs/service.log`(コンテナ内、SSH経由でアクセス)の両方に
同じTrackIDでログが残ります。`server` へのSSH接続情報は [AGENT_SSH_GUIDE.md](AGENT_SSH_GUIDE.md)
にまとめています。学習者はこのファイルをAIエージェントに読ませるだけで、SSH接続の詳細を
意識せずに使えます。

バグは `server/bug-config.json` の `enabled` を `false` にすると個別に無効化できます。

コンテナの停止/削除:

```bash
./setup-containers.sh stop
./setup-containers.sh clean
```

## クイックスタート(ローカル、Dockerなし)

Dockerを使わずに動作確認したい場合は、次の手順でも起動できます。

```bash
# server (機能サーバ) を起動
cd server
npm install
PORT=4002 node server.js

# 別ターミナルで client (アプリケーションサーバ) を起動
cd client
npm install
PORT=3002 SERVER_BASE_URL=http://localhost:4002 node server.js
```

ブラウザで `http://localhost:3002/` を開きます。挙動は上記Docker版と同じです。

## プロキシ切替(オンプレ環境向け)

`.env` の `USE_PROXY` で切替可能です。

```bash
cp .env.example .env
# USE_PROXY=true にしてHTTP_PROXY/HTTPS_PROXY/NO_PROXYを設定
```

- `scripts/npm-install.sh` — プロキシ設定を反映して `client`/`server` の `npm install` を実行します。
- `scripts/docker-build.sh` — プロキシ設定を `--build-arg` として渡し、`server` イメージをビルドします。
- `scripts/docker-pull.sh` — ビルド済みイメージを `docker pull` するだけの手順です(下記参照)。

### プロキシが関わる3つの場面と対応状況

コンテナ関連の通信は「ビルド時」「pull時(コンテナ作成時)」「実行時(コンテナ内プロセス)」の
3つに分かれ、それぞれ効くレイヤーが異なります。

| 場面 | プロキシの効くレイヤー | 本プロジェクトの対応 |
|---|---|---|
| ①`docker build`中の`apk add`/`npm install` | Dockerfile内の`RUN`が使うシェル環境変数 | `docker/Dockerfile`で`ARG HTTP_PROXY/HTTPS_PROXY/NO_PROXY`を宣言し、`docker-compose.yml`の`build.args`から渡す。**完成イメージには焼き込まない**(ビルド環境と実行環境のプロキシ設定が違っても影響しないようにするため) |
| ②`docker pull`(コンテナ作成時) | Dockerデーモン自体の設定 | シェルの環境変数では効かない。ホスト側で一度だけ`/etc/systemd/system/docker.service.d/http-proxy.conf`を設定する(下記参照、本プロジェクトのスクリプトの範囲外) |
| ③コンテナ実行時(`node server.js`プロセス) | コンテナに渡された環境変数 | `docker-compose.yml`の`environment:`で`HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY`をコンテナに渡す。現状の`server`は外部通信をしないため実害はないが、将来学習者がコードを拡張して外部通信を追加した場合にも自動的にプロキシが効く |

いずれも `.env` の `USE_PROXY` 一つで切替可能です(`scripts/proxy-env.sh`が`USE_PROXY=false`のとき
これらの変数を空にするため、①③は自動的にプロキシなしになります)。

### ホワイトリスト(docker.io / npm のみ)への対応

このオンプレ環境のネットワークホワイトリストは `docker.io` と `npm` のみです。
一方、既存のDocker構築パターンが使う `apk add openssh-server` はAlpine独自の
パッケージミラー(`dl-cdn.alpinelinux.org`)にアクセスするため、**プロキシを経由しても
ホワイトリストの対象外**になります。これはプロキシ設定では解決できません。

そのため、次の運用を前提とします:

1. `server` のDockerイメージは、ホワイトリスト制約のない環境で `scripts/docker-build.sh` を使って
   一度だけビルドする(ベースイメージは `docker.io/library/node:18-alpine` をフルパスで指定済み、
   Docker公式イメージ)。
2. ビルドしたイメージに `docker.io/your-dockerhub-username/onprem-log-training-server:latest`
   のようなフルパスのタグを付け、`docker push` でdocker.io(Docker Hub)へ公開する。
3. `.env` の `DOCKER_IMAGE` に、公開した上記フルパスを設定する。
4. オンプレ環境側では `scripts/docker-pull.sh` で `docker pull` するだけとし、
   `docker build`/`apk add` は一切実行しない。`DOCKER_IMAGE` を常にdocker.ioのフルパスで
   指定することで、コンテナ作成時に他のレジストリと解決を迷う余地をなくしている(上表②)。

`docker pull` 自体のプロキシは、シェルの環境変数ではなくDockerデーモン側の設定
(`/etc/systemd/system/docker.service.d/http-proxy.conf`)で決まります。これはホスト側で
一度だけ行う設定であり、本プロジェクトのスクリプトの範囲外です(詳細は
`scripts/docker-pull.sh`内のコメントを参照)。

## 学習者向け解説資料

インフォグラフ(一枚絵)作成の元原稿として、以下のドキュメントを用意しています。

| ドキュメント | 内容 |
|---|---|
| [docs/01_environment_overview.md](docs/01_environment_overview.md) | この環境の全体構成、client/server分離とTrackIDによるログ相関の説明 |
| [docs/02_building_log_collector_with_ai.md](docs/02_building_log_collector_with_ai.md) | AIエージェントでログ収集ツールを作る際のポイントとプロンプト例 |
| [docs/03_container_basics.md](docs/03_container_basics.md) | コンテナ(Docker)の説明と仮想マシンとの違い |

## プレゼン資料 (マネジメント向け)

デモの流れをベースにした説明資料です。Marp形式のMarkdownなので、GitHub上ではそのまま
読めますし、`marp-cli` があればスライド(PDF/HTML/PPTX)に変換できます。

| 資料 | 内容 |
|---|---|
| [docs/04_incident_detection_presentation.md](docs/04_incident_detection_presentation.md) | 意思決定層向けのスライド原稿 (全24枚)。課題→TrackID相関→デモの流れ→導入ステップ→自動改修への展望 |
| [docs/04_incident_detection_presentation.pdf](docs/04_incident_detection_presentation.pdf) | 上記をスライド化したPDF (960×540 / 16:9)。配布・投影用 |

PDFは生成済みのものをコミットしていますが、Markdownを修正した場合は以下で再生成できます。

```bash
cd docs
# WindowsでChromeのパスを明示する場合 (Linux/macOSでは通常不要)
export CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"

npx --yes @marp-team/marp-cli 04_incident_detection_presentation.md \
  --pdf --allow-local-files --no-stdin -o 04_incident_detection_presentation.pdf

# HTML / PPTX が必要な場合
npx --yes @marp-team/marp-cli 04_incident_detection_presentation.md --no-stdin -o slides.html
npx --yes @marp-team/marp-cli 04_incident_detection_presentation.md --pptx --no-stdin -o slides.pptx
```

各オプションの意味と、付けないと何が起きるかは
[資料化のノウハウ](#資料化のノウハウ)にまとめています。

### インフォグラフ

`docs/infographics/` に画像(2752×1536)を置いています。1枚目が全体を1枚に収めた概要図、
2枚目以降が詳細です。

| 画像 | 内容 |
|---|---|
| [00_overview.png](docs/infographics/00_overview.png) | **一枚絵** — 課題・TrackID相関・4段階・Before/After・展望を1枚に集約 |
| [01_environment.png](docs/infographics/01_environment.png) | 研修環境の構成。client/serverの非対称性と常設された2つの不具合 |
| [02_demo_flow.png](docs/infographics/02_demo_flow.png) | デモの流れ。バグ発火から1件のインシデントに束ねるまでの4ステップ |
| [03_prompt_design.png](docs/infographics/03_prompt_design.png) | AIエージェントへの指示の型。渡すべき6項目とプロンプト例 |
| [04_auto_repair_outlook.png](docs/infographics/04_auto_repair_outlook.png) | 自動改修への展望。状態遷移・役割分担・ガードレール |

画像の元データは `docs/infographics_src/` のHTMLです。修正して再生成できます。

```bash
cd docs/infographics_src
./check-fit.sh     # 1376x768に収まっているか検査 (はみ出しはPNG上で黙って欠落するため)
./render.sh        # ヘッドレスChromeで docs/infographics/*.png を再生成
```

## 資料化のノウハウ

この資料を作る過程で踏んだ落とし穴と対処をまとめます。**同種の資料を別プロジェクトで
作る場合にも、そのまま流用できる内容**です。

### 方針: 追加依存を増やさない

オンプレ環境はホワイトリストが `docker.io` と `npm` のみです。そのため
**画像生成に専用ツール(ImageMagick、mermaid-cli等)を導入していません**。

| 用途 | 使ったもの | 理由 |
|---|---|---|
| スライド | Marp形式のMarkdown | GitHub上でそのまま読める。変換は任意 |
| PDF/HTML/PPTX | `npx @marp-team/marp-cli` | npm経由で取得可。恒久インストール不要 |
| インフォグラフ | HTML + CSS → ヘッドレスChrome | **追加依存ゼロ**。Chromeは既にある |

ヘッドレスChromeを画像レンダラとして使う利点は、**日本語フォントを追加インストール
しなくても正しく描画される**点です(OS標準の游ゴシック/メイリオが使われる)。
図形描画ツールを別途入れる必要もありません。

### PDF化 (Marp → PDF)

```bash
cd docs
export CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"  # Windowsのみ
npx --yes @marp-team/marp-cli <file>.md --pdf --allow-local-files --no-stdin -o <file>.pdf
```

**オプションを付けないと起きること:**

| オプション | 付けないと | 対処の理由 |
|---|---|---|
| `--no-stdin` | **変換成功のログが出るのに、出力ファイルが更新されない** | marp-cliが標準入力を待ち続ける。`</dev/null` でも回避可 |
| `--allow-local-files` | ローカル画像やCSSを参照している場合に読み込まれない | 警告が出るが、手元のMarkdownを変換する用途では想定内 |
| `CHROME_PATH` (Windows) | Chromeが見つからず変換に失敗する | marp-cliがWindowsの標準パスを解決できない場合がある |

`--no-stdin` の空振りは**エラーにならない**のが厄介です。`[INFO] xxx.md => xxx.pdf`
とログが出るため成功に見えます。以下で必ず実際の更新を確認してください。

```bash
# ページ数・用紙サイズ・フォント埋め込みを検証する (PDFは圧縮されているため展開して読む)
python - <<'PY'
import re, zlib
d = open('04_incident_detection_presentation.pdf','rb').read()
pages, boxes, fonts = 0, set(), set()
for m in re.finditer(rb'stream\r?\n', d):
    s = m.end(); e = d.find(b'endstream', s)
    if e < 0: continue
    try: raw = zlib.decompress(d[s:e])
    except Exception: continue
    pages += len(re.findall(rb'/Type\s*/Page\b', raw))
    boxes.update(b.decode() for b in re.findall(rb'/MediaBox\s*\[([^\]]+)\]', raw))
    fonts.update(f.decode() for f in re.findall(rb'/BaseFont\s*/([A-Za-z0-9+\-,]+)', raw))
print('pages:', pages, '/ MediaBox:', boxes)
print('fonts:', sorted(fonts))
PY
```

日本語フォント(`YuGothic` 等)が `fonts` に出れば、**変換した環境以外でも文字化けしません**。
`ls -la` でのファイルサイズ比較も、更新有無の簡易チェックとして有効です。

### Marpスライドで注意すること

- **暗い背景のクラスには、配色を個別に指定する。**
  `section.lead` のような暗背景クラスを作ると、`table` / `code` / `strong` は
  既定の暗い文字色のままなので**背景に沈んで読めなくなります**。実際に最終ページの表が
  判読不能になりました。暗背景クラスごとに以下を上書きしてください。

  ```css
  section.lead code   { background: rgba(255,255,255,.14); color: #cbe4f5; }
  section.lead strong { color: #ffd6a5; }
  section.lead td     { background: rgba(15,23,42,.35); color: #e2e8f0; }
  ```

- **枚数を数えるときは frontmatter の `---` を除く。**
  `grep -c '^---$'` は frontmatter の開始・終了行も拾うため、実際の枚数と合いません
  (この資料でも一度25枚と誤って報告しました)。コードブロック内の `---` も除外が必要です。

- **PDFを目視確認する。** 変換が成功しても、レイアウト崩れやコントラスト不足は
  ログには出ません。PNGに書き出すと1枚ずつ確認しやすくなります。

  ```bash
  npx --yes @marp-team/marp-cli <file>.md --images png --allow-local-files --no-stdin -o /tmp/check/s.png
  ```

### インフォグラフ (HTML → PNG)

`docs/infographics_src/` の2つのスクリプトが要点です。

| スクリプト | 役割 |
|---|---|
| `render.sh` | 1376×768のHTMLを`--force-device-scale-factor=2`で撮影し、2752×1536のPNGを出力 |
| `check-fit.sh` | 固定サイズに収まっているかを数値で検査 |

**なぜ `check-fit.sh` が必要か** — ヘッドレスChromeのスクリーンショットは指定サイズで
切り取られるため、**はみ出した内容はPNG上で黙って欠落します**。エラーも警告も出ません。
画像を1枚ずつ目視しない限り気づけないので、機械的に検査します。

さらに、単純な `scrollHeight` 比較では不十分でした。

> **flexの落とし穴**: `min-height: 0` を持つflex子要素の内側であふれた内容は、
> 親を押し広げずに切り取られます。そのためルート要素の `scrollHeight` を見ると
> 「収まっている」と**誤判定します**。実際に、フッタが欠けた画像を検査が通してしまいました。

`check-fit.sh` は現在、以下の3点を検査します。

1. ルート要素 (`.sheet`) の縦横のあふれ
2. **全子孫要素の内部あふれ** (上記の落とし穴への対処)
3. 本文がフッタ領域に食い込んでいないか

```bash
cd docs/infographics_src
./check-fit.sh              # 全枚検査 (終了コード 1 = はみ出しあり)
./check-fit.sh 00_overview  # 1枚だけ
./render.sh                 # PNG再生成
```

**レイアウト調整のコツ**: はみ出した時は、**当てずっぽうに詰めずに測ってから直す**。
今回、左列を何度も詰めたのに解消せず、実測したら原因は右列でした。列ごとの高さを
出力する使い捨てスクリプトを書くほうが速いです。

また `flex: 1` のスペーサで下端に寄せると、**列の途中に不自然な空白ができます**。
余白が目立つ場合はスペーサで散らすのではなく、**下段に内容のある帯を足して埋める**方が
情報量も増えて読みやすくなります。

## 変更していないもの

このプロジェクトは `projects/log_collector/` 配下のいずれのファイルも変更していません
(`demo-app`, `dev-environment`, `auto-repair-demo`, `log-collector-skill` はすべて既存のまま)。
