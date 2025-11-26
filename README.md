# Airtable Dynamic Form Builder

A full-stack MERN application for creating dynamic forms with Airtable integration, conditional logic, and automatic data synchronization.

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v16+)
- MongoDB Atlas account
- Airtable account

---

## Backend Setup

### 1. Install Dependencies
cd backend
npm install


### 2. Environment Variables

Create `backend/.env`:
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/airtable-forms
JWT_SECRET=your_random_secret_key_here

AIRTABLE_CLIENT_ID=your_airtable_client_id
AIRTABLE_CLIENT_SECRET=your_airtable_client_secret
AIRTABLE_REDIRECT_URI=http://localhost:5000/api/auth/airtable/callback

FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

AIRTABLE_WEBHOOK_SECRET=your_webhook_secret


### 3. Run Backend
npm run dev


Backend runs on `http://localhost:5000`

---

## Frontend Setup

### 1. Install Dependencies
cd frontend
npm install


### 2. Environment Variables

Create `frontend/.env`:
REACT_APP_API_URL=http://localhost:5000/api


### 3. Run Frontend
npm start


Frontend runs on `http://localhost:3000`

---

## Airtable OAuth Setup

### 1. Create OAuth Integration

1. Go to [https://airtable.com/create/oauth](https://airtable.com/create/oauth)
2. Click **"Register New OAuth Integration"**
3. Fill in details:
   - **Name**: Form Builder App
   - **Redirect URL**: `http://localhost:5000/api/auth/airtable/callback`

### 2. Configure Scopes

Enable these scopes:
- `data.records:read`
- `data.records:write`
- `schema.bases:read`
- `schema.bases:write`
- `webhook:manage`

### 3. Get Credentials

After creating, copy:
- **Client ID** → `AIRTABLE_CLIENT_ID` in `.env`
- **Client Secret** → `AIRTABLE_CLIENT_SECRET` in `.env`

### 4. Create Airtable Base

1. Create a new base in Airtable
2. Add a table with fields (e.g., Name, Email, Message)
3. Supported field types:
   - Single line text
   - Long text
   - Single select
   - Multiple select
   - Attachment

---

## Data Model

### User Schema
{
airtableUserId: String,
email: String,
accessToken: String,
refreshToken: String,
tokenExpiry: Date,
scopes: [String],
loginTimestamp: Date
}


### Form Schema
{
title: String,
description: String,
ownerId: ObjectId,
airtableBaseId: String,
airtableTableId: String,
questions: [
{
questionKey: String,
airtableFieldId: String,
label: String,
type: String,
required: Boolean,
options: [String],
conditionalRules: {
logic: "AND" | "OR",
conditions: [
{
questionKey: String,
operator: "equals" | "notEquals" | "contains",
value: Mixed
}
]
}
}
],
submissionCount: Number,
isActive: Boolean
}


### Response Schema
{
formId: ObjectId,
airtableRecordId: String,
answers: Map,
deletedInAirtable: Boolean,
createdAt: Date,
updatedAt: Date
}


---

## Conditional Logic Explanation

### How It Works

Questions can be shown or hidden based on previous answers using conditional rules.

### Logic Structure

**AND Logic**: All conditions must be true
{
logic: "AND",
conditions: [
{ questionKey: "role", operator: "equals", value: "Developer" },
{ questionKey: "experience", operator: "contains", value: "5" }
]
}


**OR Logic**: Any condition must be true
{
logic: "OR",
conditions: [
{ questionKey: "role", operator: "equals", value: "Developer" },
{ questionKey: "role", operator: "equals", value: "Designer" }
]
}


### Operators

- `equals` - Exact match
- `notEquals` - Does not match
- `contains` - Partial match (case-insensitive)

### Example

**Show GitHub URL field only if role is "Developer":**

{
questionKey: "github_url",
label: "GitHub URL",
conditionalRules: {
logic: "AND",
conditions: [
{
questionKey: "role",
operator: "equals",
value: "Developer"
}
]
}
}


### Evaluation Function

function shouldShowQuestion(rules, answers) {
if (!rules) return true;

const results = rules.conditions.map(condition =>
evaluateCondition(condition, answers)
);

return rules.logic === 'OR'
? results.some(Boolean)
: results.every(Boolean);
}


---

## Webhook Configuration

### Local Development (ngrok required)

Airtable webhooks require HTTPS. For local testing:

1. **Install ngrok**
npm install -g ngrok
ngrok http 5000


2. **Update .env**
BACKEND_URL=https://xxxx-xx-xx-xx-xx.ngrok-free.app


3. **Restart backend** - Webhooks will auto-register with forms

### Production

Webhooks work automatically when deployed to HTTPS URLs (Render/Railway).

### What Webhooks Do

- Sync Airtable record updates to MongoDB
- Mark deleted Airtable records in database
- Keep both databases in sync automatically

---

## How to Run the Project

### Quick Start

**Terminal 1 - Backend:**
cd backend
npm install
npm run dev


**Terminal 2 - Frontend:**
cd frontend
npm install
npm start


**Terminal 3 - MongoDB (if local):**
mongod



### Complete Workflow

1. **Start backend & frontend** (see above)
2. **Open browser** → `http://localhost:3000`
3. **Click "Connect with Airtable"** → Login via OAuth
4. **Create a form**:
   - Select Airtable base
   - Select table
   - Choose fields
   - Configure conditional logic
   - Save form
5. **Share form link** → Copy from dashboard
6. **Fill out form** → Open link in new tab/incognito
7. **View responses** → Dashboard → Click "Responses"
8. **Export data** → CSV or JSON download

---

## API Endpoints

### Authentication
- `GET /api/auth/airtable` - Initiate OAuth
- `GET /api/auth/airtable/callback` - OAuth callback
- `GET /api/auth/me` - Get current user
- `GET /api/auth/bases` - List Airtable bases
- `GET /api/auth/bases/:baseId/tables` - List tables
- `GET /api/auth/bases/:baseId/tables/:tableId/schema` - Get fields

### Forms
- `POST /api/forms` - Create form
- `GET /api/forms` - List user's forms
- `GET /api/forms/:id` - Get form details
- `PUT /api/forms/:id` - Update form
- `DELETE /api/forms/:id` - Delete form

### Responses
- `POST /api/forms/:id/submit` - Submit form response
- `GET /api/forms/:id/responses` - List responses
- `GET /api/forms/:id/export/csv` - Export as CSV
- `GET /api/forms/:id/export/json` - Export as JSON

### Webhooks
- `POST /api/webhooks/airtable` - Receive Airtable webhook events

---


## Demo Video

[https://drive.google.com/file/d/1GZAPQ1ClsvUPapVLrinLZoDm_dMX_AHJ/view?usp=drive_link]

---

## Tech Stack

**Frontend:**
- React 18
- React Router v6
- Axios
- CSS (vanilla)

**Backend:**
- Node.js
- Express
- MongoDB + Mongoose
- JWT Authentication
- Airtable API

**External Services:**
- Airtable OAuth 2.0 + PKCE
- MongoDB Atlas
- Airtable REST API
- Airtable Webhooks

---

## Project Structure

airtable-form-builder/
├── backend/
│ ├── src/
│ │ ├── config/
│ │ │ └── db.js
│ │ ├── models/
│ │ │ ├── User.js
│ │ │ ├── Form.js
│ │ │ └── Response.js
│ │ ├── routes/
│ │ │ ├── auth.js
│ │ │ ├── forms.js
│ │ │ ├── responses.js
│ │ │ └── webhooks.js
│ │ ├── middleware/
│ │ │ └── authenticate.js
│ │ ├── utils/
│ │ │ ├── airtableClient.js
│ │ │ └── conditionalLogic.js
│ │ └── server.js
│ ├── .env
│ └── package.json
│
├── frontend/
│ ├── src/
│ │ ├── components/
│ │ │ ├── Dashboard/
│ │ │ ├── FormBuilder/
│ │ │ ├── FormViewer/
│ │ │ └── Responses/
│ │ ├── pages/
│ │ ├── services/
│ │ ├── context/
│ │ └── App.js
│ ├── .env
│ └── package.json
│
└── README.md



---

## Troubleshooting

### "No bases showing in form builder"
- Create at least one base in Airtable
- Check OAuth scopes include `schema.bases:read`

### "OAuth error: invalid_client"
- Verify `AIRTABLE_CLIENT_ID` and `AIRTABLE_CLIENT_SECRET` are correct
- Check redirect URI matches exactly in Airtable settings

### "Form submission failed"
- Ensure field names in form match Airtable field names
- Check Airtable table has all required fields

### "Webhook creation failed"
- Use ngrok for local development (webhooks need HTTPS)
- In production, ensure `BACKEND_URL` uses HTTPS


## Author

Saad

---

## Submission Notes

This project demonstrates:
- OAuth 2.0 + PKCE implementation
- Dynamic form generation from external schema
- Complex conditional logic engine
- Real-time data synchronization
- Full-stack MERN development
- RESTful API design
- Webhook integration