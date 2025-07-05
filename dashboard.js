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

// --- Create a task card following the existing Bootstrap structure of priority.js ---
function createTaskCard(task) {
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

  // Complete icon
  const archiveIcon = document.createElement("i");
  archiveIcon.className = "action-icon text-warning bi bi-archive";
  archiveIcon.title = "Complete Task";
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

  if (task.attachment && Array.isArray(task.attachment) && task.attachment.length > 0) {
    const attachmentsDiv = document.createElement("div");
    attachmentsDiv.className = "mb-2";
    const attachmentIcon = document.createElement("i");
    attachmentIcon.className = "bi bi-paperclip";
    attachmentIcon.style.color = "#7b34d2";
    attachmentIcon.title = "View Attachments";
    attachmentsDiv.appendChild(attachmentIcon);
    // Add count badge
    const countBadge = document.createElement("span");
    countBadge.className = "ms-1 fw-bold";
    countBadge.style.color = "#7b34d2";
    countBadge.textContent = `x${task.attachment.length}`;
    attachmentsDiv.appendChild(countBadge);
    cardBodyDiv.appendChild(attachmentsDiv);
  }

  cardDiv.appendChild(cardBodyDiv);
  colDiv.appendChild(cardDiv);

  // Apply styling based on task status (matching priority.js exactly)
  const isCompleted =
    task.completed === true ||
    task.completed === "true" ||
    task.completed === 1;

  if (isCompleted) {
    // Apply exact same styling as priority.js
    cardDiv.classList.add("bg-light");
    titleH5.innerHTML = `<i class="bi bi-check-circle me-1 text-success"></i> ${
      task.title || "Untitled Task"
    }`;
    titleH5.classList.add("text-muted");

    // Add archived badge to header (same position as priority.js)
    const archivedBadge = document.createElement("span");
    archivedBadge.className = "badge bg-warning ms-2";
    archivedBadge.textContent = "Completed";
    cardHeaderDiv.appendChild(archivedBadge);

    // Hide edit button (same as priority.js)
    editIcon.style.display = "none";

    // Update archive icon to restore icon
    archiveIcon.className =
      "action-icon text-success bi bi-arrow-counterclockwise";
    archiveIcon.title = "Restore Task";
  }

  return colDiv;
}

// --- Task Action Functions (aligned with priority.js) ---

// Edit task function - show edit modal instead of redirecting
async function editTask(taskId) {
  if (actionInProgress.has(taskId)) return;

  try {
    // Find the task to edit
    const task = allTasks.find((t) => t._id === taskId);
    if (!task) {
      displayErrorMessage("Task not found");
      return;
    }

    // Populate the edit form with task data
    populateEditForm(task);
    
    // Populate existing tags dropdown
    populateExistingTagsDropdown();

    // Store task ID for form submission
    window.currentEditTaskId = taskId;

    // Show the edit modal
    const editModal = new bootstrap.Modal(
      document.getElementById("editTaskModal")
    );
    editModal.show();
    
    // Trigger a custom event to signal that the edit form is opened
    document.dispatchEvent(new CustomEvent("edit-task-opened", {
      detail: { taskId: taskId }
    }));
  } catch (error) {
    console.error("Failed to open edit form:", error);
    displayErrorMessage("Failed to open edit form");
  }
}

