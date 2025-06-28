// priority.js - Script for priority tasks page with backend integration

// --- API Configuration ---
const API_BASE_URL = "http://localhost:5000";

// --- Global Variables ---
let allTasks = []; // Store all tasks fetched from backend
let filteredTasks = []; // Store currently filtered tasks
let currentPriorityFilter = "all"; // Track current priority filter
let actionInProgress = new Set(); // Track actions in progress to prevent conflicts

// --- Authentication Functions ---
function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

function handleLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

// --- Enhanced API function with authentication ---
async function apiFetch(endpoint, options = {}) {
  try {
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers,
      ...options,
    });

    // Handle authentication errors
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "login.html";
      return;
    }

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new Error(errorData.message || `API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API Request Error:", error);
    displayErrorMessage(`Network or API error: ${error.message}`);
    throw error;
  }
}

// --- Fetch all tasks from backend API ---
async function fetchAllTasks() {
  try {
    // Show loading state
    showLoadingState();

    // Fetch all tasks from the /tasks endpoint
    const tasks = await apiFetch("/tasks");

    // Store all tasks globally for filtering
    allTasks = tasks || [];

    // Apply current filter to display tasks
    applyPriorityFilter(currentPriorityFilter);
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    showErrorState("Failed to load tasks. Please try again.");
  }
}

// --- Filter tasks by priority ---
function applyPriorityFilter(priority) {
  currentPriorityFilter = priority;

  // Filter tasks based on selected priority
  if (priority === "all") {
    // Show all tasks (including archived ones)
    filteredTasks = allTasks;
  } else {
    // Filter tasks where priority matches selected priority (including archived)
    filteredTasks = allTasks.filter(
      (task) =>
        task.priority && task.priority.toLowerCase() === priority.toLowerCase()
    );
  }

  // Render the filtered tasks
  renderTasks(filteredTasks);
}

// --- Helper function to check if task is archived ---
function isTaskArchived(task) {
  return (
    task.completed === true || task.completed === "true" || task.completed === 1
  );
}

// --- Render tasks in the task container ---
function renderTasks(tasks) {
  const taskContainer = document.getElementById("taskListContainer");

  // Clear existing static task cards
  taskContainer.innerHTML = "";

  // Check if no tasks to display
  if (!tasks || tasks.length === 0) {
    showEmptyState();
    return;
  }

  // Hide empty state if it's showing
  hideEmptyState();

  // Create and append task cards for each task
  tasks.forEach((task) => {
    const taskCard = createPriorityTaskCard(task);
    taskContainer.appendChild(taskCard);
  });
}

// --- Create a task card following the existing Bootstrap structure ---
function createPriorityTaskCard(task) {
  // Create the column wrapper with priority data attribute
  const colDiv = document.createElement("div");
  colDiv.className = "col task-card-container";
  colDiv.setAttribute(
    "data-priority",
    task.priority ? task.priority.toLowerCase() : "low"
  );

  // Create card with Bootstrap classes matching the existing structure
  const cardDiv = document.createElement("div");
  cardDiv.className = "card h-100 shadow-sm rounded-4 task-card";
  cardDiv.dataset.taskId = task._id;

  // Make the entire card clickable to show task details
  cardDiv.style.cursor = "pointer";
  cardDiv.onclick = () => viewTaskDetails(task);

  // Create card body
  const cardBodyDiv = document.createElement("div");
  cardBodyDiv.className = "card-body";

  // Create card header with title and priority badge
  const cardHeaderDiv = document.createElement("div");
  cardHeaderDiv.className =
    "d-flex justify-content-between align-items-center mb-2";

  // Task title
  const titleH5 = document.createElement("h5");
  titleH5.className = "card-title mb-0";
  titleH5.textContent = task.title || "Untitled Task";

  // Priority badge with appropriate class
  const priorityBadge = document.createElement("span");
  const priorityClass = `priority-${(task.priority || "low").toLowerCase()}`;
  priorityBadge.className = `badge ${priorityClass}`;
  priorityBadge.textContent = task.priority || "Low";

  cardHeaderDiv.appendChild(titleH5);
  cardHeaderDiv.appendChild(priorityBadge);

  // Description paragraph
  const descriptionP = document.createElement("p");
  descriptionP.className = "card-text text-muted";
  descriptionP.textContent = task.description || "No description provided";

  // Tags/Labels section
  const tagsDiv = document.createElement("div");
  tagsDiv.className = "d-flex flex-wrap gap-2 mb-3";
  if (task.label && Array.isArray(task.label) && task.label.length > 0) {
    task.label.forEach((tag) => {
      const tagBadge = document.createElement("span");
      tagBadge.className = "badge bg-secondary";
      tagBadge.textContent = tag;
      tagsDiv.appendChild(tagBadge);
    });
  }

  // Footer with due date and action icons
  const cardFooterDiv = document.createElement("div");
  cardFooterDiv.className = "d-flex justify-content-between align-items-center";

  // Due date section
  const dueDateSmall = document.createElement("small");
  dueDateSmall.className = "text-muted";
  const dueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString()
    : "No due date";
  dueDateSmall.innerHTML = `<i class="bi bi-calendar-event me-1"></i> Due: ${dueDate}`;

  // Action icons section
  const actionsDiv = document.createElement("div");

  // Edit icon
  const editIcon = document.createElement("i");
  editIcon.className = "action-icon text-info bi bi-pencil";
  editIcon.title = "Edit Task";
  editIcon.style.cursor = "pointer";
  editIcon.onclick = (e) => {
    e.stopPropagation(); // Prevent card click
    editTask(task._id);
  };

  // Archive icon
  const archiveIcon = document.createElement("i");
  archiveIcon.className = "action-icon text-warning bi bi-archive";
  archiveIcon.title = "Archive Task";
  archiveIcon.style.cursor = "pointer";
  archiveIcon.onclick = (e) => {
    e.stopPropagation(); // Prevent card click
    archiveTask(task._id);
  };

  // Delete icon
  const deleteIcon = document.createElement("i");
  deleteIcon.className = "action-icon text-danger bi bi-trash";
  deleteIcon.title = "Delete Task";
  deleteIcon.style.cursor = "pointer";
  deleteIcon.onclick = (e) => {
    e.stopPropagation(); // Prevent card click
    deleteTask(task._id);
  };

  actionsDiv.appendChild(editIcon);
  actionsDiv.appendChild(archiveIcon);
  actionsDiv.appendChild(deleteIcon);

  cardFooterDiv.appendChild(dueDateSmall);
  cardFooterDiv.appendChild(actionsDiv);

  // Assemble the card
  cardBodyDiv.appendChild(cardHeaderDiv);
  cardBodyDiv.appendChild(descriptionP);
  if (tagsDiv.children.length > 0) {
    cardBodyDiv.appendChild(tagsDiv);
  }
  cardBodyDiv.appendChild(cardFooterDiv);

  cardDiv.appendChild(cardBodyDiv);
  colDiv.appendChild(cardDiv);

  // Apply styling based on task status (matching dashboard exactly)
  const isArchived =
    task.completed === true ||
    task.completed === "true" ||
    task.completed === 1;

  if (isArchived) {
    // Apply exact same styling as dashboard
    cardDiv.classList.add("bg-light");
    titleH5.innerHTML = `<i class="bi bi-check-circle me-1 text-success"></i> ${
      task.title || "Untitled Task"
    }`;
    titleH5.classList.add("text-muted");

    // Add archived badge to header (same position as dashboard)
    const archivedBadge = document.createElement("span");
    archivedBadge.className = "badge bg-warning ms-2";
    archivedBadge.textContent = "Archived";
    cardHeaderDiv.appendChild(archivedBadge);

    // Hide edit button (same as dashboard)
    editIcon.style.display = "none";

    // Update archive icon to restore icon
    archiveIcon.className =
      "action-icon text-success bi bi-arrow-counterclockwise";
    archiveIcon.title = "Restore Task";
  }

  return colDiv;
}

// --- Task Action Functions ---

// Edit task function - redirect to dashboard with edit parameter
async function editTask(taskId) {
  if (actionInProgress.has(taskId)) return;

  // Redirect to dashboard with edit parameter
  window.location.href = `dashboard.html?edit=${taskId}`;
}

// Archive task function
async function archiveTask(taskId) {
  if (actionInProgress.has(taskId)) return;

  actionInProgress.add(taskId);

  try {
    // Find the task to determine current state
    const task = allTasks.find((t) => t._id === taskId);
    if (!task) {
      displayErrorMessage("Task not found");
      return;
    }

    const isCurrentlyArchived =
      task.completed === true ||
      task.completed === "true" ||
      task.completed === 1;
    const newArchivedState = !isCurrentlyArchived;

    // Update task via API
    await apiFetch(`/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({
        completed: newArchivedState,
      }),
    });

    displaySuccessMessage(
      newArchivedState
        ? "Task completed and archived successfully!"
        : "Task restored and marked incomplete successfully!"
    );

    // Refresh the tasks to reflect the change
    await fetchAllTasks();
  } catch (error) {
    console.error("Failed to archive/restore task:", error);
    displayErrorMessage("Failed to update task status");
  } finally {
    actionInProgress.delete(taskId);
  }
}

