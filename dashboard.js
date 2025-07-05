// dashboard.js - Script for dashboard card-based UI with backend integration

// --- API Configuration ---
const API_BASE_URL = "http://localhost:5000";

// --- Global Variables ---
let editItem = null;
let actionInProgress = new Set(); // Track actions in progress to prevent conflicts
let allTasks = []; // Store all tasks for filtering
let currentSearchQuery = null; // Track current search query

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

    // Store tasks globally for search functionality
    if (endpoint === "/tasks") {
      allTasks = tasks || [];
      currentSearchQuery = null;
      updateSearchStatus(false);
    }

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
  cardDiv.className = "card task-card h-100 shadow-sm rounded-4";
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
    attachmentIcon.style.color = "#7b34d2";
    attachmentIcon.title = "View Attachments";
    attachmentsDiv.appendChild(attachmentIcon);
    // Add count badge
    const countBadge = document.createElement("span");
    countBadge.className = "ms-1 fw-bold text-purple";
    countBadge.style.color = "#7b34d2";
    countBadge.textContent = `x${task.attachment.length}`;
    attachmentsDiv.appendChild(countBadge);
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
  editIcon.className = "action-icon text-info bi bi-pencil";
  editIcon.title = "Edit Task";
  editIcon.style.cursor = "pointer";
  editIcon.onclick = (e) => {
    e.stopPropagation(); // Prevent card click
    handleEditTask(cardDiv);
  };

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
    const attachments = card.dataset.attachment
      ? card.dataset.attachment.split(",").filter((att) => att.trim())
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
    if (dueDateInput) {
      dueDateInput.value = taskDueDate;
      // Set minimum date to today for edit form as well
      const today = new Date().toISOString().split("T")[0];
      dueDateInput.setAttribute("min", today);
    }
    if (prioritySelect) prioritySelect.value = taskPriority;
    if (tagsInput) tagsInput.value = tags.join(", ");

    // Handle attachments
    if (attachments.length > 0) {
      setAttachmentDisplay(attachments, "attachmentContainer");
    } else {
      resetAttachments();
    }

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

    // Set tags
    setTags(tags);

    // Populate existing tags dropdown
    populateExistingTagsDropdown();
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

// --- Enhanced Search Functionality ---
function handleSearch() {
  const searchInput = document.querySelector(".search-bar");
  if (!searchInput) return;

  const searchTerm = searchInput.value.trim();

  if (searchTerm.length === 0) {
    // Empty query - return to normal view
    currentSearchQuery = null;
    updateSearchStatus(false);
    loadTasksFromAPI();
    return;
  }

  if (searchTerm.length < 2) {
    displayErrorMessage("Please enter at least 2 characters for search");
    return;
  }

  // Get search type preferences
  const useSemantic =
    document.getElementById("semanticSearchCheckbox")?.checked || false;
  const useContains =
    document.getElementById("containsSearchCheckbox")?.checked || false;

  // Perform search based on selected options
  performTaskSearch(searchTerm, useSemantic, useContains);
}

// --- Enhanced Search Function (supports both semantic and contains search) ---
async function performTaskSearch(
  query,
  useSemantic = true,
  useContains = false
) {
  try {
    console.log(
      `Performing search for "${query}" - Semantic: ${useSemantic}, Contains: ${useContains}`
    );

    // Build search URL with parameters
    let searchUrl = "/tasks";
    const params = [];

    if (useSemantic) {
      params.push(`q=${encodeURIComponent(query)}`);
    }
    if (useContains) {
      params.push(`contains=${encodeURIComponent(query)}`);
    }

    // If neither option is selected, default to semantic search
    if (!useSemantic && !useContains) {
      params.push(`q=${encodeURIComponent(query)}`);
    }

    if (params.length > 0) {
      searchUrl += `?${params.join("&")}`;
    }

    console.log("Search URL:", searchUrl);

    // Send GET request to the backend
    const searchResults = await apiFetch(searchUrl);
    console.log(`Search returned ${searchResults.length} results`);

    // Store the current search query for UI state
    currentSearchQuery = query;
    updateSearchStatus(true, query);

    // Render search results
    renderTasks(searchResults);
  } catch (error) {
    console.error("Search failed:", error);
    displayErrorMessage("Search failed. Please try again.");

    // Fall back to regular search
    filterTasksBySearch(query);
  }
}

// --- Fallback Regular Search Function ---
function filterTasksBySearch(query) {
  if (!query) {
    loadTasksFromAPI(); // Reset to show all tasks
    return;
  }

  // Filter tasks that match the search query
  const filteredTasks = allTasks.filter((task) => {
    const titleMatch = task.title.toLowerCase().includes(query.toLowerCase());
    const descriptionMatch =
      task.description &&
      task.description.toLowerCase().includes(query.toLowerCase());
    const tagsMatch =
      task.label &&
      task.label.some((tag) => tag.toLowerCase().includes(query.toLowerCase()));

    return titleMatch || descriptionMatch || tagsMatch;
  });

  // Store the current search query
  currentSearchQuery = query;
  updateSearchStatus(true, query);

  // Render filtered tasks
  renderTasks(filteredTasks);
}