// Complete/Archive task function
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

    const isCurrentlyCompleted =
      task.completed === true ||
      task.completed === "true" ||
      task.completed === 1;
    const newCompletedState = !isCurrentlyCompleted;

    // Update task via API
    await apiFetch(`/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({
        completed: newCompletedState,
      }),
    });

    displaySuccessMessage(
      newCompletedState
        ? "Task completed and archived successfully!"
        : "Task restored and marked incomplete successfully!"
    );

    // Refresh the tasks to reflect the change
    await loadTasksFromAPI();
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
    await loadTasksFromAPI();
  } catch (error) {
    console.error("Failed to delete task:", error);
    displayErrorMessage("Failed to delete task. Please try again.");
  } finally {
    actionInProgress.delete(taskId);
  }
}

// View task details function - shows task details in modal (aligned with priority.js)
function viewTaskDetails(task) {
  const isTaskCompleted =
    task.completed === true ||
    task.completed === "true" ||
    task.completed === 1;

  // Set task title with archived styling (matching dashboard exactly)
  const taskTitle = document.getElementById("taskDetailsTitle");
  if (taskTitle) {
    if (isTaskCompleted) {
      taskTitle.innerHTML = `<i class="bi bi-check-circle me-1 text-success"></i> ${task.title}`;
      taskTitle.classList.add("text-muted");
    } else {
      taskTitle.textContent = task.title;
      taskTitle.classList.remove("text-muted");
    }
  }

  // Set priority badge (matching dashboard format)
  const priorityBadge = document.getElementById("taskDetailsPriority");
  if (priorityBadge) {
    const priorityText =
      task.priority === "High"
        ? "High Priority"
        : task.priority === "Medium"
        ? "Medium Priority"
        : "Low Priority";
    priorityBadge.textContent = priorityText;
    const priorityClass = `priority-${(task.priority || "low").toLowerCase()}`;
    priorityBadge.className = `badge ${priorityClass}`;
  }

  // Set description
  const taskDetailsDescription = document.getElementById("taskDetailsDescription");
  if (taskDetailsDescription) {
    taskDetailsDescription.textContent = task.description || "No description";
  }

  // Set due date
  const dueDateElement = document.getElementById("taskDetailsDueDate");
  if (dueDateElement) {
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date";
    dueDateElement.querySelector("span").textContent = dueDate;
  }

  // Set tags (matching dashboard format)
  const tagsContainer = document.getElementById("taskDetailsTags");
  if (tagsContainer) {
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
      tagsContainer.innerHTML = '<span class="text-muted fst-italic">No tags</span>';
    }
  }

  // Set attachments (matching dashboard format)
  const attachmentsContainer = document.getElementById( "taskDetailsAttachments" );
  if (attachmentsContainer) {
    attachmentsContainer.innerHTML = "";
    if ( task.attachment && Array.isArray(task.attachment) && task.attachment.length > 0 ) {
      task.attachment.forEach((attachment) => {
        const fileExtension = attachment.split(".").pop()?.toLowerCase();
        const fileName = attachment.trim().split("/").pop();
        const fullUrl = attachment.trim().startsWith("/uploads/") ? `${API_BASE_URL}${attachment.trim()}` : attachment.trim();
        const viewableExtensions = [ "pdf", "txt", "html", "htm", "css", "js", "json", "xml", "csv", "md", "jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "ico", "mp3", "wav", "ogg", "mp4", "webm", "py", "java", "cpp", "c", "php", "rb", "go", "rs", "swift", "kt", "yaml", "yml", "toml", "ini", "conf", "log", "woff", "woff2", "ttf", "eot" ];
        const canView = viewableExtensions.includes(fileExtension);
        const attachmentItem = document.createElement("div");
        attachmentItem.className = "d-flex align-items-center mb-2";
        attachmentItem.innerHTML = ` <i class=\"bi bi-paperclip me-2\" style=\"color: #7b34d2;\"></i> <span class=\"attachment-filename me-2\">${fileName}</span> `;
        if (canView) {
          const viewBtn = document.createElement("a");
          viewBtn.href = "#";
          viewBtn.className = "btn btn-sm btn-primary me-2";
          viewBtn.innerHTML = '<i class="bi bi-eye me-1"></i>View';
          viewBtn.onclick = (e) => {
            e.preventDefault();
            if (["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "ico"].includes(fileExtension)) {
              showImagePreview(fullUrl, fileName);
            } else if (["mp3", "wav", "ogg", "mp4", "webm"].includes(fileExtension)) {
              showMediaPreview(fullUrl, fileName, fileExtension);
            } else {
              showDocumentPreview(fullUrl, fileName);
            }
          };
          attachmentItem.appendChild(viewBtn);
        }
        const downloadBtn = document.createElement("a");
        downloadBtn.href = fullUrl;
        downloadBtn.download = fileName;
        downloadBtn.className = "btn btn-sm btn-outline-secondary me-2";
        downloadBtn.innerHTML = '<i class="bi bi-download me-1"></i>Download';
        attachmentItem.appendChild(downloadBtn);
        attachmentsContainer.appendChild(attachmentItem);
      });
    } else {
      attachmentsContainer.innerHTML = '<p class="text-muted fst-italic mb-0">No attachments</p>';
    }
  }

  // Set creation date
  const taskDetailsCreated = document.getElementById("taskDetailsCreated");
  if (taskDetailsCreated) {
    const createdDate = task.createdAt ? new Date(task.createdAt).toLocaleDateString() : "Unknown";
    taskDetailsCreated.textContent = createdDate;
  }

  // Set archived status and button (matching dashboard exactly)
  const archivedBadge = document.getElementById("taskDetailsCompleted");
  const archiveBtn = document.getElementById("archiveTaskBtn");
  if (archivedBadge && archiveBtn) {
    if (isTaskCompleted) {
      archivedBadge.classList.remove("d-none");
      archiveBtn.innerHTML = '<i class="bi bi-arrow-counterclockwise me-1"></i> Restore';
      archiveBtn.classList.remove("btn-warning");
      archiveBtn.classList.add("btn-success");
    } else {
      archivedBadge.classList.add("d-none");
      archiveBtn.innerHTML = '<i class="bi bi-archive me-1"></i> Complete';
      archiveBtn.classList.remove("btn-success");
      archiveBtn.classList.add("btn-warning");
    }
  }

  // Set up modal action buttons
  setupModalActionButtons(task._id);

  // Show the modal
  const modal = new bootstrap.Modal(
    document.getElementById("taskDetailsModal")
  );
  modal.show();
}

