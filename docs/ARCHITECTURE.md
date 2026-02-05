# GestureHeal — Architecture Diagrams

---

## 1. High-Level System Architecture

```mermaid
flowchart TB
    subgraph Patient["Patient Device"]
        CAM[Webcam]
        MP[MediaPipe Hands]
        ML[TF.js Model]
        UI[React Frontend]
    end

    subgraph Backend["Backend Services"]
        API[API Server]
        DB[(Database)]
        RT[Real-time WebSocket]
    end

    subgraph Doctor["Doctor Device"]
        DD[Doctor Dashboard]
        NOTIF[Notifications]
    end

    CAM --> MP
    MP --> ML
    ML --> UI
    UI --> API
    API --> DB
    API --> RT
    RT --> DD
    RT --> NOTIF
```

---

## 2. ML Inference Pipeline

```mermaid
flowchart LR
    A[Webcam Frame] --> B[MediaPipe Hands]
    B --> C[21 Landmarks]
    C --> D[Normalize Features]
    D --> E[63-Feature Vector]
    E --> F[TF.js Model]
    F --> G[Raw Predictions]
    G --> H{Confidence > 75%?}
    H -->|No| I[Output: NONE]
    H -->|Yes| J[Temporal Smoothing]
    J --> K[Debounce Check]
    K --> L[Final Gesture]
    L --> M[Trigger Action]
```

---

## 3. Model Architecture

```mermaid
flowchart TB
    INPUT["Input Layer (63 features)"]
    D1["Dense(256) + BatchNorm + Dropout(0.3)"]
    D2["Dense(128) + BatchNorm + Dropout(0.3)"]
    D3["Dense(64) + Dropout(0.2)"]
    OUTPUT["Softmax Output (5 classes)"]

    INPUT --> D1 --> D2 --> D3 --> OUTPUT
```

---

## 4. Gesture Classes

```mermaid
pie title Gesture Distribution
    "YES" : 20
    "NO" : 20
    "NONE" : 30
    "PAIN" : 15
    "HELP" : 15
```

---

## 5. Frontend Component Tree

```mermaid
flowchart TB
    APP[App]
    APP --> LOGIN[Login]
    APP --> PDASH[PatientDashboard]
    APP --> DLANDING[DoctorLanding]
    APP --> PCAM[PatientCamera]
    
    PDASH --> NOTIF[NotificationPanel]
    PDASH --> DOCS[Doctor Cards]
    PDASH --> EMER[Emergency Button]
    
    PCAM --> CAMFEED[Camera Feed]
    PCAM --> EGRID[Emergency Grid]
    PCAM --> GDISP[Gesture Display]
```

---

## 6. User Flow

```mermaid
flowchart LR
    START((Start)) --> LOGIN[Login Screen]
    LOGIN --> |Patient| PDASH[Patient Dashboard]
    LOGIN --> |Doctor| DDASH[Doctor Portal]
    
    PDASH --> BOOK[Book Appointment]
    PDASH --> CAMERA[Start Communication]
    
    CAMERA --> GESTURE[Gesture Detection]
    GESTURE --> ACTION[Trigger Action]
    
    PDASH --> ALERT[Emergency Alert]
    ALERT --> DOCTOR[Notify Doctor]
```

---

## 7. Data Flow

```mermaid
sequenceDiagram
    participant P as Patient
    participant C as Camera
    participant M as MediaPipe
    participant ML as ML Model
    participant UI as Frontend
    participant B as Backend
    participant D as Doctor

    P->>C: Show Hand Gesture
    C->>M: Video Frame
    M->>ML: 21 Landmarks
    ML->>UI: Gesture Prediction
    UI->>B: Emergency Alert
    B->>D: Push Notification
    D->>B: Response
    B->>UI: Doctor Response
    UI->>P: Display Response
```

---

## 8. Technology Stack

```mermaid
flowchart TB
    subgraph Frontend
        REACT[React]
        VITE[Vite]
        CSS[Vanilla CSS]
        TFJS[TensorFlow.js]
        MEDIAPIPE[MediaPipe]
    end

    subgraph Backend["Backend (Future)"]
        NODE[Node.js]
        SUPABASE[Supabase]
        WEBSOCKET[WebSocket]
    end

    subgraph ML["ML Pipeline"]
        PYTHON[Python]
        TF[TensorFlow]
        KERAS[Keras]
        CONVERTER[TFJS Converter]
    end

    ML --> Frontend
    Frontend --> Backend
```

---

*Note: Copy Mermaid code blocks into Mermaid Live Editor or compatible presentation tool to render diagrams.*
