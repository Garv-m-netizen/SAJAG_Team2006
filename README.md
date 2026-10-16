# Sajag AI (CivicPulse) - Chandigarh Edition
## Connected Civic Intelligence, Preventive Action, Verified Resolution, and Community Participation

A complete, functional civic technology prototype designed for Chandigarh, India.

---

## 1. Product Vision and Principles

### Vision Statement
"From citizen reporting to connected civic intelligence, preventive action, verified resolution, and measurable community participation."

Civic complaints in modern municipal administration are traditionally treated as isolated, transient tickets. Once a ticket is closed, institutional memory of that failure is frequently lost.

Sajag AI (CivicPulse) re-engineers municipal problem resolution through:
- Connected incident topology that uncovers recurring chronic hotspots rather than isolated complaints.
- Downstream cascading risk evaluation to prevent infrastructure disasters before they manifest.
- Transparent, constrained optimization for municipal crews, budgets, and operational shifts.
- Two-sided verified resolution combining field photographic proof with community reverification.
- Area-level civic equity analytics to uncover neglected neighborhoods without conflating low complaint volume with citizen satisfaction.
- An auditable citizen rewards ledger that recognizes constructive community participation.

---

## 2. Technology Stack and Architecture

```
                              +-----------------------------------+
                              |     React + Vite + TypeScript     |
                              |   Tailwind CSS (Light Theme Only) |
                              |   Leaflet OSM + Recharts + SVG    |
                              +-----------------+-----------------+
                                                | REST API (JSON)
                              +-----------------+-----------------+
                              |         FastAPI Backend           |
                              |     Pydantic Schemas + JWT        |
                              +---+-------------+---------------+---+
                                  |             |               |
    +-----------------------------+--+   +------+--------+     +┴--------------------------+
    |     Algorithm Services         |   |  SQLAlchemy   |     |  NetworkX Graph Engine    |
    |  - Deterministic Multilingual  |   |  SQLite ORM   |     |  - Proximity linking      |
    |  - Transparent Priority Calc   |   |  Relational DB|     |  - Text Jaccard matching  |
    |  - Ripple Cascading Engine     |   +---------------+     |  - Chronic Cluster Detect |
    |  - Constrained Optimizer       |                         +---------------------------+
    |  - Civic Intelligence Memory   |
    +--------------------------------+
```

### Frontend
- Framework: React 18 with Vite and TypeScript
- Styling: Tailwind CSS configured exclusively with a polished Light Theme (warm white `#F8F9FA`, clean white surfaces `#FFFFFF`, dark charcoal text `#1A1D20`, muted gray `#6C757D`, and restrained teal accents `#0F766E`)
- Mapping: Leaflet with OpenStreetMap tiles for coordinate placement and spatial incident visualization
- Charts: Recharts for area resolution latency and service comparisons
- Graph Visualization: Custom interactive SVG force-directed topology canvas
- Icons: Lucide React

### Backend
- Framework: Python 3.13 with FastAPI
- Validation: Pydantic v2 schemas
- ORM and Persistence: SQLAlchemy 2.0 with local SQLite database
- Graph Processing: NetworkX 3.6 for incident proximity clustering and topological analysis
- Security: Passlib (bcrypt) password hashing, PyJWT authentication, and role-based access control (RBAC)
- Testing: Pytest suite validating end-to-end operational algorithms and APIs

---

## 3. User Roles and Security

The system enforces distinct authorization rules across three user personas:

### 1. Citizen
- Submits civic complaints in Hindi, Punjabi, or English.
- Confirms geographic coordinates via interactive pin or GPS acquisition.
- Uploads supporting documentation (photos, audio files).
- Tracks complaint lifecycle in real-time.
- Participates in community reverification (confirms or disputes field resolutions).
- Views personal points ledger, unlocks badges, and configures leaderboard privacy preferences.

### 2. Field Worker
- Accesses assigned municipal work orders with location coordinates and incident history.
- Updates task progress (Assigned, In Progress, Resolution Submitted).
- Submits photographic proof (before-and-after photos) along with operational notes.
- Subject to duplicate image hash detection and automated validation checks.

### 3. Administrator (Municipal Authority)
- Full visibility across all citywide incidents, clusters, and infrastructure assets.
- Overrides automated priority scores with a mandatory recorded reason and audit trail.
- Dispatches work orders directly to specialized municipal response crews.
- Evaluates resource allocation scenarios in the Intervention Simulator.
- Reviews disputed resolutions and supervises civic equity indicators.
- One-click demonstration sandbox reset and re-seeding mechanism.

