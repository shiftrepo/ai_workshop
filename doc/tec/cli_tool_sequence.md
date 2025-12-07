sequenceDiagram
    autonumber
    actor User as ユーザ
    participant ClaudeCode as Claude Code<br/>(AIツール本体)
    participant SubAgent as サブエージェント<br/>(特定タスク担当)
    participant Skill as Skill<br/>(機能・道具)
    participant MCP as MCPサーバ<br/>(外部データ接続)
    participant LLM as LLM<br/>(Claudeモデル)

    %% --- 事前準備フェーズ ---
    rect rgb(240, 248, 255)
        note over ClaudeCode, LLM: 【事前準備】ツールの登録とコンテキスト構築
        
        ClaudeCode->>SubAgent: 1. サブエージェントとSkillをロード
        ClaudeCode->>MCP: 2. MCPサーバへ接続・機能一覧を取得
        MCP-->>ClaudeCode: ツール定義(Description)を返却
        
        note right of ClaudeCode: 「何ができるか」の情報を収集し<br/>LLMが理解できる形式に変換
        
        ClaudeCode->>LLM: 3. システムプロンプト送信<br/>(ツール定義・役割・コンテキストの共有)
        LLM-->>ClaudeCode: 準備完了 (Ready)
    end

    %% --- 実行フェーズ ---
    rect rgb(255, 250, 245)
        note over User, LLM: 【実行フェーズ】プロンプト入力から回答生成まで

        User->>ClaudeCode: 4. プロンプト入力<br/>「〇〇のデータを分析して」
        
        note right of ClaudeCode: ユーザの意図を理解するため<br/>LLMへ問い合わせる

        ClaudeCode->>LLM: 5. ユーザ入力を送信
        LLM-->>ClaudeCode: 6. 思考・判断<br/>「サブエージェントXのSkill Yが必要」

        ClaudeCode->>SubAgent: 7. 適切なサブエージェントを呼び出し

        rect rgb(230, 230, 250)
            note right of SubAgent: 具体的な作業の実行

            SubAgent->>Skill: 8. Skillの利用要求
            Skill->>MCP: 9. MCP経由でデータ取得/操作
            MCP-->>Skill: 10. 実データ・実行結果を返却
            Skill-->>SubAgent: 結果を渡す
        end

        SubAgent->>ClaudeCode: 11. 実行結果を報告

        note right of ClaudeCode: 道具を使った結果を<br/>LLMに読ませて最終回答を作る

        ClaudeCode->>LLM: 12. ツール実行結果(Observation)を送信
        LLM-->>ClaudeCode: 13. 結果を解釈し、最終回答を生成
    end

    ClaudeCode-->>User: 14. 最終回答を表示