// Delete task function
async function deleteTask(taskId) {
  if (actionInProgress.has(taskId)) return;

  if (
    !confirm(
      "Are you sure you want to delete this task? This action cannot be undone."
    )
  ) {
    return;
  }

  actionInProgress.add(taskId);

  try {
    // Delete task from backend
    await apiFetch(`/tasks/${taskId}`, {
      method: "DELETE",
    });

    displaySuccessMessage("Task deleted successfully!");

    // Refresh the task list
    await fetchAllTasks();
  } catch (error) {
    console.error("Failed to delete task:", error);
    displayErrorMessage("Failed to delete task. Please try again.");
  } finally {
    actionInProgress.delete(taskId);
  }
}

// View task details function - shows task details in modal
function viewTaskDetails(task) {
  const isTaskArchived =
    task.completed === true ||
    task.completed === "true" ||
    task.completed === 1;

  // Set task title with archived styling (matching dashboard exactly)
  const taskTitle = document.getElementById("taskDetailsTitle");
  if (isTaskArchived) {
    taskTitle.innerHTML = `<i class="bi bi-check-circle me-1 text-success"></i> ${task.title}`;
    taskTitle.classList.add("text-muted");
  } else {
    taskTitle.textContent = task.title;
    taskTitle.classList.remove("text-muted");
  }

  // Set priority badge (matching dashboard format)
  const priorityBadge = document.getElementById("taskDetailsPriority");
  const priorityText =
    task.priority === "High"
      ? "High Priority"
      : task.priority === "Medium"
      ? "Medium Priority"
      : "Low Priority";
  priorityBadge.textContent = priorityText;
  const priorityClass = `priority-${(task.priority || "low").toLowerCase()}`;
  priorityBadge.className = `badge ${priorityClass}`;

  // Set description
  document.getElementById("taskDetailsDescription").textContent =
    task.description || "No description";

  // Set due date
  const dueDateElement = document.getElementById("taskDetailsDueDate");
  const dueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString()
    : "No due date";
  dueDateElement.querySelector("span").textContent = dueDate;

  // Set tags (matching dashboard format)
  const tagsContainer = document.getElementById("taskDetailsTags");
  tagsContainer.innerHTML = "";
  if (task.label && Array.isArray(task.label) && task.label.length > 0) {
    task.label.forEach((tag) => {
      const tagBadge = document.createElement("span");
      tagBadge.className = "badge bg-secondary me-1";
      tagBadge.textContent = tag;
      tagsContainer.appendChild(tagBadge);
    });
  }
  if (tagsContainer.children.length === 0) {
    tagsContainer.innerHTML =
      '<span class="text-muted fst-italic">No tags</span>';
  }

  // Set attachments (matching dashboard format)
  const attachmentsContainer = document.getElementById(
    "taskDetailsAttachments"
  );
  attachmentsContainer.innerHTML = "";
  if (
    task.attachment &&
    Array.isArray(task.attachment) &&
    task.attachment.length > 0
  ) {
    task.attachment.forEach((attachment) => {
      const attachmentItem = document.createElement("div");
      attachmentItem.className = "d-flex align-items-center mb-2";
      attachmentItem.innerHTML = `
        <i class="bi bi-paperclip me-2 text-primary"></i>
        <a href="#" class="text-decoration-none">${attachment}</a>
      `;
      attachmentsContainer.appendChild(attachmentItem);
    });
  } else {
    attachmentsContainer.innerHTML =
      '<p class="text-muted fst-italic mb-0">No attachments</p>';
  }

  // Set creation date
  const createdDate = task.createdAt
    ? new Date(task.createdAt).toLocaleDateString()
    : "Unknown";
  document.getElementById("taskDetailsCreated").textContent = createdDate;

  // Set archived status and button (matching dashboard exactly)
  const archivedBadge = document.getElementById("taskDetailsArchived");
  const archiveBtn = document.getElementById("archiveTaskBtn");

  if (isTaskArchived) {
    archivedBadge.classList.remove("d-none");
    archiveBtn.innerHTML =
      '<i class="bi bi-arrow-counterclockwise me-1"></i> Restore';
    archiveBtn.classList.remove("btn-warning");
    archiveBtn.classList.add("btn-success");
  } else {
    archivedBadge.classList.add("d-none");
    archiveBtn.innerHTML = '<i class="bi bi-archive me-1"></i> Archive';
    archiveBtn.classList.remove("btn-success");
    archiveBtn.classList.add("btn-warning");
  }

  // Set up modal action buttons
  setupModalActionButtons(task._id);

  // Show the modal
  const modal = new bootstrap.Modal(
    document.getElementById("taskDetailsModal")
  );
  modal.show();
}

