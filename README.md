# Do-it: Advanced To-Do List Application

A modern, full-stack To-Do List application with advanced features including semantic search, labels/tags, file attachments, and task prioritization. Built with HTML, CSS, JavaScript (frontend), Node.js/Express (backend), and Python (semantic search microservice).

---

## Features
- **Add, edit, delete, and view tasks**
- **Labels/Tags**: Organize tasks with customizable tags
- **File Attachments**: Attach files to tasks (PDF, images, etc.)
- **Task Prioritization**: Sort and view tasks by priority and due date
- **Semantic Search**: Find tasks using natural language queries (powered by Python service)
- **Modern UI/UX**: Responsive design, sidebar navigation, and interactive task cards
- **User Authentication**: Sign up, log in, and manage your account

---

## Tech Stack
- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express, MongoDB, Multer (file uploads)
- **Semantic Search Service**: Python (Flask), sentence-transformers, MongoDB

---

## Project Structure
```
Do-it/
  |-- index.html, main.html, ...         # Frontend pages
  |-- style.css                          # Main stylesheet
  |-- index.js, embed.js, scroll.js      # Frontend scripts
  |-- images/                            # Static assets
  |-- task-backend/                      # Node.js/Express backend
  |     |-- server.js, models/, uploads/ # Backend logic, models, file uploads
  |-- semantic-service/                  # Python semantic search microservice
  |     |-- semantic_service.py, .venv/  # Python code and virtual environment
```

---

## Setup & Installation

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd Do-it
```

### 2. Install Frontend Dependencies
No build step required. All frontend code is in plain HTML/CSS/JS.

### 3. Setup Backend (Node.js/Express)
```bash
cd task-backend
npm install
# Create a .env file (see below)
node server.js
```

#### Example `.env` for backend:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/todo-app-db
JWT_SECRET=your_jwt_secret
PYTHON_SERVICE_URL=http://localhost:5001
```

### 4. Setup Semantic Search Service (Python)
```bash
cd ../semantic-service
python -m venv .venv
.venv/Scripts/activate  # On Windows
source .venv/bin/activate  # On Mac/Linux
pip install -r requirements.txt
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
