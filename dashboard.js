// dashboard.js - Script for dashboard card-based UI with backend integration

// --- API Configuration ---
const API_BASE_URL = "http://localhost:5000";

// --- Global Variables ---
let editItem = null;
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

// --- Load Tasks from API and Display as Cards ---
async function loadTasksFromAPI(endpoint = "/tasks") {
  try {
    const taskContainer = document.getElementById("taskList");

    // Clear current tasks from the DOM
    while (taskContainer.firstChild) {
      taskContainer.removeChild(taskContainer.firstChild);
    }

    const tasks = await apiFetch(endpoint);

    if (tasks && tasks.length > 0) {
      tasks.forEach((task) => {
        const taskCard = createTaskCard(task);
        taskContainer.appendChild(taskCard);
      });
    } else {
      // Display empty state
      const emptyState = document.createElement("div");
      emptyState.className = "col-12";
      emptyState.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-list-check display-1 text-muted"></i>
          <h4 class="text-muted mt-3">No tasks yet</h4>
          <p class="text-muted">Click the + button to add your first task!</p>
        </div>
      `;
      taskContainer.appendChild(emptyState);
    }

    // Update UI state
    updateTaskCounter(tasks ? tasks.length : 0);
  } catch (error) {
    console.error("Failed to load tasks:", error);
    // Don't show error message here as apiFetch already handles it
  }
}

// --- Create Task Card Element ---
function createTaskCard(task) {
  // Create the column wrapper
  const colDiv = document.createElement("div");
  colDiv.className = "col";

  // Create card
  const cardDiv = document.createElement("div");
  cardDiv.className = "card task-card h-100";
  cardDiv.dataset.taskId = task._id;
  cardDiv.dataset.title = task.title;
  cardDiv.dataset.description = task.description || "";
  cardDiv.dataset.dueDate = task.dueDate || "";
  cardDiv.dataset.priority = task.priority || "Low";
  cardDiv.dataset.tags = (task.label || []).join(",");
  cardDiv.dataset.attachment = (task.attachment || []).join(",");
  cardDiv.dataset.created = new Date(task.createdAt).toLocaleDateString();
  cardDiv.dataset.archived = (
    task.completed === true ||
    task.completed === "true" ||
    task.completed === 1
  ).toString();

  // Create card body
  const cardBodyDiv = document.createElement("div");
  cardBodyDiv.className = "card-body d-flex flex-column";

  // Create card header with title and priority
  const cardHeaderDiv = document.createElement("div");
  cardHeaderDiv.className =
    "d-flex justify-content-between align-items-start mb-2";

  // Task title
  const titleH5 = document.createElement("h5");
  titleH5.className = "card-title mb-1";
  titleH5.textContent = task.title;

  // Priority badge
  const priorityBadge = document.createElement("span");
  priorityBadge.className = `badge priority-${task.priority.toLowerCase()}`;
  priorityBadge.textContent = task.priority;

  cardHeaderDiv.appendChild(titleH5);
  cardHeaderDiv.appendChild(priorityBadge);

  // Description
  const descriptionP = document.createElement("p");
  descriptionP.className = "card-text text-muted small mb-2";
  descriptionP.textContent = task.description || "No description";

  // Due date
  const dueDateP = document.createElement("p");
  dueDateP.className = "card-text small mb-2";
  dueDateP.innerHTML = `<i class="bi bi-calendar-event me-1"></i><strong>Due:</strong> ${
    task.dueDate || "No due date"
  }`;

  // Tags
  const tagsDiv = document.createElement("div");
  tagsDiv.className = "mb-2";
  if (task.label && task.label.length > 0) {
    task.label.forEach((tag) => {
      const tagBadge = document.createElement("span");
      tagBadge.className = "badge bg-secondary me-1 mb-1";
      tagBadge.textContent = tag;
      tagsDiv.appendChild(tagBadge);
    });
  }

  // Attachments
  const attachmentsDiv = document.createElement("div");
  attachmentsDiv.className = "mb-2";
  if (task.attachment && task.attachment.length > 0) {
    const attachmentIcon = document.createElement("i");
    attachmentIcon.className = "bi bi-paperclip action-icon";
    attachmentIcon.title = "View Attachments";
    attachmentsDiv.appendChild(attachmentIcon);
  }

  // Card footer with actions
  const cardFooterDiv = document.createElement("div");
  cardFooterDiv.className =
    "mt-auto d-flex justify-content-between align-items-center";

  // Completion checkbox
  const checkboxDiv = document.createElement("div");
  checkboxDiv.className = "form-check";

  const completeCheckbox = document.createElement("input");
  completeCheckbox.type = "checkbox";
  completeCheckbox.className = "form-check-input task-completed-checkbox";
  completeCheckbox.id = `task-${task._id}`;
  completeCheckbox.checked =
    task.completed === true ||
    task.completed === "true" ||
    task.completed === 1;

  const checkboxLabel = document.createElement("label");
  checkboxLabel.className = "form-check-label small";
  checkboxLabel.htmlFor = `task-${task._id}`;
  checkboxLabel.textContent = "Complete";

  checkboxDiv.appendChild(completeCheckbox);
  checkboxDiv.appendChild(checkboxLabel);

  // Action icons
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "d-flex align-items-center";

  // Edit icon
  const editIcon = document.createElement("i");
  editIcon.className = "bi bi-pencil action-icon edit me-2";
  editIcon.title = "Edit Task";
  editIcon.style.cursor = "pointer";

  // Archive/Restore icon
  const archiveIcon = document.createElement("i");
  archiveIcon.style.cursor = "pointer";
  archiveIcon.style.padding = "4px";
  archiveIcon.setAttribute("data-action", "archive");

  // Delete icon
  const deleteIcon = document.createElement("i");
  deleteIcon.className = "bi bi-trash action-icon text-danger delete";
  deleteIcon.title = "Delete Task";
  deleteIcon.style.cursor = "pointer";

  actionsDiv.appendChild(editIcon);
  actionsDiv.appendChild(archiveIcon);
  actionsDiv.appendChild(deleteIcon);

  cardFooterDiv.appendChild(checkboxDiv);
  cardFooterDiv.appendChild(actionsDiv);

  // Assemble the card
  cardBodyDiv.appendChild(cardHeaderDiv);
  cardBodyDiv.appendChild(descriptionP);
  cardBodyDiv.appendChild(dueDateP);
  cardBodyDiv.appendChild(tagsDiv);
  cardBodyDiv.appendChild(attachmentsDiv);
  cardBodyDiv.appendChild(cardFooterDiv);

  cardDiv.appendChild(cardBodyDiv);
  colDiv.appendChild(cardDiv);

  // Apply initial styling and set dataset values
  const taskArchived =
    task.completed === true ||
    task.completed === "true" ||
    task.completed === 1;
  const taskCompleted =
    task.completed === true ||
    task.completed === "true" ||
    task.completed === 1;

  cardDiv.dataset.archived = taskArchived.toString();
  cardDiv.dataset.completed = taskCompleted.toString();
  completeCheckbox.checked = taskCompleted;

  // Apply UI styling through updateCardUI for consistency
  updateCardUI(cardDiv, taskCompleted, taskArchived);

  return colDiv;
}

// --- Handle Task Actions ---
async function handleTaskActions(e) {
  // Handle Delete button click
  if (e.target.classList.contains("delete") || e.target.closest(".delete")) {
    e.preventDefault();
    e.stopPropagation();
    const card = e.target.closest(".task-card");
    const taskId = card.dataset.taskId;

    if (!taskId) {
      displayErrorMessage("Error: Task ID not found for deletion.");
      return;
    }

    if (confirm("Are you sure you want to delete this task?")) {
      try {
        await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });
        displaySuccessMessage("Task deleted successfully!");
        loadTasksFromAPI();
      } catch (error) {
        console.error("Failed to delete task:", error);
      }
    }
    return;
  }

  // Handle Mark as Complete checkbox click
  if (e.target.classList.contains("task-completed-checkbox")) {
    e.preventDefault();
    e.stopPropagation();
    const card = e.target.closest(".task-card");
    const taskId = card.dataset.taskId;
    const isCompleted = e.target.checked;

    if (!taskId) {
      displayErrorMessage("Error: Task ID not found for status update.");
      e.target.checked = !isCompleted;
      return;
    }

    // Prevent multiple simultaneous actions on the same task
    if (actionInProgress.has(taskId)) {
      e.target.checked = !isCompleted;
      return;
    }

    actionInProgress.add(taskId);

    try {
      // Combined action: when completing a task, also archive it
      await apiFetch(`/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({
          completed: isCompleted,
        }),
      });

      card.dataset.archived = isCompleted.toString();
      card.dataset.completed = isCompleted.toString();

      updateCardUI(card, isCompleted, isCompleted);
      e.target.checked = isCompleted;

      displaySuccessMessage(
        `Task marked as ${
          isCompleted ? "completed and archived" : "incomplete and restored"
        }!`
      );
    } catch (error) {
      // Revert checkbox state on error
      e.target.checked = !isCompleted;
      console.error("Failed to update task status:", error);
      displayErrorMessage("Failed to update task status");
    } finally {
      actionInProgress.delete(taskId);
    }
    return;
  }

  // Handle Edit button click
  if (
    e.target.classList.contains("edit") ||
    e.target.classList.contains("bi-pencil") ||
    e.target.closest(".edit")
  ) {
    e.preventDefault();
    e.stopPropagation();
    const card = e.target.closest(".task-card");
    handleEditTask(card);
    return;
  }

  // Handle Archive/Restore button click
  if (e.target.getAttribute("data-action") === "archive") {
    e.preventDefault();
    e.stopPropagation();

    if (e.target.hasAttribute("data-processing")) return;

    const card = e.target.closest(".task-card");
    if (card) {
      e.target.setAttribute("data-processing", "true");
      try {
        await handleArchiveToggle(card);
      } finally {
        setTimeout(() => e.target?.removeAttribute("data-processing"), 1000);
      }
    }
    return;
  }

  // Handle card click (open task details modal) - only if not clicking on action elements
  if (
    e.target.closest(".task-card") &&
    !e.target.closest(".action-icon") &&
    !e.target.closest(".form-check") &&
    !e.target.closest("button") &&
    !e.target.closest(".badge")
  ) {
    e.preventDefault();
    const card = e.target.closest(".task-card");
    openTaskDetailsModal(card);
    return;
  }
}