// Setup modal action buttons (matching dashboard approach)
function setupModalActionButtons(taskId) {
  // Edit button
  document.getElementById("editTaskBtn").onclick = function () {
    bootstrap.Modal.getInstance(
      document.getElementById("taskDetailsModal")
    ).hide();
    setTimeout(() => editTask(taskId), 500);
  };

  // Archive button
  document.getElementById("archiveTaskBtn").onclick = function () {
    archiveTask(taskId);
    bootstrap.Modal.getInstance(
      document.getElementById("taskDetailsModal")
    ).hide();
  };
}

// --- UI State Functions ---

// Show loading state
function showLoadingState() {
  const taskContainer = document.getElementById("taskListContainer");
  taskContainer.innerHTML = `
    <div class="col-12">
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-3 text-muted">Loading your tasks...</p>
      </div>
    </div>
  `;
}

// Show empty state when no tasks found
function showEmptyState() {
  const emptyStateElement = document.getElementById("emptyStateMessage");
  const emptyStateDescription = document.getElementById(
    "emptyStateDescription"
  );

  if (emptyStateElement && emptyStateDescription) {
    if (currentPriorityFilter === "all") {
      emptyStateDescription.textContent =
        "You have no tasks yet. Create your first task to get started!";
    } else {
      emptyStateDescription.textContent = `No ${currentPriorityFilter} priority tasks found.`;
    }
    emptyStateElement.classList.remove("d-none");
  }
}

