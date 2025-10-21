import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse

# Import routers
from .routers import users, element_list, element_regulations, file_management, regulations, data_processing, utilities, projects, files, wall_extraction, pdf_parser, categories, boqs, custom_positions
app = FastAPI(
    title="Gemini Semantic Search API",
    description="An API to search for regulations using Gemini embeddings.",
    version="1.0.0"
)

# Get environment variables
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Configure CORS origins based on environment
if ENVIRONMENT == "production":
    origins = [
        FRONTEND_URL,
        "https://*.herokuapp.com",
        "https://*.herokuapp.com"
    ]
else:
    origins = [
        "http://localhost:3000",  # React app default port
        "http://localhost:3001",  # React app might run on 3001
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with /api prefix
app.include_router(users.router, prefix="/api")
app.include_router(element_list.router, prefix="/api")
app.include_router(element_regulations.router, prefix="/api")
app.include_router(file_management.router, prefix="/api")
app.include_router(regulations.router, prefix="/api")
app.include_router(data_processing.router, prefix="/api")
app.include_router(utilities.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(files.router, prefix="/api")
app.include_router(wall_extraction.router, prefix="/api")
app.include_router(pdf_parser.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(boqs.router, prefix="/api")
app.include_router(custom_positions.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {"status": "API is running", "environment": ENVIRONMENT}

@app.get("/api/")
def api_root():
    return {"status": "API is running", "environment": ENVIRONMENT}

# Check for React build and mount static files BEFORE defining routes
react_build_mounted = False

if ENVIRONMENT == "production":
    # Mount static files from React build
    static_path = os.path.join(os.getcwd(), "frontend", "build")
    
    print(f"Current working directory: {os.getcwd()}")
    print(f"Looking for React build at: {static_path}")
    
    if os.path.exists(static_path):
        print(f"✅ Found React build directory at: {static_path}")
        # Check if index.html exists
        index_path = os.path.join(static_path, "index.html")
        if os.path.exists(index_path):
            print(f"✅ Found React index.html at: {index_path}")
            
            # Mount React static assets first (CSS, JS bundles)
            react_static_path = os.path.join(static_path, "static")
            if os.path.exists(react_static_path):
                app.mount("/static", StaticFiles(directory=react_static_path), name="react_static")
                print("✅ React static assets mounted at /static")
            
            # Store paths for catch-all route
            app.state.react_build_path = static_path
            app.state.react_index_path = index_path
            react_build_mounted = True
            print("✅ React frontend configured successfully!")
            print(f"✅ All public assets (logo192.png, logo512.png, manifest.json) will be served from: {static_path}")
        else:
            print(f"❌ React index.html not found at: {index_path}")
    else:
        print(f"❌ React build directory not found at: {static_path}")

# Only define fallback route if React build is not mounted
if not react_build_mounted:
    @app.get("/", response_class=HTMLResponse)
    def serve_frontend():
        """Serve the fallback frontend HTML directly"""
        html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ONLV Project</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
        }
        .status {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .api-test {
            margin: 20px 0;
        }
        button {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
        }
        button:hover {
            background: #0056b3;
        }
        #result {
            margin-top: 10px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 5px;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 ONLV Project - Backend Running!</h1>
        
        <div class="status">
            <h3>⚠️ React Frontend Build Pending</h3>
            <p>Your FastAPI backend is running successfully on Heroku!</p>
            <p>Environment: """ + ENVIRONMENT + """</p>
            <p>The React frontend build is in progress. Once complete, you'll see your full React application here.</p>
        </div>

        <div class="api-test">
            <h3>🔧 API Test</h3>
            <button onclick="testAPI()">Test Backend API</button>
            <div id="result"></div>
        </div>

        <div>
            <h3>🌐 API Endpoints:</h3>
            <ul>
                <li><a href="/api/health" target="_blank">/api/health</a> - Health check</li>
                <li><a href="/api/users/" target="_blank">/api/users/</a> - Users API</li>
                <li><a href="/api/categories/" target="_blank">/api/categories/</a> - Categories API</li>
                <li><a href="/api/elements/" target="_blank">/api/elements/</a> - Elements API</li>
                <li><a href="/api/regulations/" target="_blank">/api/regulations/</a> - Regulations API</li>
                <li><a href="/api/projects/" target="_blank">/api/projects/</a> - Projects API</li>
                <li><a href="/api/boqs/" target="_blank">/api/boqs/</a> - BOQs API</li>
                <li><a href="/api/files/" target="_blank">/api/files/</a> - Files API</li>
            </ul>
        </div>

        <div>
            <h3>📋 Next Steps:</h3>
            <ul>
                <li>✅ Backend API is working</li>
                <li>🔄 React frontend build in progress</li>
                <li>🔧 Configure your environment variables</li>
                <li>🎯 Test all API endpoints</li>
            </ul>
        </div>
    </div>

    <script>
        async function testAPI() {
            const resultDiv = document.getElementById('result');
            resultDiv.textContent = 'Testing API...';
            
            try {
                const response = await fetch('/api/health');
                const data = await response.json();
                resultDiv.textContent = `✅ API Response:\\n${JSON.stringify(data, null, 2)}`;
            } catch (error) {
                resultDiv.textContent = `❌ API Error:\\n${error.message}`;
            }
        }

        // Auto-test API on page load
        window.onload = () => {
            setTimeout(testAPI, 1000);
        };
    </script>
</body>
</html>"""
        return html_content

# IMPORTANT: Catch-all route for React SPA - MUST be at the end!
# This handles all non-API routes and serves index.html for client-side routing
if react_build_mounted:
    @app.get("/{full_path:path}")
    async def serve_react_app(request: Request, full_path: str):
        """
        Catch-all route for React SPA.
        Serves index.html for all routes that aren't API endpoints or static files.
        This allows React Router to handle client-side routing.
        """
        # Don't catch API routes (they're already handled above)
        if full_path.startswith("api/"):
            return {"detail": "Not Found"}
        
        # Check if the requested file exists in the build directory (for public assets)
        file_path = os.path.join(app.state.react_build_path, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # For all other routes (React Router routes), serve index.html
        return FileResponse(app.state.react_index_path)