// --- Render Tasks (unified function for both normal loading and search results) ---
function renderTasks(tasks) {
  const taskContainer = document.getElementById("taskList");

  // Clear existing tasks
  taskContainer.innerHTML = "";

  if (tasks.length === 0) {
    // Show empty state for no results
    showEmptySearchState();
  } else {
    // Render each task
    tasks.forEach((task) => {
      const taskCard = createTaskCard(task);
      taskContainer.appendChild(taskCard);
    });
  }

  // Update task counter
  updateTaskCounter(tasks.length);
}

// --- Show Empty Search State ---
function showEmptySearchState() {
  const taskContainer = document.getElementById("taskList");
  const emptyDiv = document.createElement("div");
  emptyDiv.className = "col-12";
  emptyDiv.innerHTML = `
    <div class="text-center py-5">
      <i class="bi bi-search text-muted" style="font-size: 4rem"></i>
      <h3 class="mt-3 text-muted">No Results Found</h3>
      <p class="text-muted">No tasks match your search query.</p>
      <button class="btn btn-outline-secondary mt-3" onclick="clearSearch()">
        <i class="bi bi-x-circle me-2"></i>Clear Search
      </button>
    </div>
  `;
  taskContainer.appendChild(emptyDiv);
}

// --- Show/Hide Search Status ---
function updateSearchStatus(isSearchActive, query = null) {
  let clearSearchBtn = document.getElementById("clearSearchBtn");

  if (isSearchActive && query) {
    if (clearSearchBtn) {
      clearSearchBtn.style.display = "inline-block";
    }
  } else {
    // Hide clear search button
    if (clearSearchBtn) {
      clearSearchBtn.style.display = "none";
    }
  }
}

// --- Clear Search Function ---
function clearSearch() {
  const searchInput = document.querySelector(".search-bar");
  if (searchInput) {
    searchInput.value = "";
  }

  currentSearchQuery = null;
  updateSearchStatus(false);
  loadTasksFromAPI();

  displaySuccessMessage("Search cleared!");
}

// --- Setup Search Functionality ---
function setupSearchFunctionality() {
  const searchInput = document.querySelector(".search-bar");
  const searchButton = document.querySelector(
    ".btn-primary-accent[type='button']"
  );

  if (!searchInput) return;

  // Handle Enter key press for search
  searchInput.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      handleSearch();
    }
  });

  if (searchButton) {
    // Handle search button click
    searchButton.addEventListener("click", handleSearch);
  }

  // Set up event listeners for search checkboxes
  const semanticCheckbox = document.getElementById("semanticSearchCheckbox");
  const containsCheckbox = document.getElementById("containsSearchCheckbox");

  if (semanticCheckbox) {
    semanticCheckbox.addEventListener("change", function () {
      if (currentSearchQuery) {
        const useSemantic = this.checked;
        const useContains = containsCheckbox?.checked || false;
        performTaskSearch(currentSearchQuery, useSemantic, useContains);
      }
    });
  }

  if (containsCheckbox) {
    containsCheckbox.addEventListener("change", function () {
      if (currentSearchQuery) {
        const useSemantic = semanticCheckbox?.checked || false;
        const useContains = this.checked;
        performTaskSearch(currentSearchQuery, useSemantic, useContains);
      }
    });
  }

  // Setup clear search button
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", clearSearch);
  }
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

  // Setup enhanced search functionality
  setupSearchFunctionality();

  setupLogoutHandler();
  displayUserInfo();
  setupTaskForm();
  setupAttachmentHandling();
}