// Setup modal action buttons (matching priority.js approach)
function setupModalActionButtons(taskId) {
  // Edit button
  const editTaskBtn = document.getElementById("editTaskBtn");
  if (editTaskBtn) {
    editTaskBtn.onclick = function () {
      const taskDetailsModal = bootstrap.Modal.getInstance(document.getElementById("taskDetailsModal"));
      if (taskDetailsModal) taskDetailsModal.hide();
      setTimeout(() => editTask(taskId), 500);
    };
  }

  // Complete button
  const archiveTaskBtn = document.getElementById("archiveTaskBtn");
  if (archiveTaskBtn) {
    archiveTaskBtn.onclick = function () {
      archiveTask(taskId);
      const taskDetailsModal = bootstrap.Modal.getInstance(document.getElementById("taskDetailsModal"));
      if (taskDetailsModal) taskDetailsModal.hide();
    };
  }
}

// --- Handle Task Actions (simplified for new card structure) ---
// This function will primarily handle delete clicks and potentially checkbox clicks if they are not directly handled by createTaskCard
function handleTaskActions(e) {
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
      deleteTask(taskId); // Call the unified deleteTask function
    }
    return;
  }

  // Handle Mark as Complete checkbox click (if still needed, as archiveTask handles it)
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

    if (actionInProgress.has(taskId)) {
      e.target.checked = !isCompleted;
      return;
    }

    archiveTask(taskId); // Call the unified archiveTask function
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
    if (dueDateInput) dueDateInput.value = taskDueDate;
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
  const useSemantic = document.getElementById("semanticSearchCheckbox")?.checked || false;
  const useContains = document.getElementById("containsSearchCheckbox")?.checked || false;
  // Perform search based on selected options
  performTaskSearch(searchTerm, useSemantic, useContains);
}

