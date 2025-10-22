# Ava App - Full-Stack Webapp

> **A comprehensive full-stack application for construction document processing, built with modern web technologies.**

---

## 📋 Table of Contents

-   [Project Overview](#project-overview)
-   [Features](#features)
-   [Technology Stack](#technology-stack)
-   [Commercial Licensing](#-commercial-licensing)
-   [Prerequisites](#prerequisites)
-   [Installation Guide](#installation-guide)
-   [Running the Application](#running-the-application)
-   [API Documentation](#api-documentation)
-   [Configuration](#configuration)
-   [Troubleshooting](#troubleshooting)
-   [License](#license)

---

## 🎯 Project Overview

The Ava App is a sophisticated full-stack web application designed for professional management and processing of construction documents. It combines a robust Python FastAPI backend with a modern React frontend to provide a seamless user experience for document processing, data management, and advanced file analysis.

### Key Use Cases

-   📄 **Document Processing**: Upload, parse, and analyze ONLV and JSON construction documents
-   💾 **Data Management**: Organize and manage construction project data
-   📊 **File Management**: Handle file uploads, storage, and retrieval
-   🏗️ **Project Organization**: Manage multiple construction projects and their associated documents
-   📋 **Custom Positions**: Define and manage custom construction positions and specifications

---

## ✨ Features

### Backend Features (FastAPI)

-   ✅ **RESTful API Architecture** - Clean, scalable API design with automatic documentation
-   ✅ **File Processing** - Handle ONLV, JSON, XML, and PDF documents

-   ✅ **Database Management** - Supabase PostgreSQL integration for robust data persistence
-   ✅ **Asynchronous Operations** - Fast, non-blocking request handling
-   ✅ **XML Processing** - Native XML parsing and transformation
-   ✅ **PDF Support** - Extract and parse PDF documents
-   ✅ **Authentication & Authorization** - User management and security
-   ✅ **CORS Support** - Secure cross-origin requests

### Frontend Features (React)

-   ✅ **Modern SPA** - Single Page Application with React 18
-   ✅ **Component Architecture** - Reusable, maintainable React components
-   ✅ **Responsive Design** - Mobile-friendly interface with Tailwind CSS
-   ✅ **File Management** - Intuitive file upload and management UI
-   ✅ **ONLV Viewer** - Specialized viewer for ONLV documents
-   ✅ **Data Visualization** - Interactive charts and data displays
-   ✅ **Multi-language Support** - Localization for international users

---

## 💻 Technology Stack

### Backend

| Technology        | Version | Purpose                              |
| ----------------- | ------- | ------------------------------------ |
| **Python**        | 3.11+   | Core backend language                |
| **FastAPI**       | 0.117.1 | Web framework                        |
| **Uvicorn**       | 0.32.1  | ASGI server                          |
| **Supabase**      | 2.19.0  | PostgreSQL database & authentication |
| **PyPDF2**        | 3.0.1   | PDF processing                       |
| **pdfplumber**    | 0.11.4  | Advanced PDF extraction              |
| **xmltodict**     | 0.13.0  | XML parsing                          |
| **python-dotenv** | 1.0.1   | Environment configuration            |

### Frontend

| Technology       | Version | Purpose                     |
| ---------------- | ------- | --------------------------- |
| **React**        | 18.3.1  | UI library                  |
| **Node.js**      | 20 LTS  | Runtime environment         |
| **npm**          | Latest  | Package manager             |
| **Tailwind CSS** | 3.4.0   | Utility-first CSS framework |
| **Axios**        | Latest  | HTTP client                 |
| **Lucide React** | Latest  | Icon library                |
| **React Router** | Latest  | Client-side routing         |

---

## ⚖️ 🔒 COMMERCIAL LICENSING

### **IMPORTANT: License & Usage Rights**

**This project is provided under DUAL LICENSING:**

#### **Option 1: Open Source (Non-Commercial)**

-   **License Type**: MIT License (with restrictions)
-   **Allowed Uses**:

    -   ✅ Personal use
    -   ✅ Educational purposes
    -   ✅ Non-profit organizations
    -   ✅ Open-source projects
    -   ✅ Internal development and testing

-   **Restrictions**:
    -   ❌ **Commercial use is strictly prohibited**
    -   ❌ Cannot sell the software or services built with it
    -   ❌ Cannot use in a for-profit product or service
    -   ❌ Cannot use for commercial consulting or development services

#### **Option 2: Commercial License (REQUIRED FOR BUSINESS USE)**

**If you intend to use this project for any commercial purpose, you MUST obtain a commercial license.**

**Commercial uses include but are not limited to:**

-   💼 Using as part of a commercial product or service
-   💼 Offering consulting or development services based on this code
-   💼 Integrating into a for-profit SaaS platform
-   💼 Selling or licensing derivative works
-   💼 Using in a commercial construction or engineering firm
-   💼 Providing as a managed service for commercial clients

**To obtain a commercial license:**

1. **Contact the project maintainers** at: [contact-email or contact-form]
2. **License Terms will include:**
    - ✅ Perpetual usage rights
    - ✅ Commercial support and updates
    - ✅ Custom modifications and extensions
    - ✅ White-label options
    - ✅ Priority bug fixes
    - ✅ Training and documentation

**License Pricing:**

-   Contact the development team for a quote based on your use case and company size
-   Volume discounts available for enterprise deployments
-   Custom license agreements available

**Enforcement:**

-   Commercial use without a license is considered a violation of the license agreement
-   License violations may result in legal action
-   All commercial users are required to display appropriate attribution

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

### System Requirements

-   **Operating System**: Windows, macOS, or Linux
-   **RAM**: Minimum 4GB (8GB recommended)
-   **Disk Space**: Minimum 2GB free space
-   **Internet Connection**: Required for API integrations

### Required Software

| Software    | Version | Purpose          | Download                                        |
| ----------- | ------- | ---------------- | ----------------------------------------------- |
| **Python**  | 3.11+   | Backend runtime  | [python.org](https://www.python.org/downloads/) |
| **Node.js** | 20 LTS  | Frontend runtime | [nodejs.org](https://nodejs.org/)               |
| **Git**     | Latest  | Version control  | [git-scm.com](https://git-scm.com/downloads)    |

### API Keys (Required for Full Functionality)

You'll need to obtain the following credentials:

1. **Supabase Credentials**
    - Go to: [Supabase](https://supabase.com/)
    - Create a free account and project
    - Get your Project URL and API Key
    - Required for database functionality

---

## 🚀 Installation Guide

### Step 1: Clone the Repository

```bash
git clone <your-repository-url>
cd ava-opensource-webapp
```

Replace `<your-repository-url>` with your actual repository URL.

### Step 2: Backend Setup

#### 2.1 Navigate to Backend Directory

```bash
cd backend
```

#### 2.2 Create a Python Virtual Environment

**Windows:**

```bash
python -m venv venv
```

**macOS/Linux:**

```bash
python3 -m venv venv
```

#### 2.3 Activate the Virtual Environment

**Windows:**

```bash
.\venv\Scripts\activate
```

**macOS/Linux:**

```bash
source venv/bin/activate
```

You should see `(venv)` at the beginning of your terminal prompt.

#### 2.4 Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

#### 2.5 Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# Copy the example file (if available)
cp .env.example .env
```

Or create it manually with the following content:

```env
# Environment Configuration
ENVIRONMENT=development

# Required: Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here

# Optional: Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Optional: Server Configuration
PORT=8000
DEBUG=True
```

### Step 3: Frontend Setup

#### 3.1 Navigate to Frontend Directory (in a new terminal)

```bash
cd frontend
```

#### 3.2 Install Node Dependencies

```bash
npm install
```

This installs all required packages including React, Tailwind CSS, and other dependencies.

#### 3.3 Configure Environment Variables

Create a `.env.local` file in the `frontend` directory:

```env
# Backend API URL
REACT_APP_API_URL=http://127.0.0.1:8000/api
```

---

## ▶️ Running the Application

You have multiple options to run the application:

### Option A: Using Provided Scripts (Easiest)

#### Windows:

```bash
start_project.bat
```

#### macOS/Linux:

```bash
chmod +x start_project.sh
./start_project.sh
```

### Option B: Manual Startup (Recommended for Development)

#### Terminal 1 - Start Backend

```bash
cd backend

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Run the backend
uvicorn app.main:app --reload
```

You should see output like:

```
Uvicorn running on http://127.0.0.1:8000
```

#### Terminal 2 - Start Frontend

```bash
cd frontend
npm start
```

You should see output like:

```
Compiled successfully!
You can now view the app in the browser.
Local: http://localhost:3000
```

### Access the Application

Once both servers are running:

-   **Frontend**: http://localhost:3000
-   **Backend API**: http://127.0.0.1:8000
-   **API Documentation**: http://127.0.0.1:8000/docs (Interactive Swagger UI)
-   **Alternative API Docs**: http://127.0.0.1:8000/redoc (ReDoc format)

---

## API Documentation

The backend provides comprehensive REST API endpoints. Access interactive documentation at:

-   **Swagger UI**: http://127.0.0.1:8000/docs
-   **ReDoc**: http://127.0.0.1:8000/redoc

### Key API Endpoints

#### Authentication & Users

-   `GET /api/users/` - List all users
-   `POST /api/users/` - Create a new user
-   `GET /api/users/{id}` - Get user details
-   `PUT /api/users/{id}` - Update user

#### Projects

-   `GET /api/projects/` - List projects
-   `POST /api/projects/` - Create project
-   `GET /api/projects/{id}` - Get project details
-   `DELETE /api/projects/{id}` - Delete project

#### ONLV Documents

-   `POST /api/files/upload` - Upload ONLV files
-   `GET /api/files/` - List uploaded files
-   `GET /api/files/{id}` - Get file details
-   `DELETE /api/files/{id}` - Delete file

#### Categories & Elements

-   `GET /api/categories/` - List categories
-   `GET /api/elements/` - List elements
-   `POST /api/element-list/` - Create element
-   `GET /api/element-regulations/` - Get regulations

#### Bills of Quantities (BoQ)

-   `GET /api/boqs/` - List BOQs
-   `POST /api/boqs/` - Create BOQ
-   `PUT /api/boqs/{id}` - Update BOQ

#### System

-   `GET /api/health` - Health check
-   `GET /api/` - API status

**Note**: See http://127.0.0.1:8000/docs for complete, up-to-date API specification.

---

## ⚙️ Configuration

### Backend Configuration

Create a `.env` file in the `backend` directory:

```env
# Environment Mode
ENVIRONMENT=development              # development or production

# Required: Supabase Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJhbGc...             # Get from Supabase Dashboard

# Optional: CORS Configuration
FRONTEND_URL=http://localhost:3000

# Optional: Server Settings
PORT=8000
DEBUG=True
LOG_LEVEL=INFO
```

### Frontend Configuration

Create a `.env.local` file in the `frontend` directory:

```env
# Backend API Configuration
REACT_APP_API_URL=http://127.0.0.1:8000/api
```

### Accessing Configuration Values

**In Python (Backend):**

```python
import os
from dotenv import load_dotenv

load_dotenv()
google_key = os.getenv("GOOGLE_API_KEY")
```

**In React (Frontend):**

```javascript
const apiUrl = process.env.REACT_APP_API_URL;
```

---

## 🔧 Troubleshooting

### Backend Issues

#### "ModuleNotFoundError: No module named 'fastapi'"

```bash
# Ensure virtual environment is activated
# Windows: .\venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

#### Port 8000 Already in Use

```bash
# Use a different port
uvicorn app.main:app --reload --port 8001
```

#### Database Connection Errors

1. Verify `SUPABASE_URL` and `SUPABASE_KEY` in `.env`
2. Check your internet connection
3. Verify Supabase account is active
4. Check Supabase project status at https://supabase.com/dashboard

### Frontend Issues

#### "npm: command not found"

-   Node.js is not installed or not in PATH
-   Install Node.js 20 LTS from https://nodejs.org/

#### Port 3000 Already in Use

```bash
# Use a different port
npm start -- --port 3001
```

#### "Cannot find module 'react'"

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json  # macOS/Linux
# or
rmdir /s /q node_modules & del package-lock.json  # Windows

npm install
```

#### Frontend Can't Connect to Backend

1. Verify backend is running: http://127.0.0.1:8000/health
2. Check `REACT_APP_API_URL` in `.env.local`
3. Look for CORS errors in browser console (F12 → Console)
4. Verify `FRONTEND_URL` in backend `.env` matches frontend URL

### General Issues

#### Git Clone Fails

```bash
# If cloning fails, try with HTTPS (most reliable)
git clone https://github.com/username/repo.git

# Or configure git globally
git config --global url."https://".insteadOf "git://"
```

#### Permission Denied on Scripts (macOS/Linux)

```bash
chmod +x start_project.sh
chmod +x deploy.sh
```

---

## 📜 License

### Non-Commercial License (Default)

```
MIT License (with Commercial Restrictions)

Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, subject to the following conditions:

1. The above copyright notice and this permission notice shall be included in all
   copies or substantial portions of the Software.

2. COMMERCIAL USE IS STRICTLY PROHIBITED without obtaining a separate Commercial
   License Agreement.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Commercial License Required

**This project requires a commercial license for any business use.**

See [COMMERCIAL LICENSING](#-commercial-licensing) section above for details.

---

**Last Updated**: October 2024  
**Version**: 1.4.6  
**Status**: ✅ Active Development