// --- Setup Task Form ---
function setupTaskForm() {
  const addTaskModal = document.getElementById("addTaskModal");
  if (!addTaskModal) return;

  const form = addTaskModal.querySelector("form");
  if (!form) return;

  // Set minimum date to today for the due date input
  const dueDateInput = form.querySelector("#taskDueDate");
  if (dueDateInput) {
    const today = new Date().toISOString().split("T")[0];
    dueDateInput.setAttribute("min", today);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const taskData = {
      title: formData.get("title") || "",
      description: formData.get("description") || "",
      dueDate: formData.get("dueDate") || "",
      priority: formData.get("priority") || "Medium",
      label: getTagArray(),
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

    // Validate due date is not in the past
    const currentDate = new Date().toISOString().split("T")[0];
    if (new Date(taskData.dueDate) < new Date(currentDate)) {
      displayErrorMessage("Due date cannot be in the past!");
      return;
    }

    try {
      // Handle file uploads if there are attachments
      const attachmentFiles = getAttachmentFiles();
      let uploadedUrls = [];
      if (attachmentFiles.length > 0) {
        try {
          uploadedUrls = await uploadFiles(attachmentFiles);
        } catch (uploadError) {
          console.error("File upload failed:", uploadError);
          return; // Don't proceed if upload fails
        }
      }
      // Merge old and new attachments
      taskData.attachment = [
        ...(editExistingAttachments || []),
        ...(uploadedUrls || []),
      ];

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
      resetAttachments(); // Reset attachment state
    } catch (error) {
      console.error("Failed to save task:", error);
    }
  });

  // Reset form when modal is hidden
  addTaskModal.addEventListener("hidden.bs.modal", () => {
    form.reset();
    editItem = null;
    resetAttachments(); // Reset attachment state
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
      const div = document.createElement("div");
      div.className = "attachment-item mb-2 p-2 border rounded";
      div.style.backgroundColor = "var(--background-color)";

      const fileIcon = document.createElement("i");
      fileIcon.className = `bi ${getFileIcon(
        attachment.split(".").pop()?.toLowerCase()
      )} me-2`;
      fileIcon.style.color = "var(--text-color)";

      const fileNameSpan = document.createElement("span");
      fileNameSpan.className = "attachment-filename";
      fileNameSpan.textContent = attachment.split("/").pop();

      const viewableExtensions = [
        "pdf",
        "txt",
        "html",
        "htm",
        "css",
        "js",
        "json",
        "xml",
        "csv",
        "md",
        "jpg",
        "jpeg",
        "png",
        "gif",
        "svg",
        "webp",
        "bmp",
        "ico",
        "mp3",
        "wav",
        "ogg",
        "mp4",
        "webm",
        "py",
        "java",
        "cpp",
        "c",
        "php",
        "rb",
        "go",
        "rs",
        "swift",
        "kt",
        "yaml",
        "yml",
        "toml",
        "ini",
        "conf",
        "log",
        "woff",
        "woff2",
        "ttf",
        "eot",
      ];
      const fileExtension = attachment.split(".").pop()?.toLowerCase();
      const canView = viewableExtensions.includes(fileExtension);
      const fullUrl = attachment.startsWith("/uploads/")
        ? `${API_BASE_URL}${attachment}`
        : attachment;

      let viewBtn = null;
      if (canView) {
        viewBtn = document.createElement("a");
        viewBtn.href = "#";
        viewBtn.className = "btn btn-sm btn-primary me-2";
        viewBtn.innerHTML = '<i class="bi bi-eye me-1"></i>View';
        viewBtn.title = getFileTypeInfo(fileExtension);
        viewBtn.onclick = (e) => {
          e.preventDefault();
          if (
            ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "ico"].includes(
              fileExtension
            )
          ) {
            showImagePreview(fullUrl, fileNameSpan.textContent);
          } else if (
            ["mp3", "wav", "ogg", "mp4", "webm"].includes(fileExtension)
          ) {
            showMediaPreview(fullUrl, fileNameSpan.textContent, fileExtension);
          } else {
            showDocumentPreview(fullUrl, fileNameSpan.textContent);
          }
        };
      }
      const downloadBtn = document.createElement("a");
      downloadBtn.href = fullUrl;
      downloadBtn.download = fileNameSpan.textContent;
      downloadBtn.className = "btn btn-sm btn-outline-secondary me-2";
      downloadBtn.innerHTML = '<i class="bi bi-download me-1"></i>Download';
      downloadBtn.title = `Download ${
        fileNameSpan.textContent
      } (${getFileTypeInfo(fileExtension)})`;

      div.appendChild(fileIcon);
      div.appendChild(fileNameSpan);
      if (viewBtn) div.appendChild(viewBtn);
      div.appendChild(downloadBtn);
      attachmentsContainer.appendChild(div);
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
  console.log("Setting up logout handler...");
  
  // Wait a bit for Bootstrap to initialize
  setTimeout(() => {
    // Look for logout buttons or links with multiple selectors
    const logoutElements = document.querySelectorAll('a[href="#"] .bi-box-arrow-right, .dropdown-item:has(.bi-box-arrow-right), a:has(.bi-box-arrow-right)');
    console.log("Found logout elements:", logoutElements.length);

  logoutElements.forEach((element) => {
      console.log("Adding click listener to:", element);
    element.addEventListener("click", (e) => {
        console.log("Logout element clicked!");
      e.preventDefault();
        e.stopPropagation();
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
          console.log("Logout link clicked via delegation!");
        e.preventDefault();
          e.stopPropagation();
        if (confirm("Are you sure you want to logout?")) {
          handleLogout();
        }
      }
    }
  });
  }, 200);
}

// --- Display User Info ---
function displayUserInfo() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (user.username) {
    // Update user avatar if it exists
    const userAvatar = document.querySelector(".user-avatar");
    if (userAvatar) {
      // Use only the first letter of the username
      const firstLetter = user.username.charAt(0).toUpperCase();
      userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        firstLetter
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

// --- Attachment Functionality ---
// Global variables for attachment handling
let selectedFiles = [];
let editExistingAttachments = [];

// Setup attachment functionality
function setupAttachmentHandling() {
  const fileInput = document.getElementById("taskAttachment");
  const attachmentContainer = document.getElementById("attachmentContainer");
  const editFileInput = document.getElementById("editTaskAttachment");
  const editAttachmentContainer = document.getElementById(
    "editAttachmentContainer"
  );

  if (fileInput && attachmentContainer) {
    fileInput.addEventListener("change", function () {
      selectedFiles = Array.from(fileInput.files);
      renderAttachmentList(
        attachmentContainer,
        selectedFiles,
        editExistingAttachments
      );
    });
  }

  if (editFileInput && editAttachmentContainer) {
    editFileInput.addEventListener("change", function () {
      selectedFiles = Array.from(editFileInput.files);
      renderAttachmentList(
        editAttachmentContainer,
        selectedFiles,
        editExistingAttachments
      );
    });
  }
}

// Get file type information
function getFileTypeInfo(fileExtension) {
  const fileTypeInfo = {
    // Viewable files
    pdf: "PDF Document - Viewable in browser",
    txt: "Text File - Viewable in browser",
    html: "HTML File - Viewable in browser",
    css: "CSS File - Viewable in browser",
    js: "JavaScript File - Viewable in browser",
    json: "JSON Data - Viewable in browser",
    xml: "XML Data - Viewable in browser",
    csv: "CSV Data - Viewable in browser",
    md: "Markdown File - Viewable in browser",

    // Images
    jpg: "JPEG Image - Viewable in browser",
    jpeg: "JPEG Image - Viewable in browser",
    png: "PNG Image - Viewable in browser",
    gif: "GIF Image - Viewable in browser",
    svg: "SVG Image - Viewable in browser",
    webp: "WebP Image - Viewable in browser",
    bmp: "BMP Image - Viewable in browser",
    ico: "Icon File - Viewable in browser",

    // Media files
    mp3: "Audio File - Playable in browser",
    wav: "Audio File - Playable in browser",
    ogg: "Audio/Video File - Playable in browser",
    mp4: "Video File - Playable in browser",
    webm: "Video File - Playable in browser",

    // Code files
    py: "Python Code - Viewable in browser",
    java: "Java Code - Viewable in browser",
    cpp: "C++ Code - Viewable in browser",
    c: "C Code - Viewable in browser",
    php: "PHP Code - Viewable in browser",
    rb: "Ruby Code - Viewable in browser",
    go: "Go Code - Viewable in browser",
    rs: "Rust Code - Viewable in browser",
    swift: "Swift Code - Viewable in browser",
    kt: "Kotlin Code - Viewable in browser",

    // Data files
    yaml: "YAML Data - Viewable in browser",
    yml: "YAML Data - Viewable in browser",
    toml: "TOML Data - Viewable in browser",
    ini: "INI Config - Viewable in browser",
    conf: "Config File - Viewable in browser",
    log: "Log File - Viewable in browser",

    // Non-viewable files
    doc: "Word Document - Requires Microsoft Word or similar",
    docx: "Word Document - Requires Microsoft Word or similar",
    xls: "Excel Spreadsheet - Requires Microsoft Excel or similar",
    xlsx: "Excel Spreadsheet - Requires Microsoft Excel or similar",
    ppt: "PowerPoint Presentation - Requires Microsoft PowerPoint or similar",
    pptx: "PowerPoint Presentation - Requires Microsoft PowerPoint or similar",
    zip: "Archive File - Requires extraction software",
    rar: "Archive File - Requires extraction software",
    exe: "Executable File - Cannot be viewed in browser for security",
    app: "Application File - Cannot be viewed in browser for security",
  };

  return (
    fileTypeInfo[fileExtension] ||
    `Unknown file type (.${fileExtension}) - May not be viewable`
  );
}

// Get file type icon based on extension
function getFileIcon(fileExtension) {
  const iconMap = {
    pdf: "bi-file-earmark-pdf",
    doc: "bi-file-earmark-word",
    docx: "bi-file-earmark-word",
    xls: "bi-file-earmark-excel",
    xlsx: "bi-file-earmark-excel",
    ppt: "bi-file-earmark-ppt",
    pptx: "bi-file-earmark-ppt",
    txt: "bi-file-earmark-text",
    jpg: "bi-file-earmark-image",
    jpeg: "bi-file-earmark-image",
    png: "bi-file-earmark-image",
    gif: "bi-file-earmark-image",
    svg: "bi-file-earmark-image",
    mp4: "bi-file-earmark-play",
    avi: "bi-file-earmark-play",
    mov: "bi-file-earmark-play",
    mp3: "bi-file-earmark-music",
    wav: "bi-file-earmark-music",
    zip: "bi-file-earmark-zip",
    rar: "bi-file-earmark-zip",
    html: "bi-file-earmark-code",
    htm: "bi-file-earmark-code",
    css: "bi-file-earmark-code",
    js: "bi-file-earmark-code",
    json: "bi-file-earmark-code",
    xml: "bi-file-earmark-code",
    csv: "bi-file-earmark-spreadsheet",
  };

  return iconMap[fileExtension] || "bi-file-earmark";
}

// Render attachment list with delete functionality
function renderAttachmentList(container, files, existingAttachments = []) {
  if (!container) return;

  container.innerHTML = "";

  // Show existing attachments (when editing)
  existingAttachments.forEach((url, idx) => {
    const div = document.createElement("div");
    div.className = "attachment-item mb-2 p-2 border rounded";
    div.style.backgroundColor = "var(--background-color)";

    const fileIcon = document.createElement("i");
    fileIcon.className = `bi ${getFileIcon(
      url.split(".").pop()?.toLowerCase()
    )} me-2`;
    fileIcon.style.color = "var(--text-color)";

    const fileNameSpan = document.createElement("span");
    fileNameSpan.className = "attachment-filename";
    fileNameSpan.textContent = url.split("/").pop();

    const viewableExtensions = [
      "pdf",
      "txt",
      "html",
      "htm",
      "css",
      "js",
      "json",
      "xml",
      "csv",
      "md",
      "jpg",
      "jpeg",
      "png",
      "gif",
      "svg",
      "webp",
      "bmp",
      "ico",
      "mp3",
      "wav",
      "ogg",
      "mp4",
      "webm",
      "py",
      "java",
      "cpp",
      "c",
      "php",
      "rb",
      "go",
      "rs",
      "swift",
      "kt",
      "yaml",
      "yml",
      "toml",
      "ini",
      "conf",
      "log",
      "woff",
      "woff2",
      "ttf",
      "eot",
    ];
    const fileExtension = url.split(".").pop()?.toLowerCase();
    const canView = viewableExtensions.includes(fileExtension);
    const fullUrl = url.startsWith("/uploads/") ? `${API_BASE_URL}${url}` : url;

    let viewBtn = null;
    if (canView) {
      viewBtn = document.createElement("a");
      viewBtn.href = "#";
      viewBtn.className = "btn btn-sm btn-primary me-2";
      viewBtn.innerHTML = '<i class="bi bi-eye me-1"></i>View';
      viewBtn.title = getFileTypeInfo(fileExtension);
      viewBtn.onclick = (e) => {
        e.preventDefault();
        if (
          ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "ico"].includes(
            fileExtension
          )
        ) {
          showImagePreview(fullUrl, fileNameSpan.textContent);
        } else if (
          ["mp3", "wav", "ogg", "mp4", "webm"].includes(fileExtension)
        ) {
          showMediaPreview(fullUrl, fileNameSpan.textContent, fileExtension);
        } else {
          showDocumentPreview(fullUrl, fileNameSpan.textContent);
        }
      };
    }
    const downloadBtn = document.createElement("a");
    downloadBtn.href = fullUrl;
    downloadBtn.download = fileNameSpan.textContent;
    downloadBtn.className = "btn btn-sm btn-outline-secondary me-2";
    downloadBtn.innerHTML = '<i class="bi bi-download me-1"></i>Download';
    downloadBtn.title = `Download ${
      fileNameSpan.textContent
    } (${getFileTypeInfo(fileExtension)})`;

    // Remove button for old attachments
    const removeBtn = document.createElement("button");
    removeBtn.innerHTML = '<i class="bi bi-x-circle"></i>';
    removeBtn.className = "btn btn-sm btn-outline-danger ms-auto";
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      existingAttachments.splice(idx, 1);
      renderAttachmentList(container, files, existingAttachments);
    };

    div.appendChild(fileIcon);
    div.appendChild(fileNameSpan);
    if (viewBtn) div.appendChild(viewBtn);
    div.appendChild(downloadBtn);
    div.appendChild(removeBtn);
    container.appendChild(div);
  });

  // Show new attachments (not yet uploaded)
  files.forEach((file, idx) => {
    const div = document.createElement("div");
    div.className = "attachment-item mb-2 p-2 border rounded";
    div.style.backgroundColor = "var(--background-color)";

    const fileIcon = document.createElement("i");
    fileIcon.className = `bi ${getFileIcon(
      file.name.split(".").pop()?.toLowerCase()
    )} me-2`;
    fileIcon.style.color = "var(--text-color)";

    const fileNameSpan = document.createElement("span");
    fileNameSpan.className = "attachment-filename";
    fileNameSpan.textContent = file.name;

    const fileSize = document.createElement("small");
    fileSize.textContent = `(${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    fileSize.className = "text-muted me-2";

    const removeBtn = document.createElement("button");
    removeBtn.innerHTML = '<i class="bi bi-x-circle"></i>';
    removeBtn.className = "btn btn-sm btn-outline-danger ms-auto";
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      files.splice(idx, 1);
      renderAttachmentList(container, files, existingAttachments);

      // Clear file input if no files left
      const fileInput =
        document.getElementById("taskAttachment") ||
        document.getElementById("editTaskAttachment");
      if (fileInput && files.length === 0) {
        fileInput.value = "";
      }
    };

    div.appendChild(fileIcon);
    div.appendChild(fileNameSpan);
    div.appendChild(fileSize);
    div.appendChild(removeBtn);
    container.appendChild(div);
  });
}

// Get attachment files for form submission
function getAttachmentFiles() {
  return selectedFiles;
}

// Set attachment display for editing
function setAttachmentDisplay(urls, containerId = "attachmentContainer") {
  const container = document.getElementById(containerId);
  if (!container) return;

  editExistingAttachments = Array.isArray(urls) ? [...urls] : [];
  selectedFiles = [];
  renderAttachmentList(container, selectedFiles, editExistingAttachments);
}

// Upload files to server
async function uploadFiles(files) {
  if (!files.length) return [];

  try {
    console.log("Starting file upload for", files.length, "files");
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
      console.log("Added file to FormData:", file.name, file.size);
    });

    const token = localStorage.getItem("token");
    console.log("Token available:", !!token);

    const uploadResponse = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("Upload response status:", uploadResponse.status);

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Upload error response:", errorText);
      throw new Error(
        `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`
      );
    }

    const data = await uploadResponse.json();
    console.log("Upload success, files:", data.files);
    return data.files; // Array of URLs
  } catch (error) {
    console.error("File upload error:", error);
    displayErrorMessage(`Failed to upload files: ${error.message}`);
    throw error;
  }
}

// Reset attachment state
function resetAttachments() {
  selectedFiles = [];
  editExistingAttachments = [];

  const attachmentContainer = document.getElementById("attachmentContainer");
  const editAttachmentContainer = document.getElementById(
    "editAttachmentContainer"
  );

  if (attachmentContainer) attachmentContainer.innerHTML = "";
  if (editAttachmentContainer) editAttachmentContainer.innerHTML = "";

  const fileInput = document.getElementById("taskAttachment");
  const editFileInput = document.getElementById("editTaskAttachment");

  if (fileInput) fileInput.value = "";
  if (editFileInput) editFileInput.value = "";
}

// Show image preview in modal
function showImagePreview(imageUrl, fileName) {
  const previewImage = document.getElementById("previewImage");
  const downloadImageBtn = document.getElementById("downloadImageBtn");
  const modalTitle = document.getElementById("imagePreviewModalLabel");

  if (previewImage && downloadImageBtn && modalTitle) {
    previewImage.src = imageUrl;
    downloadImageBtn.href = imageUrl;
    downloadImageBtn.download = fileName;
    modalTitle.textContent = `Image Preview: ${fileName}`;

    const imagePreviewModal = new bootstrap.Modal(
      document.getElementById("imagePreviewModal")
    );
    imagePreviewModal.show();
  }
}

// Show media preview in modal
function showMediaPreview(mediaUrl, fileName, fileExtension) {
  const modalTitle = document.getElementById("imagePreviewModalLabel");
  const modalBody = document.querySelector("#imagePreviewModal .modal-body");
  const downloadBtn = document.getElementById("downloadImageBtn");

  if (modalTitle && modalBody && downloadBtn) {
    modalTitle.textContent = `Media Preview: ${fileName}`;
    downloadBtn.href = mediaUrl;
    downloadBtn.download = fileName;

    // Clear previous content
    modalBody.innerHTML = "";

    // Create media element based on file type
    if (["mp3", "wav", "ogg"].includes(fileExtension)) {
      // Audio player
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.style.width = "100%";
      audio.style.maxWidth = "500px";
      audio.src = mediaUrl;
      modalBody.appendChild(audio);
    } else if (["mp4", "webm", "ogg"].includes(fileExtension)) {
      // Video player
      const video = document.createElement("video");
      video.controls = true;
      video.style.width = "100%";
      video.style.maxWidth = "800px";
      video.style.maxHeight = "70vh";
      video.src = mediaUrl;
      modalBody.appendChild(video);
    }

    const mediaPreviewModal = new bootstrap.Modal(
      document.getElementById("imagePreviewModal")
    );
    mediaPreviewModal.show();
  }
}

// Show document preview in modal
function showDocumentPreview(docUrl, fileName) {
  let docModal = document.getElementById("documentPreviewModal");
  if (!docModal) {
    docModal = document.createElement("div");
    docModal.className = "modal fade";
    docModal.id = "documentPreviewModal";
    docModal.tabIndex = -1;
    docModal.setAttribute("aria-labelledby", "documentPreviewModalLabel");
    docModal.setAttribute("aria-hidden", "true");
    docModal.innerHTML = `
      <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="documentPreviewModalLabel">Document Preview</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-0" style="height: 80vh;">
            <iframe id="previewDocFrame" src="" style="width: 100%; height: 100%; border: none;"></iframe>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <a id="downloadDocBtn" href="" download class="btn btn-primary">
              <i class="bi bi-download me-1"></i>Download
            </a>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(docModal);
  }
  const previewDocFrame = docModal.querySelector("#previewDocFrame");
  const downloadDocBtn = docModal.querySelector("#downloadDocBtn");
  if (previewDocFrame && downloadDocBtn) {
    previewDocFrame.src = docUrl;
    downloadDocBtn.href = docUrl;
    downloadDocBtn.download = fileName;
  }
  const modal = new bootstrap.Modal(docModal);
  modal.show();
}

// --- Tag Chip Logic ---
function addTag(tag) {
  tag = tag.trim();
  if (!tag) return;
  // Prevent duplicate tags
  if (getTagArray().includes(tag)) return;
  const tagContainer = document.getElementById("tagContainer");
  const chip = document.createElement("span");
  chip.className = "tag-chip badge bg-info text-dark me-1 mb-1";
  chip.textContent = tag;
  // Remove button
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn btn-sm btn-link p-0 m-0 ms-1";
  removeBtn.innerHTML = "&times;";
  removeBtn.onclick = () => chip.remove();
  chip.appendChild(removeBtn);
  tagContainer.appendChild(chip);
}
function setTags(tags) {
  const tagContainer = document.getElementById("tagContainer");
  tagContainer.innerHTML = "";
  (tags || []).forEach((tag) => addTag(tag));
}
function getTagArray() {
  const tagContainer = document.getElementById("tagContainer");
  return Array.from(tagContainer.querySelectorAll(".tag-chip")).map((chip) =>
    chip.childNodes[0].textContent.trim()
  );
}
// Add Tag button logic
const tagInput = document.getElementById("tagInput");
const addTagBtn = document.getElementById("addTagBtn");
if (addTagBtn && tagInput) {
  addTagBtn.onclick = function () {
    const tags = tagInput.value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    tags.forEach(addTag);
    tagInput.value = "";
  };
  tagInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTagBtn.onclick();
    }
  });
}