// --- Enhanced Search Function (supports both semantic and contains search) ---
async function performTaskSearch( query, useSemantic = true, useContains = false ) {
  try {
    console.log( `Performing search for "${query}" - Semantic: ${useSemantic}, Contains: ${useContains}` );
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
    const descriptionMatch = task.description && task.description.toLowerCase().includes(query.toLowerCase());
    const tagsMatch = task.label && task.label.some((tag) => tag.toLowerCase().includes(query.toLowerCase()));
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
  const searchButton = document.querySelector( ".btn-primary-accent[type='button']" );
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
  const containsCheckbox = document.getElementById("containsCheckbox");
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
  toast.className = `alert alert-${ type === "success" ? "success" : "danger" } alert-dismissible fade show`;
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

// Functions related to file attachments and preview (placeholders as they are not fully in dashboard.js but exist in priority.js)
function showImagePreview(url, fileName) {
  // Implementation for image preview modal
  console.log("Showing image preview for:", fileName, url);
  // You would typically open a Bootstrap modal here and set the image src
  const modal = new bootstrap.Modal(document.getElementById('imagePreviewModal'));
  document.getElementById('previewImage').src = url;
  document.getElementById('imagePreviewModalLabel').textContent = fileName;
  document.getElementById('downloadImageBtn').href = url;
  document.getElementById('downloadImageBtn').download = fileName;
  modal.show();
}

function showMediaPreview(url, fileName, fileExtension) {
  // Implementation for media preview modal
  console.log("Showing media preview for:", fileName, url);
  // You would typically open a Bootstrap modal here and set the video/audio src
  const modal = new bootstrap.Modal(document.getElementById('mediaPreviewModal'));
  const mediaSource = document.getElementById('previewMediaSource');
  const previewMedia = document.getElementById('previewMedia');
  
  if (mediaSource && previewMedia) {
    mediaSource.src = url;
    mediaSource.type = `audio/${fileExtension}`; // or video/${fileExtension}
    previewMedia.load(); // Reload media element to pick up new source
  }
  document.getElementById('mediaPreviewModalLabel').textContent = fileName;
  document.getElementById('downloadMediaBtn').href = url;
  document.getElementById('downloadMediaBtn').download = fileName;
  modal.show();
}

function showDocumentPreview(url, fileName) {
  // Implementation for document preview modal
  console.log("Showing document preview for:", fileName, url);
  // You would typically open a Bootstrap modal here and set the iframe src
  const modal = new bootstrap.Modal(document.getElementById('documentPreviewModal'));
  document.getElementById('previewDocFrame').src = url;
  document.getElementById('documentPreviewModalLabel').textContent = fileName;
  document.getElementById('downloadDocBtn').href = url;
  document.getElementById('downloadDocBtn').download = fileName;
  modal.show();
}


// Placeholder functions for attachment handling in modals, to be consistent with priority.js if those features are used
let selectedFiles = [];
let editExistingAttachments = [];

function resetAttachments() {
    selectedFiles = [];
    editExistingAttachments = [];
    const container = document.getElementById("attachmentContainer");
    if (container) {
        container.innerHTML = '<p class="text-muted mb-0">No files selected.</p>';
    }
}

function setAttachmentDisplay(attachments, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = ""; // Clear existing display

    if (attachments.length === 0) {
        container.innerHTML = '<p class="text-muted mb-0">No files selected.</p>';
        return;
    }

    attachments.forEach((file) => {
        const fileName = typeof file === 'string' ? file.split("/").pop() : file.name;
        const div = document.createElement("div");
        div.className = "d-flex align-items-center mb-1";
        div.innerHTML = `<i class="bi bi-file-earmark me-2"></i><span>${fileName}</span>`;
        container.appendChild(div);
    });
}


// --- Initialize Dashboard ---
function initDashboard() {
  if (!checkAuth()) {
    return;
  }
  loadTasksFromAPI();

  // Event listener for global task actions
  document.getElementById("taskList").addEventListener("click", handleTaskActions);

  // Setup Add Task Form Submission
  const addTaskForm = document.getElementById("addTaskForm");
  if (addTaskForm) {
    addTaskForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const formData = new FormData(this);
      const taskId = window.currentEditTaskId; // Check if we are editing an existing task

      const tagsInput = formData.get("tags");
      const tagsArray = tagsInput
        ? tagsInput.split(",").map((tag) => tag.trim()).filter((tag) => tag.length > 0)
        : [];

      const taskData = {
        title: formData.get("title"),
        description: formData.get("description"),
        dueDate: formData.get("dueDate"),
        priority: formData.get("priority"),
        label: tagsArray,
      };

      // Handle file uploads
      const newFiles = selectedFiles;
      if (newFiles.length > 0) {
          const uploadPromises = newFiles.map(file => {
              const fileFormData = new FormData();
              fileFormData.append('file', file);
              return apiFetch('/upload', {
                  method: 'POST',
                  body: fileFormData,
                  headers: {
                      'Content-Type': undefined, // Let browser set Content-Type for FormData
                  },
              });
          });

          try {
              const uploadResults = await Promise.all(uploadPromises);
              const uploadedFilePaths = uploadResults.map(res => res.filePath);
              taskData.attachment = [...editExistingAttachments, ...uploadedFilePaths];
          } catch (uploadError) {
              console.error("File upload failed:", uploadError);
              displayErrorMessage("Failed to upload files. Task not saved.");
              return;
          }
      } else {
          taskData.attachment = editExistingAttachments;
      }

      try {
        if (taskId) {
          // Update existing task
          await updateTask(taskId, taskData);
          window.currentEditTaskId = null; // Clear edit state
        } else {
          // Add new task
          await addTask(taskData);
        }
        const modal = bootstrap.Modal.getInstance(addTaskForm.closest(".modal"));
        if (modal) modal.hide();
        addTaskForm.reset();
        resetAttachments(); // Clear attachments after submission
        displaySuccessMessage("Task saved successfully!");
      } catch (error) {
        console.error("Error saving task:", error);
        // Error message already handled by apiFetch or specific addTask/updateTask
      }
    });
  }

  // Handle file input changes for attachments
  const attachmentInput = document.getElementById("attachmentInput");
  if (attachmentInput) {
      attachmentInput.addEventListener("change", (event) => {
          selectedFiles = Array.from(event.target.files);
          setAttachmentDisplay(selectedFiles, "attachmentContainer");
      });
  }

  // Clear attachments button
  const clearAttachmentsBtn = document.getElementById("clearAttachmentsBtn");
  if (clearAttachmentsBtn) {
      clearAttachmentsBtn.addEventListener("click", resetAttachments);
  }

  // Handle modal hide event to reset form and title
  const addTaskModal = document.getElementById("addTaskModal");
  if (addTaskModal) {
    addTaskModal.addEventListener("hidden.bs.modal", function () {
      this.querySelector("form").reset();
      this.querySelector(".modal-title").textContent = "Add New Task";
      this.querySelector('button[type="submit"]').innerHTML =
        '<i class="bi bi-plus-circle me-2"></i>Add Task';
      window.currentEditTaskId = null; // Clear edit state
      editItem = null; // Clear edit item reference
      resetAttachments(); // Clear attachments when modal is hidden
    });
  }

  setupSearchFunctionality();

  // Populate existing tags dropdown on dashboard load
  populateExistingTagsDropdown();

  // Event listener for filtering by tags from the dropdown
  const filterDropdownMenu = document.getElementById("filterDropdownMenu");
  if (filterDropdownMenu) {
    filterDropdownMenu.addEventListener("click", function (e) {
      if (e.target.classList.contains("dropdown-item")) {
        const tag = e.target.dataset.tag;
        if (tag === "all") {
          clearAllFilters();
        } else {
          filterTasksByTag(tag);
        }
        const filterBtn = document.getElementById("filterDropdown");
        if (filterBtn) {
          filterBtn.innerHTML = `<i class="bi bi-funnel me-2"></i>${
            tag === "all" ? "Filter Tasks" : tag
          }`;
        }
      }
    });
  }
}