// Hide empty state
function hideEmptyState() {
  const emptyStateElement = document.getElementById("emptyStateMessage");
  if (emptyStateElement) {
    emptyStateElement.classList.add("d-none");
  }
}

// Show error state
function showErrorState(message) {
  const taskContainer = document.getElementById("taskListContainer");
  taskContainer.innerHTML = `
    <div class="col-12">
      <div class="text-center py-5">
        <i class="bi bi-exclamation-triangle text-danger" style="font-size: 4rem"></i>
        <h4 class="text-danger mt-3">Error</h4>
        <p class="text-muted">${message}</p>
        <button class="btn btn-primary-accent mt-3" onclick="fetchAllTasks()">
          <i class="bi bi-arrow-clockwise me-2"></i>Try Again
        </button>
      </div>
    </div>
  `;
}

// --- Message Display Functions ---
function displaySuccessMessage(message) {
  // Create and show a success toast/alert
  console.log("Success:", message);
  // You can implement a toast notification here if needed
}

function displayErrorMessage(message) {
  // Create and show an error toast/alert
  console.error("Error:", message);
  // You can implement a toast notification here if needed
}

// --- Search Functionality ---
function setupSearchFilter() {
  const searchInput = document.querySelector(".search-bar");
  if (searchInput) {
    searchInput.addEventListener("input", function (e) {
      const searchTerm = e.target.value.toLowerCase().trim();
      filterTasksBySearch(searchTerm);
    });
  }
}

