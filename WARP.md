# 🚍 Transit Net Optimizer – Warp Reference

This document provides setup, usage, and development references for **Transit Net Optimizer (TNO)**.  
Use this as a **guide for Warp AI agent** and new contributors.

---

## 📖 Project Overview

**Transit Net Optimizer** is a **Node.js + Express** application with **MongoDB**, built to:

- Manage and visualize **public transport routes** and **mobility data**.  
- Optimize networks using **origin–destination (OD) flows**.  
- Currently supports **Pakistani cities**: Islamabad, Lahore, Karachi, Faisalabad.  
- Designed for **Policy Makers** and **Transport Engineers**.  

---

## ⚙️ Tech Stack

- **Backend:** Node.js + Express.js  
- **Frontend:** EJS + Leaflet.js  
- **Database:** MongoDB (via Mongoose ODM)  
- **Auth:** express-session (roles: PolicyMaker / Engineer)  
- **File Uploads:** express-fileupload, csv-parse  
- **External API:** OpenRouteService (ORS)  
- **Deployment:** Vercel  

---

## 📂 Directory Structure

```
├── app.js                 # Entry point
├── server/
│   ├── config/db.js       # MongoDB connection
│   ├── controllers/       # Route handlers
│   │   ├── user/          # Authentication
│   │   ├── transport/     # Upload + parsing
│   │   ├── visualization/ # API for Leaflet
│   │   ├── home/          # Dashboard
│   │   └── about/         # Static pages
│   ├── middleware/auth.js # Session auth
│   ├── models/            # MongoDB schemas
│   └── routes/routes.js   # Express routes
├── views/                 # EJS templates
├── public/                # CSS, JS, assets
```

---

## 🗄️ MongoDB Models

### User
```js
{
  username: String,
  password: String,
  type: { type: String, enum: ['PolicyMaker', 'Engineer'] },
  organization: String
}
```

### TransportFile
```js
{
  name: String,
  type: String,     // 'transport' | 'mobility-area' | 'mobility-matrix'
  region: String,   // City name
  data: [Object],   // Parsed CSV rows
  uploadedBy: ObjectId,
  uploadedAt: Date
}
```

---

## 📊 CSV File Formats

### 1️⃣ Transport File
Defines public transport routes.  

**CSV Example**
```csv
Route_ID,Stop_Name,Latitude,Longitude,Sequence
B1,Saddar,33.595,73.055,1
B1,Committee Chowk,33.601,73.059,2
```

---

### 2️⃣ Mobility-Area File
Defines mobility zones.  

**CSV Example**
```csv
Area_Name,Latitude,Longitude
LIAQUATBAGH_RAJABAZAR,33.606,73.043
G10_G11_G12,33.684,73.025
```

---

### 3️⃣ Mobility-Matrix File
Defines OD flows between zones.  

**CSV Example**
```csv
HOME_AREA,ADIALA,BAHRIA1_6_PWD,BAHRIA8,CHAKLALA
ADIALA,,0.005049667,0.010171,0.009161167
BAHRIA1_6_PWD,0.001947667,,0.018033667,0.006564167
```

---

## 🌍 Visualization Features

- Interactive map (Leaflet.js)  
- Toggles for:  
  - 🚍 Transport routes  
  - 🟢 Mobility areas  
  - 🔄 Mobility matrices  
- Node-to-node analysis:  
  - Flow percentage (OD data)  
  - Direct distance (Haversine)  
  - Network distance (OpenRouteService)  

---

## 🔑 API Endpoints

### Public
- `/` – Landing page  
- `/signup` – Register  
- `/login` – Login  

### Protected
- `/home` – Dashboard  
- `/upload` – Upload CSV  
- `/files` – List files  
- `/visualization` – Visualization UI  
- `/visualization/route` – Transport API  
- `/visualization/mobility` – Mobility areas API  
- `/visualization/mobility-matrix` – OD matrix API  

---

## 🛠️ Development Commands

### Run locally
```bash
npm install
npm run dev
```

### Linting
```bash
npm run lint
```

### Environment Variables (`.env`)
```
MONGO_URI=<your-mongodb-uri>
SESSION_SECRET=<session-secret>
ORS_KEY=<openrouteservice-api-key>
``

## ✅ Current Features Recap

- Auth (PolicyMaker/Engineer)  
- CSV uploads → MongoDB storage  
- Visualization with Leaflet  
- Node-to-node analysis with flow %, direct + network distance  
- Extendable APIs  