// --- Tag Management Functions ---
function getUniqueTags() {
  const allTags = allTasks.flatMap((task) => task.label || []);
  return [...new Set(allTags.map((tag) => tag.trim()))].sort();
}

function populateExistingTagsDropdown() {
  const dropdownMenu = document.getElementById("filterDropdownMenu");
  if (dropdownMenu) {
    dropdownMenu.innerHTML = `
      <li><a class="dropdown-item" href="#" data-tag="all">Show All</a></li>
      <li><hr class="dropdown-divider"></li>
    `;
    const uniqueTags = getUniqueTags();
    uniqueTags.forEach((tag) => {
      const li = document.createElement("li");
      li.innerHTML = `<a class="dropdown-item" href="#" data-tag="${tag}">${tag}</a>`;
      dropdownMenu.appendChild(li);
    });
  }

  // Populate the existing tags for the input suggestion
  const existingTagsDatalist = document.getElementById("existingTags");
  if (existingTagsDatalist) {
    existingTagsDatalist.innerHTML = "";
    getUniqueTags().forEach(tag => {
        const option = document.createElement("option");
        option.value = tag;
        existingTagsDatalist.appendChild(option);
    });
  }
}

function setTags(tagsArray) {
    const tagsInput = document.getElementById("addTaskForm")?.querySelector('input[name="tags"]');
    if (tagsInput) {
        tagsInput.value = tagsArray.join(", ");
    }
}

// --- Filter tasks by tag ---
function filterTasksByTag(tag) {
  const taskContainer = document.getElementById("taskList");
  let anyVisible = false;
  // Use allTasks for filtering
  const filteredTasks = allTasks.filter((task) =>
    (task.label || []).map((t) => t.trim()).includes(tag)
  );
  renderTasks(filteredTasks); // Re-render with filtered tasks

  if (filteredTasks.length === 0) {
    showEmptyState(`No tasks found with tag "${tag}"`);
  } else {
    hideEmptyState();
  }
}

// Clear all filters
function clearAllFilters() {
  loadTasksFromAPI();

  const filterBtn = document.getElementById("filterDropdown");
  if (filterBtn) {
    filterBtn.innerHTML = `<i class="bi bi-funnel me-2"></i>Filter Tasks`;
  }

  hideEmptyState();
}

// Show empty state
function showEmptyState(message) {
  let emptyState = document.getElementById("emptyState");
  if (!emptyState) {
    emptyState = document.createElement("div");
    emptyState.id = "emptyState";
    emptyState.className = "col-12 text-center py-5";
    document.getElementById("taskList").appendChild(emptyState);
  }
  emptyState.innerHTML = `
    <i class="bi bi-info-circle display-4 text-muted"></i>
    <h4 class="text-muted mt-3">${message}</h4>
  `;
}

// Hide empty state
function hideEmptyState() {
  const emptyState = document.getElementById("emptyState");
  if (emptyState) {
    emptyState.remove();
  }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", initDashboard);