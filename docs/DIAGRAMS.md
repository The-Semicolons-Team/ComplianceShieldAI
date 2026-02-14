# ComplianceShield AI — Diagrams

This document contains Mermaid diagrams for hackathon presentations and technical documentation. They render on GitHub and in any Mermaid-compatible viewer.

---

## 1. User Journey (End-to-End)

```mermaid
journey
    title MSME User Journey with ComplianceShield AI
    section Onboarding
      Sign up: 5: User
      Connect email (OAuth): 5: User
      Set notification preferences: 4: User
    section Daily
      System checks email: 5: System
      AI extracts notices: 5: System
      Risk assessed: 5: System
      Reminder received: 5: User
    section Action
      View dashboard/API: 5: User
      Acknowledge notice: 5: User
      Complete compliance: 5: User
```

---

## 2. Data Flow (Email → Notification)

```mermaid
flowchart TB
    subgraph Input
        A[📧 Government Emails<br/>.gov.in / .nic.in]
    end

    subgraph Ingestion
        B[EventBridge Schedule]
        C[Lambda: Email Retrieval]
        D[OAuth Token from Secrets Manager]
        E[SQS: Email Batches]
    end

    subgraph Processing
        F[Lambda: Compliance Extraction]
        G[Bedrock + Textract + Comprehend]
        H[Structured JSON]
        I[Lambda: Risk Assessment]
        J[DynamoDB: Metadata]
    end

    subgraph Output
        K[Lambda: Notifications]
        L[SNS + SES]
        M[📱 User: Email / SMS]
    end

    A --> C
    B --> C
    D --> C
    C --> E
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
    I --> K
    J --> K
    K --> L
    L --> M
```

---

## 3. Sequence: From Email to Alert

```mermaid
sequenceDiagram
    participant EB as EventBridge
    participant L1 as Lambda (Retrieval)
    participant SM as Secrets Manager
    participant Gmail as Gmail API
    participant SQS as SQS
    participant L2 as Lambda (Extraction)
    participant BR as Bedrock
    participant L3 as Lambda (Risk)
    participant DDB as DynamoDB
    participant L4 as Lambda (Notify)
    participant SNS as SNS/SES
    participant User as User

    EB->>L1: Trigger (e.g. every 4h)
    L1->>SM: Get OAuth token
    SM-->>L1: Token
    L1->>Gmail: List messages (gov domains)
    Gmail-->>L1: Message IDs
    L1->>SQS: Send batch(es)
    L1->>DDB: Update last sync

    SQS->>L2: Batch of emails
    L2->>Gmail: Get body + attachments
    L2->>BR: Extract compliance (prompt)
    BR-->>L2: Structured JSON
    L2->>DDB: Write compliance metadata
    L2->>L3: Invoke risk assessment

    L3->>DDB: Read notice + history
    L3->>L3: Compute risk level
    L3->>DDB: Update risk_level, risk_score
    alt Critical risk
        L3->>L4: Invoke (immediate notify)
    end

    L4->>DDB: Read preferences
    L4->>SNS: Publish (email/SMS)
    SNS->>User: Notification
```

---

## 4. Component Overview (Layers)

```mermaid
flowchart TB
    subgraph Presentation
        Web[Web / Mobile]
        API_Consumers[API Consumers]
    end

    subgraph API Layer
        APIGW[API Gateway]
        WAF[WAF]
    end

    subgraph Auth
        Cognito[Cognito]
        Secrets[Secrets Manager]
    end

    subgraph Compute
        L_Retrieve[Lambda: Email Retrieval]
        L_Extract[Lambda: Extraction]
        L_Risk[Lambda: Risk]
        L_Notify[Lambda: Notifications]
    end

    subgraph AI
        Bedrock[Bedrock]
        Textract[Textract]
        Comprehend[Comprehend]
    end

    subgraph Storage
        DDB[(DynamoDB)]
        S3[(S3 Temp)]
    end

    subgraph Messaging
        EventBridge[EventBridge]
        SQS[SQS]
        SNS[SNS]
        SES[SES]
    end

    Web --> APIGW
    API_Consumers --> APIGW
    APIGW --> WAF
    WAF --> Cognito
    EventBridge --> L_Retrieve
    L_Retrieve --> Secrets
    L_Retrieve --> SQS
    SQS --> L_Extract
    L_Extract --> Bedrock
    L_Extract --> Textract
    L_Extract --> Comprehend
    L_Extract --> DDB
    L_Extract --> L_Risk
    L_Risk --> DDB
    L_Risk --> L_Notify
    L_Notify --> SNS
    L_Notify --> SES
    L_Extract --> S3
```

---

## 5. Risk Level Decision Flow

```mermaid
flowchart TD
    A[Compliance Notice Extracted] --> B{Deadline in ≤7 days?}
    B -->|Yes| C[+40 points]
    B -->|No| D{Deadline in ≤14 days?}
    D -->|Yes| E[+30 points]
    D -->|No| F{Deadline in ≤30 days?}
    F -->|Yes| G[+20 points]
    F -->|No| H[+10 points]

    C --> I{Penalty ≥ ₹1,00,000?}
    E --> I
    G --> I
    H --> I
    I -->|Yes| J[+30]
    I -->|No| K[+20 / +10 / +5]

    J --> L[× Category weight]
    K --> L
    L --> M{Missed deadlines /<br/>Repeat violation?}
    M -->|Yes| N[+15 / +10]
    M -->|No| O[Score as-is]
    N --> P{Score ≥ 70?}
    O --> P
    P -->|Yes| Q[🔴 Critical]
    P -->|No| R{Score ≥ 50?}
    R -->|Yes| S[🟠 High]
    R -->|No| T{Score ≥ 30?}
    T -->|Yes| U[🟡 Medium]
    T -->|No| V[🟢 Low]
```

---

## 6. Security & Data Residency

```mermaid
flowchart LR
    subgraph User_Data["User & Email"]
        User[User]
        Email[Email Provider]
    end

    subgraph AWS_India["AWS India Regions"]
        subgraph Encrypted
            KMS[KMS Keys]
            DDB[(DynamoDB)]
            Secrets[Secrets]
            S3[(S3)]
        end
        Trail[CloudTrail]
        WAF[WAF]
    end

    User -->|TLS 1.3| WAF
    Email -->|OAuth 2.0| Secrets
    KMS --> DDB
    KMS --> Secrets
    KMS --> S3
    Trail -.->|Audit| DDB
    Trail -.->|Audit| Secrets
```

---

## 7. Notification Timeline (Reminders)

```mermaid
gantt
    title Deadline Reminder Schedule (example: deadline = Day 0)
    dateFormat  YYYY-MM-DD
    section Critical
    Immediate alert     :crit,  -30d, 1d
    1 day before       :crit,   -1d, 1d
    section High
    7 days before       :high,   -7d, 1d
    1 day before       :high,   -1d, 1d
    section Medium
    14 days before      :med,   -14d, 1d
    3 days before      :med,    -3d, 1d
    section Low
    30 days before      :low,   -30d, 1d
```

---

You can copy these diagrams into slides (e.g. Mermaid Live Editor, Notion, Confluence) or export as images for your hackathon deck.
