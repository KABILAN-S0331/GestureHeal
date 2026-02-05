# GestureHeal — Repository Structure

---

## Recommended Folder Structure

```
gesture-heal/
├── 📁 docs/
│   ├── PROJECT_REPORT.md
│   ├── PPT_CONTENT.md
│   ├── JUDGE_QA.md
│   ├── DEMO_SCRIPT.md
│   ├── ARCHITECTURE.md
│   └── REPO_STRUCTURE.md
│
├── 📁 ml/
│   ├── 📁 data/
│   │   ├── raw/
│   │   │   ├── yes_samples.csv
│   │   │   ├── no_samples.csv
│   │   │   ├── none_samples.csv
│   │   │   ├── pain_samples.csv
│   │   │   └── help_samples.csv
│   │   ├── processed/
│   │   │   └── merged_dataset.csv
│   │   └── README.md
│   │
│   ├── 📁 models/
│   │   ├── gesture_model.keras
│   │   ├── gesture_model_tfjs/
│   │   │   ├── model.json
│   │   │   └── weights.bin
│   │   └── training_history.json
│   │
│   ├── 📁 notebooks/
│   │   ├── 01_data_collection.ipynb
│   │   ├── 02_data_preprocessing.ipynb
│   │   ├── 03_model_training.ipynb
│   │   ├── 04_model_evaluation.ipynb
│   │   └── 05_tfjs_export.ipynb
│   │
│   ├── 📁 scripts/
│   │   ├── capture_tool.py
│   │   ├── merge_datasets.py
│   │   ├── train_model.py
│   │   └── export_tfjs.py
│   │
│   └── requirements.txt
│
├── 📁 src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   ├── icons.jsx
│   │
│   ├── 📁 components/
│   │   ├── Login.jsx
│   │   ├── PatientDashboard.jsx
│   │   ├── PatientCamera.jsx
│   │   ├── DoctorLanding.jsx
│   │   ├── NotificationPanel.jsx
│   │   └── EmergencyGrid.jsx
│   │
│   ├── 📁 hooks/
│   │   ├── useGestureDetection.js
│   │   ├── useMediaPipe.js
│   │   └── usePredictionStability.js
│   │
│   ├── 📁 utils/
│   │   ├── landmarkNormalizer.js
│   │   ├── gestureClassifier.js
│   │   └── stabilityPipeline.js
│   │
│   └── 📁 assets/
│       ├── model.json
│       └── weights.bin
│
├── 📁 public/
│   ├── favicon.ico
│   └── index.html
│
├── 📁 backend/ (Future)
│   ├── server.js
│   ├── routes/
│   ├── controllers/
│   └── models/
│
├── .gitignore
├── package.json
├── vite.config.js
├── README.md
└── LICENSE
```

---

## File Descriptions

### `/docs/`
All documentation files for hackathon submission.

### `/ml/`
Machine learning pipeline:
- **data/**: Training datasets
- **models/**: Saved models (.keras and TFJS)
- **notebooks/**: Jupyter notebooks for experiments
- **scripts/**: Python scripts for automation

### `/src/`
React frontend application:
- **components/**: Reusable UI components
- **hooks/**: Custom React hooks for ML integration
- **utils/**: Helper functions
- **assets/**: ML model files for browser

### `/public/`
Static assets served by Vite.

### `/backend/` (Future)
Node.js backend for:
- User authentication
- Appointment system
- Real-time notifications

---

## Key Files

| File | Purpose |
|------|---------|
| `App.jsx` | Main application with routing |
| `icons.jsx` | Custom SVG icon components |
| `index.css` | Global styles with CSS variables |
| `useGestureDetection.js` | Hook for ML prediction pipeline |
| `model.json` | TF.js model architecture |
| `weights.bin` | Model weights for inference |

---

## Git Ignore Suggestions

```gitignore
# Dependencies
node_modules/
__pycache__/
*.pyc

# Build
dist/
build/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/

# ML artifacts (large files)
*.h5
*.keras
ml/data/raw/*.csv

# Logs
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db
```

---

## README Template

```markdown
# GestureHeal 🏥✋

AI-powered gesture recognition for medical communication.

## Quick Start

```bash
npm install
npm run dev
```

## Features
- Real-time hand gesture detection
- Emergency alert system
- Appointment booking
- Doctor notifications

## Tech Stack
- React + Vite
- TensorFlow.js
- MediaPipe Hands

## Team
Core Z

## License
MIT
```

---

*This structure supports both hackathon demo and future production development.*