function showAddTaskModal() {
  setTags([]); // Clear tag chips
  if (tagInput) tagInput.value = "";
  const addTaskModal = new bootstrap.Modal(
    document.getElementById("addTaskModal")
  );
  addTaskModal.show();
}

// At the end of the file or after DOMContentLoaded:
const showAddFormBtn = document.getElementById("showAddFormBtn");
if (showAddFormBtn) {
  showAddFormBtn.addEventListener("click", function (e) {
    e.preventDefault();
    showAddTaskModal();
  });
}

async function populateExistingTagsDropdown() {
  const dropdown = document.getElementById("existingTagsDropdown");
  if (!dropdown) return;
  dropdown.innerHTML = '<option value="">Select existing tag</option>';
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      headers: { Authorization: "Bearer " + token },
    });
    const tasks = await response.json();
    const tagSet = new Set();
    tasks.forEach((task) => {
      if (Array.isArray(task.label)) {
        task.label.forEach((l) => tagSet.add(l));
      }
    });
    Array.from(tagSet)
      .sort()
      .forEach((tag) => {
        const option = document.createElement("option");
        option.value = tag;
        option.textContent = tag;
        dropdown.appendChild(option);
      });
  } catch (err) {
    // ignore
  }
}
// Add event listener for dropdown
const existingTagsDropdown = document.getElementById("existingTagsDropdown");
if (existingTagsDropdown) {
  existingTagsDropdown.addEventListener("change", function () {
    const tag = this.value;
    if (tag) {
      addTag(tag);
      this.value = "";
    }
  });
}
// Call populateExistingTagsDropdown when opening the modal
const oldShowAddTaskModal = showAddTaskModal;
showAddTaskModal = function () {
  oldShowAddTaskModal();
  populateExistingTagsDropdown();
};
// Also call in handleEditTask
const oldHandleEditTask = handleEditTask;
handleEditTask = function (card) {
  oldHandleEditTask(card);
  populateExistingTagsDropdown();
};