// --- Handle Edit Task ---
function handleEditTask(card) {
  // Show add task modal for editing
  const addTaskModal = document.getElementById("addTaskModal");
  if (addTaskModal) {
    // Populate form with task data
    const taskTitle = card.dataset.title;
    const taskDescription = card.dataset.description;
    const taskDueDate = card.dataset.dueDate;
    const taskPriority = card.dataset.priority;
    const tags = card.dataset.tags
      ? card.dataset.tags.split(",").filter((tag) => tag.trim())
      : [];

    // Find form elements and populate them
    const titleInput = document.querySelector(
      '#addTaskModal input[name="title"]'
    );
    const descriptionInput = document.querySelector(
      '#addTaskModal textarea[name="description"]'
    );
    const dueDateInput = document.querySelector(
      '#addTaskModal input[name="dueDate"]'
    );
    const prioritySelect = document.querySelector(
      '#addTaskModal select[name="priority"]'
    );
    const tagsInput = document.querySelector(
      '#addTaskModal input[name="tags"]'
    );

    if (titleInput) titleInput.value = taskTitle;
    if (descriptionInput) descriptionInput.value = taskDescription;
    if (dueDateInput) dueDateInput.value = taskDueDate;
    if (prioritySelect) prioritySelect.value = taskPriority;
    if (tagsInput) tagsInput.value = tags.join(", ");

    // Store the card reference for later use
    editItem = card;

    // Show modal
    const modal = new bootstrap.Modal(addTaskModal);
    modal.show();

    // Update modal title
    const modalTitle = addTaskModal.querySelector(".modal-title");
    if (modalTitle) modalTitle.textContent = "Edit Task";

    // Update submit button text
    const submitBtn = addTaskModal.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.innerHTML =
        '<i class="bi bi-check-circle me-2"></i>Update Task';
    }
  }
}

