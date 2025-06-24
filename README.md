# Do-It Task Management Application

A smart task management application with semantic search capabilities and a beautiful user interface.

## Application Flow

### New User Journey:
1. **Landing Page** (`main.html`) - Welcome page with app introduction
2. **Sign Up** (`signup.html`) - Create new account
3. **Sign In** (`login.html`) - Login to existing account
4. **Main App** (`index3.html`) - Task management interface

### Returning User Journey:
1. **Landing Page** (`main.html`) - Automatically redirects to main app if already logged in
2. **Main App** (`index3.html`) - Continue with task management

## Features

- **Smart Task Management**: Create, edit, delete, and organize tasks
- **Semantic Search**: Find tasks using natural language queries
- **Priority Management**: Set and filter tasks by priority (High, Medium, Low)
- **Due Date Tracking**: Set and track task deadlines
- **Task Archiving**: View completed tasks in archived section
- **Dark/Light Mode**: Toggle between themes
- **Responsive Design**: Works on desktop and mobile devices
- **Voice Commands**: Add and manage tasks using voice input

## Pages

- `main.html` - Landing page (first page users see)
- `signup.html` - User registration
- `login.html` - User authentication
- `index3.html` - Main task management interface
- `account.html` - User account management
- `archived.html` - View completed tasks
- `priority.html` - Filter tasks by priority
- `scheduled.html` - View scheduled tasks
- `label.html` - Manage task labels

## Setup

1. Start the backend server:
   ```bash
   cd task-backend
   npm install
   npm start
   ```

2. Start the Python semantic service (if using semantic search):
   ```bash
   cd semantic-service
   python semantic_service.py
   ```

3. Open `main.html` in your browser to start using the application

## Authentication

The application uses JWT tokens for authentication. Users must sign up and log in to access the task management features. The authentication flow ensures users are redirected appropriately based on their login status.

## Development

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express, MongoDB
- Semantic Search: Python service with embeddings