// --- 筛选/排序/标签过滤功能 ---
document.addEventListener("DOMContentLoaded", function () {
  // 监听筛选下拉菜单点击
  const filterDropdown = document.getElementById("filterDropdown");
  if (filterDropdown) {
    const dropdownMenu = filterDropdown.nextElementSibling;
    if (dropdownMenu) {
      dropdownMenu.addEventListener("click", function (e) {
        const item = e.target.closest(".dropdown-item");
        if (!item) return;
        const filterType = item.getAttribute("data-filter-type");
        if (!filterType) return;

        if (filterType === "priority-desc") {
          filterTasksByPriority("desc");
        } else if (filterType === "priority-asc") {
          filterTasksByPriority("asc");
        } else if (filterType === "date-desc") {
          filterTasksByDueDate("desc");
        } else if (filterType === "date-asc") {
          filterTasksByDueDate("asc");
        } else if (filterType === "clear-filters") {
          clearAllFilters();
        }
      });
    }
  }

  // Add event listener for Clear Filter button
  const clearFiltersBtn = document.getElementById("clearFiltersBtn");
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", clearAllFilters);
  }

  // 为任务卡片上的标签添加点击事件
  document.addEventListener("click", function (e) {
    if (
      e.target.classList.contains("badge") &&
      e.target.closest(".task-card")
    ) {
      const tag = e.target.textContent.trim();
      if (tag) {
        filterTasksByTag(tag);
        // 更新筛选按钮文本
        const filterBtn = document.getElementById("filterDropdown");
        if (filterBtn) {
          filterBtn.innerHTML = `<i class="bi bi-funnel me-2"></i>Filter: ${tag}`;
        }
      }
    }
  });
});

