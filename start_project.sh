#!/bin/bash

echo "Starting Backend..."
cd backend
start cmd.exe /k ".\venv\Scripts\activate && uvicorn app.main:app --reload"

echo "Starting Frontend..."
cd ../frontend
start cmd.exe /k "npm start"

echo "Project setup complete. Check the new terminal windows for server output."