---

## 4. Comprehensive Feature Specifications

### Feature 1: Multilingual Civic Reporting
- Supported Languages: Hindi (Devanagari), Punjabi (Gurmukhi), and English.
- Deterministic NLP Extraction: Evaluates complaint text in real-time to infer:
  - Incident category: Garbage and Sanitation, Drainage and Waterlogging, Potholes and Damaged Roads, Broken Streetlights, Water Supply, Public Infrastructure Damage, Traffic and Pedestrian Safety, or Other.
  - Urgency rating: Low, Medium, High, or Critical.
  - Detected language.
  - Safety hazard indicators: Identifies critical terms (e.g., exposed wires, collapses, deep craters).
  - Location clues and missing information checklist.
  - Extraction confidence score (0.00 to 1.00).
- Transparent Priority Calculation:
  - Formula: Urgency (35%) + Impact Scale (30%) + Recurrence Boost (15%) + Aging Duration (10%) + Evidence Confidence (10%).
  - Emergency Safety Floor: First-time critical life-safety hazards automatically receive a score of at least 80/100 regardless of recurrence.
  - Factor Breakdown: Every incident stores a human-readable explanation of why that priority was assigned.

### Feature 2: Civic Incident Graph (NetworkX)
- Real graph model representing citizen reports, canonical clusters, geographic locations, infrastructure assets, and departments.
- Relationship Detection:
  - Duplicate Reports: Distance <= 120m and word token similarity >= 35%.
  - Recurring Patterns: Distance <= 300m and vocabulary overlap in the same sector.
  - Infrastructure Adjacency: Distance <= 450m from mapped civic infrastructure assets.
  - Downstream Risks: Upstream drainage or sanitation blockages near transit underpasses.
- Interactive Graph Visualizer:
  - SVG canvas rendering circular incident nodes, rectangular cluster nodes, and diamond infrastructure nodes.
  - Filters by Sector, Category, and Lifecycle Status.
  - Inspection panel displaying node properties, linked relationships, confidence levels, and connection explanations.

### Feature 3: Civic Ripple Intelligence
- Predictive cascading risk assessment engine modeling downstream infrastructural consequences.
- Meteorological Scenarios (Simulated):
  - Dry Weather: 0mm precipitation, baseline multiplier 1.0x.
  - Moderate Monsoon Shower: 35mm precipitation, risk multiplier 1.8x.
  - Heavy Monsoon Cloudburst: 95mm precipitation, risk multiplier 3.2x.
- Risk Output:
  - Potential downstream risk description.
  - Dynamic risk score (0 to 100).
  - Supporting evidence, operational assumptions, and missing telemetry data.
  - Actionable preventive recommendation prior to peak weather stress.
  - Clear labeling of relationship type (Observed Relationship vs Inferred Hypothesis).

### Feature 4: Municipal Intervention Simulator
- Decision-support constrained optimization tool for municipal leadership.
- Dynamic Inputs:
  - Available crews (1 to 4 specialized units: Drainage/Desilting, Roadways/Asphalt, Illumination/Electrical, Public Health/Water).
  - Budget ceiling (adjustable from INR 50,000 to INR 500,000).
  - Shift time horizon (12 to 72 hours).
  - Weather multiplier (Dry, Moderate Rain, Heavy Monsoon).
- Optimization Outputs:
  - Recommended action plan matching crew skill sets to incident categories.
  - Expected incidents mitigated and downstream risk reduction.
  - Estimated resource utilization (total cost in INR and crew hours).
  - Explicit list of critical residual risks left unaddressed due to budget or crew limitations.
  - Alternative comparison plans (Safety-First Emergency vs Maximum Geographic Coverage).

### Feature 5: Proof of Resolution and Community Reverification
- Field Worker Proof Protocol:
  - Required completion/after photograph and detailed operational description.
  - Automated validation checking image presence, note length, and duplicate photo hash reuse.
- Community Reverification:
  - Submissions trigger in-app notifications to the original complainant and related contributors.
  - Citizen Feedback Options:
    - Confirmed Resolved: Transitions incident to Resolved, awards citizen verification points.
    - Problem Still Exists: Reopens the incident and alerts municipal administrators with citizen notes.
    - Unable to Verify: Keeps incident pending secondary review.
  - Protection against automated accusations: Disputed resolutions trigger administrative investigation rather than arbitrary worker penalties.