// 按优先级排序
function filterTasksByPriority(order = "desc") {
  const taskList = document.getElementById("taskList");
  const cards = Array.from(taskList.querySelectorAll(".task-card"));
  cards.sort((a, b) => {
    const pA = a.dataset.priority || "Low";
    const pB = b.dataset.priority || "Low";
    const priorityMap = { High: 3, Medium: 2, Low: 1 };
    return order === "desc"
      ? priorityMap[pB] - priorityMap[pA]
      : priorityMap[pA] - priorityMap[pB];
  });
  cards.forEach((card) => taskList.appendChild(card.parentElement)); // .parentElement 是 .col
}

// 按截止日期排序
function filterTasksByDueDate(order = "desc") {
  const taskList = document.getElementById("taskList");
  const cards = Array.from(taskList.querySelectorAll(".task-card"));
  cards.sort((a, b) => {
    const dA = new Date(a.dataset.dueDate || "2100-01-01");
    const dB = new Date(b.dataset.dueDate || "2100-01-01");
    return order === "desc" ? dB - dA : dA - dB;
  });
  cards.forEach((card) => taskList.appendChild(card.parentElement));
}

// 按标签过滤
function filterTasksByTag(tag) {
  const taskList = document.getElementById("taskList");
  const cards = Array.from(taskList.querySelectorAll(".task-card"));
  let anyVisible = false;
  cards.forEach((card) => {
    const tags = (card.dataset.tags || "").split(",").map((t) => t.trim());
    if (tags.includes(tag)) {
      card.parentElement.style.display = "";
      anyVisible = true;
    } else {
      card.parentElement.style.display = "none";
    }
  });
  // 如果没有任何卡片显示，显示空状态
  if (!anyVisible) {
    showEmptyState(`No tasks found with tag "${tag}"`);
  }
}

// 清除所有筛选
function clearAllFilters() {
  // Reload all tasks from API to reset to default state
  loadTasksFromAPI();

  // Reset filter button text
  const filterBtn = document.getElementById("filterDropdown");
  if (filterBtn) {
    filterBtn.innerHTML = `<i class="bi bi-funnel me-2"></i>Filter Tasks`;
  }

  // Hide empty state
  hideEmptyState();
}

// 显示空状态
function showEmptyState(message) {
  let emptyState = document.getElementById("emptyState");
  if (!emptyState) {
    emptyState = document.createElement("div");
    emptyState.id = "emptyState";
    emptyState.className = "col-12 text-center py-5";
    document.getElementById("taskList").appendChild(emptyState);
  }
  emptyState.innerHTML = `
    <i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>
    <h4 class="mt-3 text-muted">${message}</h4>
    <p class="text-muted">Try a different filter or add new tasks.</p>
  `;
}

// 隐藏空状态
function hideEmptyState() {
  const emptyState = document.getElementById("emptyState");
  if (emptyState) {
    emptyState.remove();
  }
}
