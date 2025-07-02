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

#### Example environment variables for semantic service:
```
MONGO_URI=mongodb://localhost:27017/todo-app-db
MONGO_DB_NAME=todo-app-db
MONGO_COLLECTION_NAME=tasks
PYTHON_SERVICE_PORT=5001
```

---

## Usage
- Open `index.html` in your browser for the main UI.
- Use the sidebar to navigate between All Tasks, Priority, Labels, Scheduled, Archived, and Account pages.
- Add/edit tasks with tags and attachments.
- Use the search bar for semantic search (natural language queries).
- View prioritized tasks in `priority.html`.

---

## Contributing
Pull requests and issues are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

---

## License
[MIT](LICENSE)