// Archive toggle state tracking
let archiveToggleInProgress = new Set();
let lastArchiveClick = 0; // Global archive click throttle

// --- Handle Archive Toggle ---
async function handleArchiveToggle(card) {
  const now = Date.now();
  if (now - lastArchiveClick < 1000) return;
  lastArchiveClick = now;

  const taskId = card.dataset.taskId;
  if (archiveToggleInProgress.has(taskId) || actionInProgress.has(taskId))
    return;

  archiveToggleInProgress.add(taskId);
  actionInProgress.add(taskId);

  try {
    const isCurrentlyArchived = card.dataset.archived === "true";
    const newArchivedState = !isCurrentlyArchived;

    await apiFetch(`/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({
        completed: newArchivedState,
      }),
    });

    card.dataset.archived = newArchivedState.toString();
    card.dataset.completed = newArchivedState.toString();

    updateCardUI(card, newArchivedState, newArchivedState);

    const checkbox = card.querySelector(".task-completed-checkbox");
    if (checkbox) checkbox.checked = newArchivedState;

    displaySuccessMessage(
      newArchivedState
        ? "Task completed and archived successfully!"
        : "Task restored and marked incomplete successfully!"
    );
  } catch (error) {
    console.error("Failed to update archive status:", error);
    displayErrorMessage("Failed to update task status");
  } finally {
    archiveToggleInProgress.delete(taskId);
    actionInProgress.delete(taskId);
  }
}

// --- Add New Task ---
async function addTask(taskData) {
  try {
    const newTask = await apiFetch("/tasks", {
      method: "POST",
      body: JSON.stringify(taskData),
    });
    displaySuccessMessage("Task added successfully!");
    loadTasksFromAPI();
    return newTask;
  } catch (error) {
    if (error.message.includes("Task with this title already exists")) {
      displayErrorMessage("A task with this title already exists!");
    }
    throw error;
  }
}

// --- Update Task ---
async function updateTask(taskId, updates) {
  try {
    const updatedTask = await apiFetch(`/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    displaySuccessMessage("Task updated successfully!");
    loadTasksFromAPI();
    return updatedTask;
  } catch (error) {
    displayErrorMessage("Failed to update task");
    throw error;
  }
}

// --- Search Functionality ---
function handleSearch() {
  const searchInput = document.querySelector(".search-bar");
  if (!searchInput) return;

  const searchTerm = searchInput.value.trim();
  const endpoint = searchTerm
    ? `/tasks?contains=${encodeURIComponent(searchTerm)}`
    : "/tasks";
  loadTasksFromAPI(endpoint);
}

// --- Message Display Functions ---
function displaySuccessMessage(message) {
  showToast(message, "success");
}

function displayErrorMessage(message) {
  showToast(message, "error");
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `alert alert-${
    type === "success" ? "success" : "danger"
  } alert-dismissible fade show`;
  Object.assign(toast.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: "9999",
    minWidth: "300px",
  });

  toast.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
  document.body.appendChild(toast);

  setTimeout(() => toast.parentNode?.removeChild(toast), 3000);
}

