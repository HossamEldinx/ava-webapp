@echo off
start cmd.exe /k "cd backend && .\venv\Scripts\activate && uvicorn app.main:app --reload"
start cmd.exe /k "cd frontend && npm start"
echo Project setup complete. Check the new terminal windows for server output.