### Feature 6: Civic Equity and Neglected-Area Detection
- Area-level comparative analytics across 8 sectors in Chandigarh.
- Avoids the False Baseline Fallacy: Low complaint count is not treated as a signal of high satisfaction.
- Evaluates:
  - Average resolution latency compared against the citywide baseline.
  - Backlog of active unresolved complaints.
  - Number of critical/severe unresolved hazards.
  - Chronic recurring hotspot count.
  - Under-reporting digital divide anomaly: Identifies aging infrastructure coupled with low report volume.
- Visual comparative charts powered by Recharts and actionable flagging explanations.

### Feature 7: Civic Champion Rewards and Auditable Points Ledger
- Points Ledger Architecture:
  - Immutable database transactions with uniqueness constraints preventing duplicate point awards for the same incident or action.
- Configurable Point Rules:
  - Valid civic report submitted: +10 points
  - Clear evidence attached: +5 points
  - Report confirmed as genuine municipal issue: +10 points
  - Report contributes directly to verified resolution: +15 points
  - Community reverification feedback submitted: +3 points
  - Identification of chronic recurring hotspot: +20 points
- Progression Tiers:
  - Civic Observer: 0 to 40 points
  - Community Helper: 41 to 100 points
  - Civic Champion: 101 to 250 points
  - Neighborhood Guardian: 251+ points
- Badges: Verified Reporter, Evidence Contributor, Resolution Supporter, Recurring Issue Detective, Community Guardian.
- Privacy-Protected Annual Leaderboard:
  - Ranks contributors for the active calendar year.
  - Configurable privacy preference: Citizens can toggle anonymous display (e.g. "Garv S." instead of full name).

### Feature 8: Civic Intelligence Memory
- Stores historical patterns of chronic municipal problems.
- Connects new incoming complaints with past resolutions in the same sector and category.
- Computes recurrence intervals (e.g., drain re-clogs within 4.5 days of desilting).
- Generates failure mode insights (e.g., commercial grease discharge) and recommends structural infrastructure inspection rather than repetitive surface cleanup.

### Feature 9: Administration Console and Audit Trail
- Comprehensive incident registry with search and lifecycle filtering.
- Priority Override Workflow: Administrators can manually change priority scores, requiring a mandatory justification reason.
- Immutable System Audit Trail: Captures overrides, work order assignments, status transitions, and timestamps.
- Demonstration Environment Reset: Resets and re-seeds the sandbox with one click.

---

## 5. Evaluator Demo Accounts

For hackathon judges and evaluators, the application includes one-click demo persona login buttons on the login screen and a "Switch Persona" menu in the navigation bar:

| Role | Name | Email | Password | Scope and Key Actions |
|---|---|---|---|---|
| Administrator | Dr. Rajesh Sharma | admin@civicpulse.chandigarh.gov.in | Admin@123 | Full authority: Priority overrides, worker assignments, intervention simulator, audit log review |
| Field Worker | Vikram Singh | worker1@civicpulse.chandigarh.gov.in | Worker@123 | Sanitation and drainage unit: View assigned work orders, upload before/after photographic proof |
| Field Worker | Sunil Kumar | worker2@civicpulse.chandigarh.gov.in | Worker@123 | Roads and illumination unit: Asphalt patching, street illumination orders |
| Citizen | Garv Sharma | citizen1@chandigarh.org | Citizen@123 | Sector 22 resident: Report complaints in Hindi/English, view points ledger, track reports |
| Citizen | Simran Kaur | citizen2@chandigarh.org | Citizen@123 | Sector 17 resident: Community reverifier, earned badges, confirmed resolutions |

---

## 6. Installation and Setup Instructions

### Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher with npm

### 1. Backend Setup
1. Open a terminal in the project root:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the automated test suite:
   ```bash
   python -m pytest tests -v
   ```
4. Start the backend development server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```
   - API Root: http://127.0.0.1:8000/
   - Interactive Swagger API Documentation: http://127.0.0.1:8000/docs

### 2. Frontend Setup
1. Open a second terminal:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev -- --host 127.0.0.1 --port 5173
   ```
4. Access the web application:
   ```
   http://127.0.0.1:5173/
   ```

---

## 7. Feature Verification Status