// --- Update Task Counter ---
function updateTaskCounter(count) {
  const counter = document.querySelector(".task-counter");
  if (counter) {
    counter.textContent = `${count} task${count !== 1 ? "s" : ""}`;
  }
}

// --- Initialize Dashboard ---
function initDashboard() {
  if (!checkAuth()) return;

  loadTasksFromAPI();

  // Ensure UI consistency after page refresh
  setTimeout(() => {
    document.querySelectorAll(".task-card").forEach((card) => {
      const isArchived = card.dataset.archived === "true";
      const isCompleted = card.dataset.completed === "true";
      updateCardUI(card, isCompleted, isArchived);
    });
  }, 500);

  // Set up event listeners
  const taskList = document.getElementById("taskList");
  if (taskList) taskList.addEventListener("click", handleTaskActions);

  const searchInput = document.querySelector(".search-bar");
  if (searchInput)
    searchInput.addEventListener("input", debounce(handleSearch, 300));

  setupLogoutHandler();
  displayUserInfo();
  setupTaskForm();
}

// --- Setup Task Form ---
function setupTaskForm() {
  const addTaskModal = document.getElementById("addTaskModal");
  if (!addTaskModal) return;

  const form = addTaskModal.querySelector("form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const taskData = {
      title: formData.get("title") || "",
      description: formData.get("description") || "",
      dueDate: formData.get("dueDate") || "",
      priority: formData.get("priority") || "Medium",
      label: formData.get("tags")
        ? formData
            .get("tags")
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag)
        : [],
      completed: false,
    };

    // Validate required fields
    if (!taskData.title.trim()) {
      displayErrorMessage("Task title is required!");
      return;
    }
    if (!taskData.dueDate) {
      displayErrorMessage("Due date is required!");
      return;
    }

    try {
      if (editItem) {
        // Update existing task
        const taskId = editItem.dataset.taskId;
        await updateTask(taskId, taskData);
        editItem = null;
      } else {
        // Add new task
        await addTask(taskData);
      }

      // Close modal and reset form
      const modal = bootstrap.Modal.getInstance(addTaskModal);
      modal.hide();
      form.reset();
    } catch (error) {
      console.error("Failed to save task:", error);
    }
  });

  // Reset form when modal is hidden
  addTaskModal.addEventListener("hidden.bs.modal", () => {
    form.reset();
    editItem = null;
    const modalTitle = addTaskModal.querySelector(".modal-title");
    if (modalTitle) modalTitle.textContent = "Add New Task";

    // Reset submit button text
    const submitBtn = addTaskModal.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="bi bi-save me-2"></i>Save Task';
    }
  });
}