function filterTasksBySearch(searchTerm) {
  const taskCards = document.querySelectorAll(".task-card-container");

  taskCards.forEach((card) => {
    const title =
      card.querySelector(".card-title")?.textContent.toLowerCase() || "";
    const description =
      card.querySelector(".card-text")?.textContent.toLowerCase() || "";
    const isVisible =
      title.includes(searchTerm) || description.includes(searchTerm);

    card.style.display = isVisible ? "block" : "none";
  });
}

// --- Setup Priority Filter Event Listeners ---
function setupPriorityFilters() {
  // Get all priority filter buttons
  const priorityButtons = document.querySelectorAll("[data-priority]");

  // Add event listeners to each priority filter button
  priorityButtons.forEach((button) => {
    button.addEventListener("click", function () {
      // Remove active class from all buttons
      priorityButtons.forEach((btn) => btn.classList.remove("active"));

      // Add active class to clicked button
      this.classList.add("active");

      // Get the selected priority from data attribute
      const selectedPriority = this.getAttribute("data-priority");

      // Apply the priority filter
      applyPriorityFilter(selectedPriority);
    });
  });
}

// --- Setup Reset Filters Button ---
function setupResetFilters() {
  const resetButton = document.getElementById("resetFiltersBtn");
  if (resetButton) {
    resetButton.addEventListener("click", function () {
      // Click the "All" button to reset filters
      const allButton = document.querySelector('[data-priority="all"]');
      if (allButton) {
        allButton.click();
      }
    });
  }
}

// --- Setup Logout Handler ---
function setupLogoutHandler() {
  const logoutElements = document.querySelectorAll(
    '[data-action="logout"], .logout-btn, .bi-box-arrow-right'
  );

  logoutElements.forEach((element) => {
    element.addEventListener("click", function (e) {
      e.preventDefault();
      handleLogout();
    });
  });
}

// --- Initialize Priority Page ---
function initPriorityPage() {
  // Check if user is authenticated
  if (!checkAuth()) {
    return;
  }

  // Setup event listeners for priority filter buttons
  setupPriorityFilters();

  // Setup search functionality
  setupSearchFilter();

  // Setup reset filters button
  setupResetFilters();

  // Setup logout handler
  setupLogoutHandler();

  // Set initial filter to "all" and make sure the button is active
  const allButton = document.querySelector('[data-priority="all"]');
  if (allButton) {
    allButton.classList.add("active");
  }

  // Fetch and display all tasks from the backend
  fetchAllTasks();
}

// --- Initialize when DOM is loaded ---
document.addEventListener("DOMContentLoaded", function () {
  // Small delay to ensure all elements are properly loaded
  setTimeout(initPriorityPage, 100);
});