| Feature | Implementation Status | Test Coverage |
|---|---|---|
| Light Theme Design System | Implemented | Verified across all 10 pages |
| Multilingual Reporting (Hindi, Punjabi, English) | Implemented | test_nlp_extraction_hindi, test_nlp_extraction_punjabi, test_nlp_extraction_english |
| Deterministic Intent and Urgency Extraction | Implemented | test_nlp_extraction_* |
| Transparent Priority Score with Emergency Floor | Implemented | test_priority_calculator_first_time_emergency, test_priority_calculator_recurrence_boost |
| NetworkX Civic Incident Graph | Implemented | test_network_graph_generation, test_haversine_and_token_similarity |
| Ripple Intelligence Risk Engine | Implemented | test_ripple_engine_scenarios |
| Constrained Intervention Simulator | Implemented | test_intervention_simulator_resource_constraints |
| Field Worker Proof of Resolution | Implemented | test_resolution_evidence_validation |
| Community Reverification Protocol | Implemented | test_resolution_evidence_validation |
| Civic Equity and Neglected Area Detection | Implemented | Verified via equity analytics service |
| Civic Champion Rewards and Points Ledger | Implemented | test_rewards_points_and_idempotency |
| Civic Intelligence Memory Service | Implemented | Verified via recurrence interval tracking |
| Administrative Overrides and Audit Trail | Implemented | test_login_and_roles |

---

## 8. Integration-Ready Roadmap

The current prototype operates with local deterministic services and synthetic demonstration data. Clean software interfaces are in place for production integrations:

| Component | Current Implementation | Production Target Integration |
|---|---|---|
| Multilingual NLP | Deterministic keyword/grammar rule engine | Fine-tuned IndicBERT / Bhashini Multilingual LLM |
| Speech-to-Text | Form audio upload simulation | Bhashini Speech API / Whisper STT |
| Weather Forecasting | 3 synthetic meteorological profiles | Live India Meteorological Department (IMD) API |
| Computer Vision | Metadata checks and image hash deduplication | Pluggable visual verification model (YOLO / CLIP) |
| Notifications | In-app notification center with real-time polling | WebPush / SMS Gateway / WhatsApp Business API |

---

## 9. 5-Minute Demonstration Script for Judges

1. Operations Overview (Minute 1):
   - Navigate to the Overview page at http://127.0.0.1:5173/.
   - Note the strict light-theme design, dynamic database metrics, and the Leaflet incident map.
   - Click any incident marker to display the priority score, status, and landmark details.

2. Multilingual Citizen Reporting (Minute 2):
   - Navigate to "Report an Issue" (/report).
   - Click the Hindi sample button: "सीवर व नाला जाम".
   - Point out the real-time extraction preview: Detected Language: hi, Inferred Category: Drainage, Urgency: High.
   - Submit the complaint. Highlight the transparent Priority Score breakdown and the immediate +10 point credit in the user ledger.

3. Civic Incident Graph (Minute 3):
   - Navigate to "Civic Incident Graph" (/graph).
   - Explain how NetworkX analyzes spatial proximity and vocabulary overlap to link related complaints into a canonical cluster in Sector 22, connecting them to the Sector 17/22 Underpass.
   - Click a node to inspect the topological relationship explanation panel.

4. Ripple Intelligence and Intervention Simulator (Minute 4):
   - Navigate to "Ripple Intelligence" (/ripple).
   - Switch from "Dry Weather" to "Heavy Monsoon Cloudburst" and observe downstream underpass flood risk increase from 42% to 92%.
   - Navigate to "Response Simulator" (/intervention).
   - Adjust the Available Crews slider from 2 to 3. Watch the knapsack optimization algorithm recompute the optimal dispatch schedule and cost in real-time.

5. Verified Resolution and Rewards (Minute 5):
   - Navigate to "Resolution Center" (/resolution).
   - Switch persona to Vikram Singh (Field Worker) to view assigned work orders and inspect before/after proof.
   - Switch back to Garv Sharma (Citizen) to demonstrate Community Reverification ("Confirmed Resolved" vs "Problem Still Exists"), awarding +3 points.
   - Open "Champion Rewards" (/rewards) to show the immutable points ledger, earned badges, and privacy-protected annual leaderboard.

---

## 10. License and Operational Disclaimer

Sajag AI (CivicPulse) is an open civic technology prototype. All civic incident records, infrastructure vulnerability ratings, and citizen profiles in the demonstration environment are synthetic demonstration records representative of Chandigarh, India.