// --- Utility Functions ---
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Update card UI based on completed and archived states
function updateCardUI(card, isCompleted, isArchived) {
  const cardTitle = card.querySelector(".card-title");
  const editButton = card.querySelector(".edit");
  const archiveIcon = card.querySelector('[data-action="archive"]');

  // Use dataset values if parameters not provided (for page refresh scenarios)
  const actualArchivedState = isArchived ?? card.dataset.archived === "true";
  const actualCompletedState = isCompleted ?? card.dataset.completed === "true";

  // Update datasets for consistency
  card.dataset.archived = actualArchivedState.toString();
  card.dataset.completed = actualCompletedState.toString();

  // Remove existing archived badges
  card.querySelectorAll(".badge.bg-warning").forEach((badge) => {
    if (badge.textContent.trim() === "Archived") badge.remove();
  });

  if (actualCompletedState || actualArchivedState) {
    card.classList.add("bg-light");
    cardTitle.innerHTML = `<i class="bi bi-check-circle me-1 text-success"></i> ${card.dataset.title}`;
    cardTitle.classList.add("text-muted");
    if (editButton) editButton.style.display = "none";
    if (archiveIcon) updateArchiveIcon(archiveIcon, true);

    // Add archived badge if needed
    if (actualArchivedState) {
      const cardHeaderDiv = card.querySelector(
        ".d-flex.justify-content-between.align-items-start"
      );
      if (cardHeaderDiv) {
        const archivedBadge = document.createElement("span");
        archivedBadge.className = "badge bg-warning ms-2";
        archivedBadge.textContent = "Archived";
        cardHeaderDiv.appendChild(archivedBadge);
      }
    }
  } else {
    card.classList.remove("bg-light");
    cardTitle.textContent = card.dataset.title;
    cardTitle.classList.remove("text-muted");
    if (editButton) editButton.style.display = "inline";
    if (archiveIcon) updateArchiveIcon(archiveIcon, false);
  }
}

// Helper function to update archive icon state
function updateArchiveIcon(archiveIcon, isArchived) {
  archiveIcon.classList.remove("bi-archive", "bi-arrow-counterclockwise");

  if (isArchived) {
    archiveIcon.classList.add(
      "bi-arrow-counterclockwise",
      "action-icon",
      "text-success",
      "me-2"
    );
    archiveIcon.title = "Restore Task";
  } else {
    archiveIcon.classList.add(
      "bi-archive",
      "action-icon",
      "text-warning",
      "me-2"
    );
    archiveIcon.title = "Archive Task";
  }
  archiveIcon.setAttribute("data-action", "archive");
}

// Open task details modal
function openTaskDetailsModal(card) {
  const taskData = {
    title: card.dataset.title,
    description: card.dataset.description,
    dueDate: card.dataset.dueDate,
    priority: card.dataset.priority,
    tags: card.dataset.tags,
    attachment: card.dataset.attachment,
    created: card.dataset.created,
    archived: card.dataset.archived,
    taskId: card.dataset.taskId,
  };

  // Populate task details modal
  populateTaskDetailsModal(taskData);

  // Show the modal
  const taskDetailsModal = new bootstrap.Modal(
    document.getElementById("taskDetailsModal")
  );
  taskDetailsModal.show();
}

// Populate the task details modal with data from a task card
function populateTaskDetailsModal(taskData) {
  const isTaskArchived =
    taskData.archived === "true" || taskData.archived === true;

  // Set task title
  const taskTitle = document.getElementById("taskDetailsTitle");
  if (isTaskArchived) {
    taskTitle.innerHTML = `<i class="bi bi-check-circle me-1 text-success"></i> ${taskData.title}`;
    taskTitle.classList.add("text-muted");
  } else {
    taskTitle.textContent = taskData.title;
    taskTitle.classList.remove("text-muted");
  }

  // Set priority badge
  const priorityBadge = document.getElementById("taskDetailsPriority");
  const priorityText =
    taskData.priority === "High"
      ? "High Priority"
      : taskData.priority === "Medium"
      ? "Medium Priority"
      : "Low Priority";
  priorityBadge.textContent = priorityText;
  priorityBadge.className = "badge priority-" + taskData.priority.toLowerCase();

  // Set other details
  document.getElementById("taskDetailsDescription").textContent =
    taskData.description || "No description";
  document
    .getElementById("taskDetailsDueDate")
    .querySelector("span").textContent = taskData.dueDate || "No due date";
  document.getElementById("taskDetailsCreated").textContent = taskData.created;

  // Set tags
  const tagsContainer = document.getElementById("taskDetailsTags");
  tagsContainer.innerHTML = "";
  if (taskData.tags) {
    const tags = taskData.tags.split(",").filter((tag) => tag.trim());
    tags.forEach((tag) => {
      const tagBadge = document.createElement("span");
      tagBadge.className = "badge bg-secondary me-1";
      tagBadge.textContent = tag.trim();
      tagsContainer.appendChild(tagBadge);
    });
  }
  if (tagsContainer.children.length === 0) {
    tagsContainer.innerHTML =
      '<span class="text-muted fst-italic">No tags</span>';
  }

  // Set attachments
  const attachmentsContainer = document.getElementById(
    "taskDetailsAttachments"
  );
  attachmentsContainer.innerHTML = "";
  if (taskData.attachment && taskData.attachment !== "") {
    const attachments = taskData.attachment
      .split(",")
      .filter((att) => att.trim());
    attachments.forEach((attachment) => {
      const attachmentItem = document.createElement("div");
      attachmentItem.className = "d-flex align-items-center mb-2";
      attachmentItem.innerHTML = `
        <i class="bi bi-paperclip me-2 text-primary"></i>
        <a href="#" class="text-decoration-none">${attachment.trim()}</a>
      `;
      attachmentsContainer.appendChild(attachmentItem);
    });
  } else {
    attachmentsContainer.innerHTML =
      '<p class="text-muted fst-italic mb-0">No attachments</p>';
  }

  // Set archived status and button
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

  // Set up button handlers
  document.getElementById("editTaskBtn").onclick = function () {
    bootstrap.Modal.getInstance(
      document.getElementById("taskDetailsModal")
    ).hide();
    const taskCard = document.querySelector(
      `.task-card[data-task-id="${taskData.taskId}"]`
    );
    if (taskCard) setTimeout(() => handleEditTask(taskCard), 500);
  };

  document.getElementById("archiveTaskBtn").onclick = function () {
    const taskCard = document.querySelector(
      `.task-card[data-task-id="${taskData.taskId}"]`
    );
    if (taskCard) handleArchiveToggle(taskCard);
    bootstrap.Modal.getInstance(
      document.getElementById("taskDetailsModal")
    ).hide();
  };
}

// --- Setup Logout Handler ---
function setupLogoutHandler() {
  // Look for logout buttons or links
  const logoutElements = document.querySelectorAll(
    '[data-action="logout"], .logout-btn, .bi-box-arrow-right'
  );

  logoutElements.forEach((element) => {
    element.addEventListener("click", (e) => {
      e.preventDefault();
      if (confirm("Are you sure you want to logout?")) {
        handleLogout();
      }
    });
  });

  // Also handle if logout is in a parent element
  document.addEventListener("click", (e) => {
    if (
      e.target.closest(".bi-box-arrow-right") ||
      e.target.textContent.toLowerCase().includes("logout")
    ) {
      const parentLink = e.target.closest("a");
      if (parentLink && parentLink.href.includes("#")) {
        e.preventDefault();
        if (confirm("Are you sure you want to logout?")) {
          handleLogout();
        }
      }
    }
  });
}

// --- Display User Info ---
function displayUserInfo() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (user.username) {
    // Update user avatar if it exists
    const userAvatar = document.querySelector(".user-avatar");
    if (userAvatar) {
      userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        user.username
      )}&background=7b34d2&color=fff`;
      userAvatar.title = `Logged in as ${user.username}`;
    }

    // Update any username displays
    const usernameElements = document.querySelectorAll(".username-display");
    usernameElements.forEach((el) => {
      el.textContent = user.username;
    });
  }
}

// --- Initialize when DOM is loaded ---
document.addEventListener("DOMContentLoaded", function () {
  // Wait a bit for Bootstrap and other scripts to load
  setTimeout(initDashboard, 100);
});

// --- Export functions for external use ---
window.dashboardAPI = {
  loadTasks: loadTasksFromAPI,
  addTask: addTask,
  updateTask: updateTask,
  displaySuccessMessage: displaySuccessMessage,
  displayErrorMessage: displayErrorMessage,
};
