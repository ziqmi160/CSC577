// archived.js - Script for archived tasks page with restore and delete functionality

// --- API Configuration ---
const API_BASE_URL = "http://localhost:5000";

// --- Global Variables ---
let editItem = null;
let actionInProgress = new Set(); // Track actions in progress to prevent conflicts
let allArchivedTasks = []; // Store all archived tasks for filtering
let currentSearchQuery = null; // Track current search query for semantic search
let currentSortOption = "date-newest"; // Track current sort option

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

// --- Load Archived Tasks from API ---
async function loadArchivedTasks() {
  try {
    console.log("Loading archived tasks...");
    const taskContainer = document.getElementById("archivedTaskList");
    console.log("Task container found:", taskContainer);

    // Clear current tasks from the DOM
    while (taskContainer.firstChild) {
      taskContainer.removeChild(taskContainer.firstChild);
    }

    // Fetch all tasks from API
    const allTasks = await apiFetch("/tasks");
    console.log("All tasks fetched:", allTasks);
    console.log("Total tasks count:", allTasks ? allTasks.length : 0);

    // Filter only archived tasks (using completed field as archived)
    const archivedTasks = allTasks.filter((task) => {
      console.log(
        `Task ${task._id}: completed=${
          task.completed
        }, type=${typeof task.completed}`
      );
      return (
        task.completed === true ||
        task.completed === "true" ||
        task.completed === 1
      );
    });
    console.log("Filtered archived tasks:", archivedTasks);
    console.log("Archived tasks count:", archivedTasks.length);

    // Store archived tasks globally for search functionality
    allArchivedTasks = archivedTasks || [];

    // Reset search state when loading all tasks
    currentSearchQuery = null;
    updateSearchStatus(false);

    if (archivedTasks && archivedTasks.length > 0) {
      // Sort by archived date (newest first) - using updatedAt as proxy for archived date
      archivedTasks.sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      );

      // Render each archived task
      archivedTasks.forEach((task) => {
        const taskCard = createArchivedTaskCard(task);
        taskContainer.appendChild(taskCard);
      });

      // Hide empty state
      const emptyState = document.getElementById("noArchivedTasks");
      if (emptyState) {
        emptyState.classList.add("d-none");
      }
    } else {
      // Display empty state for no archived tasks
      showEmptyState();
    }

    // Update task counter if it exists
    updateArchivedTaskCounter(archivedTasks ? archivedTasks.length : 0);
  } catch (error) {
    console.error("Failed to load archived tasks:", error);
    // Error message already handled in apiFetch
  }
}

// --- Create Archived Task Card Element (same structure as dashboard) ---
function createArchivedTaskCard(task) {
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
  cardDiv.dataset.archived = task.completed.toString(); // Use completed as archived
  cardDiv.dataset.completed = task.completed.toString();

  // Create card body
  const cardBodyDiv = document.createElement("div");
  cardBodyDiv.className = "card-body";

  // Create card header with title and priority
  const cardHeaderDiv = document.createElement("div");
  cardHeaderDiv.className =
    "d-flex justify-content-between align-items-center mb-2";

  // Task title (no special styling for archived)
  const titleH5 = document.createElement("h5");
  titleH5.className = "card-title mb-0";
  titleH5.textContent = task.title;

  // Priority badge
  const priorityBadge = document.createElement("span");
  priorityBadge.className = `badge priority-${task.priority.toLowerCase()}`;
  priorityBadge.textContent = task.priority;

  cardHeaderDiv.appendChild(titleH5);
  cardHeaderDiv.appendChild(priorityBadge);

  // Description
  const descriptionP = document.createElement("p");
  descriptionP.className = "card-text text-muted";
  descriptionP.textContent = task.description || "No description";

  // Tags
  const tagsDiv = document.createElement("div");
  tagsDiv.className = "d-flex flex-wrap gap-2 mb-3";
  if (task.label && task.label.length > 0) {
    task.label.forEach((label) => {
      const tagSpan = document.createElement("span");
      tagSpan.className = "badge bg-secondary";
      tagSpan.textContent = label;
      tagsDiv.appendChild(tagSpan);
    });
  }

  // Footer with completed date and actions
  const footerDiv = document.createElement("div");
  footerDiv.className = "d-flex justify-content-between align-items-center";

  // Completed date info
  const completedInfo = document.createElement("div");
  completedInfo.className = "d-flex flex-column";

  const completedDate = document.createElement("small");
  completedDate.className = "text-muted";
  completedDate.innerHTML = `<i class="bi bi-check-circle-fill me-1 text-success"></i>Completed: ${new Date(
    task.updatedAt || task.createdAt
  ).toLocaleDateString()}`;

  const originalDueDate = document.createElement("small");
  originalDueDate.className = "text-muted";
  originalDueDate.innerHTML = `<i class="bi bi-calendar-event me-1"></i>Due: ${
    task.dueDate || "No due date"
  }`;

  completedInfo.appendChild(completedDate);
  completedInfo.appendChild(originalDueDate);

  // Action icons
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "d-flex gap-2";

  // View Details icon
  const viewIcon = document.createElement("i");
  viewIcon.className = "action-icon text-info bi bi-eye";
  viewIcon.title = "View Details";
  viewIcon.style.cursor = "pointer";

  // Restore icon
  const restoreIcon = document.createElement("i");
  restoreIcon.className =
    "action-icon text-success bi bi-arrow-counterclockwise";
  restoreIcon.title = "Restore Task";
  restoreIcon.style.cursor = "pointer";

  // Delete permanently icon
  const deleteIcon = document.createElement("i");
  deleteIcon.className = "action-icon text-danger bi bi-trash";
  deleteIcon.title = "Delete Task";
  deleteIcon.style.cursor = "pointer";

  actionsDiv.appendChild(viewIcon);
  actionsDiv.appendChild(restoreIcon);
  actionsDiv.appendChild(deleteIcon);

  footerDiv.appendChild(completedInfo);
  footerDiv.appendChild(actionsDiv);

  // Assemble card
  cardBodyDiv.appendChild(cardHeaderDiv);
  cardBodyDiv.appendChild(descriptionP);
  cardBodyDiv.appendChild(tagsDiv);
  // Add attachments icon and count below tags and before footer
  let attachmentCount = 0;
  if (Array.isArray(task.attachment)) {
    attachmentCount = task.attachment.length;
  } else if (typeof task.attachment === 'string' && task.attachment.trim() !== '') {
    attachmentCount = task.attachment.split(',').filter(att => att.trim()).length;
  }
  if (attachmentCount > 0) {
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
    countBadge.textContent = `x${attachmentCount}`;
    attachmentsDiv.appendChild(countBadge);
    cardBodyDiv.appendChild(attachmentsDiv);
  }
  cardBodyDiv.appendChild(footerDiv);
  cardDiv.appendChild(cardBodyDiv);
  colDiv.appendChild(cardDiv);
  return colDiv;
}

// --- Handle Task Actions for Archived Tasks ---
async function handleArchivedTaskActions(e) {
  // Handle View Details (card click or eye icon)
  if (
    e.target.classList.contains("bi-eye") ||
    (e.target.closest(".task-card") &&
      !e.target.closest(".action-icon") &&
      !e.target.closest("button") &&
      !e.target.closest(".badge"))
  ) {
    e.preventDefault();
    e.stopPropagation();
    const card = e.target.closest(".task-card");
    openTaskDetailsModal(card);
    return;
  }

  // Handle Restore Task
  if (e.target.classList.contains("bi-arrow-counterclockwise")) {
    e.preventDefault();
    e.stopPropagation();
    const card = e.target.closest(".task-card");
    const taskId = card.dataset.taskId;

    if (actionInProgress.has(taskId)) {
      return; // Prevent duplicate actions
    }

    actionInProgress.add(taskId);

    try {
      // Update task to set completed to false (restore from archived)
      await apiFetch(`/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({
          completed: false,
        }),
      });

      // Show success message
      displaySuccessMessage("Task restored successfully!");

      // Reload archived tasks to update the display
      await loadArchivedTasks();
    } catch (error) {
      console.error("Failed to restore task:", error);
      displayErrorMessage("Failed to restore task. Please try again.");
    } finally {
      actionInProgress.delete(taskId);
    }
    return;
  }

  // Handle Delete Task Permanently
  if (e.target.classList.contains("bi-trash")) {
    e.preventDefault();
    e.stopPropagation();
    const card = e.target.closest(".task-card");
    const taskId = card.dataset.taskId;
    const taskTitle = card.dataset.title;

    if (actionInProgress.has(taskId)) {
      return; // Prevent duplicate actions
    }

    // Confirm deletion
    if (
      !confirm(
        `Are you sure you want to permanently delete "${taskTitle}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    actionInProgress.add(taskId);

    try {
      // Delete task permanently
      await apiFetch(`/tasks/${taskId}`, {
        method: "DELETE",
      });

      // Show success message
      displaySuccessMessage("Task deleted permanently!");

      // Reload archived tasks to update the display
      await loadArchivedTasks();
    } catch (error) {
      console.error("Failed to delete task:", error);
      displayErrorMessage("Failed to delete task. Please try again.");
    } finally {
      actionInProgress.delete(taskId);
    }
    return;
  }
}

// --- Task Details Modal Functions (reused from dashboard) ---
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

  // Set the task ID on the modal for restore functionality
  const modalElement = document.getElementById("taskDetailsModal");
  if (modalElement) {
    modalElement.setAttribute("data-task-id", taskData.taskId);
  }

  // Show the modal
  const taskDetailsModal = new bootstrap.Modal(
    document.getElementById("taskDetailsModal")
  );
  taskDetailsModal.show();
}

function populateTaskDetailsModal(taskData) {
  const isTaskArchived =
    taskData.completed === "true" || taskData.completed === true;

  // Set task title with archived indication
  const taskTitle = document.getElementById("taskDetailsTitle");
  if (isTaskArchived) {
    taskTitle.innerHTML = `<i class="bi bi-check-circle me-1 text-success"></i> ${taskData.title}`;
  } else {
    taskTitle.textContent = taskData.title;
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
      const fileExtension = attachment.split(".").pop()?.toLowerCase();
      const fileName = attachment.trim().split("/").pop();
      const fullUrl = attachment.trim().startsWith("/uploads/") ? `${API_BASE_URL}${attachment.trim()}` : attachment.trim();
      const viewableExtensions = [
        "pdf", "txt", "html", "htm", "css", "js", "json", "xml", "csv", "md",
        "jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "ico",
        "mp3", "wav", "ogg", "mp4", "webm", "py", "java", "cpp", "c", "php", "rb", "go", "rs", "swift", "kt", "yaml", "yml", "toml", "ini", "conf", "log", "woff", "woff2", "ttf", "eot"
      ];
      const canView = viewableExtensions.includes(fileExtension);
      const attachmentItem = document.createElement("div");
      attachmentItem.className = "d-flex align-items-center mb-2";
      attachmentItem.innerHTML = `
        <i class="bi bi-paperclip me-2"></i>
        <span class="attachment-filename me-2">${fileName}</span>
      `;
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
    attachmentsContainer.innerHTML =
      '<span class="text-muted fst-italic">No attachments</span>';
  }

  // Show archived badge
  const archivedBadge = document.getElementById("taskDetailsArchived");
  if (archivedBadge) {
    if (isTaskArchived) {
      archivedBadge.classList.remove("d-none");
    } else {
      archivedBadge.classList.add("d-none");
    }
  }

  // Update modal footer buttons for archived tasks
  updateModalButtons(taskData.taskId, isTaskArchived);
}

function updateModalButtons(taskId, isArchived) {
  const editBtn = document.getElementById("editTaskBtn");
  const archiveBtn = document.getElementById("archiveTaskBtn");

  if (isArchived) {
    // For archived tasks, change the archive button to restore
    if (archiveBtn) {
      archiveBtn.innerHTML =
        '<i class="bi bi-arrow-counterclockwise me-1"></i> Restore';
      archiveBtn.className = "btn btn-success";
      archiveBtn.onclick = () => restoreTaskFromModal(taskId);
    }

    // Disable edit for archived tasks
    if (editBtn) {
      editBtn.disabled = true;
      editBtn.classList.add("disabled");
    }
  } else {
    // For active tasks, keep normal functionality
    if (archiveBtn) {
      archiveBtn.innerHTML = '<i class="bi bi-archive me-1"></i> Archive';
      archiveBtn.className = "btn btn-warning";
    }

    if (editBtn) {
      editBtn.disabled = false;
      editBtn.classList.remove("disabled");
    }
  }
}

async function restoreTaskFromModal(taskId) {
  if (actionInProgress.has(taskId)) {
    return;
  }

  actionInProgress.add(taskId);

  try {
    await apiFetch(`/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({
        completed: false,
      }),
    });

    displaySuccessMessage("Task restored successfully!");

    // Close modal
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("taskDetailsModal")
    );
    if (modal) {
      modal.hide();
    }

    // Reload archived tasks
    await loadArchivedTasks();
  } catch (error) {
    console.error("Failed to restore task:", error);
    displayErrorMessage("Failed to restore task. Please try again.");
  } finally {
    actionInProgress.delete(taskId);
  }
}

// --- Show Empty State ---
function showEmptyState() {
  const taskContainer = document.getElementById("archivedTaskList");
  const emptyState = document.getElementById("noArchivedTasks");

  if (emptyState) {
    emptyState.classList.remove("d-none");
  } else {
    // Create empty state if it doesn't exist
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "col-12";
    emptyDiv.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-archive text-muted" style="font-size: 4rem"></i>
        <h3 class="mt-3 text-muted">No Archived Tasks</h3>
        <p class="text-muted">When you complete tasks, they will appear here.</p>
        <a href="dashboard.html" class="btn btn-primary-accent mt-3">
          <i class="bi bi-arrow-left me-2"></i>Back to My Tasks
        </a>
      </div>
    `;
    taskContainer.appendChild(emptyDiv);
  }
}

// --- Update Task Counter ---
function updateArchivedTaskCounter(count) {
  // Update any counter elements if they exist
  const counterElements = document.querySelectorAll(".task-count, .badge");
  counterElements.forEach((element) => {
    if (element.textContent.includes("Tasks")) {
      element.textContent = `${count} Tasks`;
    }
  });
}

// --- Utility Functions for Messages ---
function displaySuccessMessage(message) {
  const alertDiv = document.createElement("div");
  alertDiv.className =
    "alert alert-success alert-dismissible fade show position-fixed";
  alertDiv.style.top = "20px";
  alertDiv.style.right = "20px";
  alertDiv.style.zIndex = "9999";
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(alertDiv);

  setTimeout(() => {
    if (alertDiv && alertDiv.parentNode) {
      alertDiv.parentNode.removeChild(alertDiv);
    }
  }, 3000);
}

function displayErrorMessage(message) {
  const alertDiv = document.createElement("div");
  alertDiv.className =
    "alert alert-danger alert-dismissible fade show position-fixed";
  alertDiv.style.top = "20px";
  alertDiv.style.right = "20px";
  alertDiv.style.zIndex = "9999";
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(alertDiv);

  setTimeout(() => {
    if (alertDiv && alertDiv.parentNode) {
      alertDiv.parentNode.removeChild(alertDiv);
    }
  }, 5000);
}

// --- Search Functionality ---
function setupSearchFunctionality() {
  const searchInput = document.querySelector(".search-bar");
  const searchButton = document.querySelector(
    ".btn-primary-accent[type='button']"
  );

  if (!searchInput) return;

  // Handle Enter key press for search
  searchInput.addEventListener("keypress", handleSearchInput);

  if (searchButton) {
    // Handle search button click
    searchButton.addEventListener("click", handleSearchInput);
  }

  // Set up event listeners for search checkboxes
  const semanticCheckbox = document.getElementById("semanticSearchCheckbox");
  const containsCheckbox = document.getElementById("containsSearchCheckbox");

  if (semanticCheckbox) {
    semanticCheckbox.addEventListener("change", function () {
      if (currentSearchQuery) {
        const useSemantic = this.checked;
        const useContains = containsCheckbox?.checked || false;
        performArchivedTasksSearch(
          currentSearchQuery,
          useSemantic,
          useContains
        );
      }
    });
  }

  if (containsCheckbox) {
    containsCheckbox.addEventListener("change", function () {
      if (currentSearchQuery) {
        const useSemantic = semanticCheckbox?.checked || false;
        const useContains = this.checked;
        performArchivedTasksSearch(
          currentSearchQuery,
          useSemantic,
          useContains
        );
      }
    });
  }

  // Setup clear search button
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", clearSearch);
  }
}

// --- Handle Search Bar Input ---
function handleSearchInput(event) {
  // Check if Enter key was pressed or search button clicked
  if (event.key === "Enter" || event.type === "click") {
    const query =
      event.target.type === "text"
        ? event.target.value.trim()
        : event.target
            .closest(".input-group")
            .querySelector("input")
            .value.trim();

    if (query.length === 0) {
      // Empty query - return to normal view
      currentSearchQuery = null;
      updateSearchStatus(false);
      loadArchivedTasks();
      return;
    }

    if (query.length < 2) {
      displayErrorMessage("Please enter at least 2 characters for search");
      return;
    }

    // Get search type preferences
    const useSemantic =
      document.getElementById("semanticSearchCheckbox")?.checked || false;
    const useContains =
      document.getElementById("containsSearchCheckbox")?.checked || false;

    // Perform search based on selected options
    performArchivedTasksSearch(query, useSemantic, useContains);
  }
}

// --- Enhanced Search Function (supports both semantic and contains search) ---
async function performArchivedTasksSearch(
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
    console.log(`Search returned ${searchResults.length} total results`);

    // Filter for archived tasks only
    const archivedSearchResults = searchResults.filter((task) => {
      return (
        task.completed === true ||
        task.completed === "true" ||
        task.completed === 1
      );
    });

    console.log(
      `Filtered to ${archivedSearchResults.length} archived search results`
    );

    // Store the current search query for UI state
    currentSearchQuery = query;
    updateSearchStatus(true, query);

    // Render search results
    renderArchivedTasks(archivedSearchResults);
  } catch (error) {
    console.error("Search failed:", error);
    displayErrorMessage("Search failed. Please try again.");

    // Fall back to regular search
    filterArchivedTasksBySearch(query);
  }
}

// --- Fallback Regular Search Function ---
function filterArchivedTasksBySearch(query) {
  if (!query) {
    loadArchivedTasks(); // Reset to show all tasks
    return;
  }

  // Filter archived tasks that match the search query
  const filteredTasks = allArchivedTasks.filter((task) => {
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
  renderArchivedTasks(filteredTasks);
}

// --- Render Archived Tasks (unified function for both normal loading and search results) ---
function renderArchivedTasks(tasks) {
  const taskContainer = document.getElementById("archivedTaskList");

  // Clear existing tasks
  taskContainer.innerHTML = "";

  if (tasks.length === 0) {
    // Show empty state for no results
    showEmptySearchState();
  } else {
    // Sort tasks based on current sort option
    const sortedTasks = sortTasks([...tasks], currentSortOption);

    // Render each archived task
    sortedTasks.forEach((task) => {
      const taskCard = createArchivedTaskCard(task);
      taskContainer.appendChild(taskCard);
    });

    // Hide empty state
    const emptyState = document.getElementById("noArchivedTasks");
    if (emptyState) {
      emptyState.classList.add("d-none");
    }
  }

  // Update task counter
  updateArchivedTaskCounter(tasks.length);
}

// --- Sorting Functions ---
function sortTasks(tasks, sortOption) {
  switch (sortOption) {
    case "date-newest":
      return tasks.sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      );
    case "date-oldest":
      return tasks.sort(
        (a, b) => new Date(a.updatedAt) - new Date(b.updatedAt)
      );
    case "title-asc":
      return tasks.sort((a, b) => a.title.localeCompare(b.title));
    case "title-desc":
      return tasks.sort((a, b) => b.title.localeCompare(a.title));
    case "priority-high":
      return tasks.sort((a, b) => {
        const priorityOrder = { High: 3, Medium: 2, Low: 1 };
        return (
          (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
        );
      });
    case "priority-low":
      return tasks.sort((a, b) => {
        const priorityOrder = { High: 3, Medium: 2, Low: 1 };
        return (
          (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0)
        );
      });
    default:
      return tasks.sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      );
  }
}

function handleSortChange(sortOption) {
  currentSortOption = sortOption;

  // Update sort button text to show current selection
  updateSortButtonText(sortOption);

  // Re-render tasks with new sort order
  if (currentSearchQuery) {
    // If we're in search mode, re-render search results
    const useSemantic =
      document.getElementById("semanticSearchCheckbox")?.checked || false;
    const useContains =
      document.getElementById("containsSearchCheckbox")?.checked || false;
    performArchivedTasksSearch(currentSearchQuery, useSemantic, useContains);
  } else {
    // Re-render all archived tasks with new sort order
    renderArchivedTasks(allArchivedTasks);
  }

  // Show success message
  displaySuccessMessage(
    `Tasks sorted by ${getSortOptionDisplayName(sortOption)}`
  );
}

function updateSortButtonText(sortOption) {
  const sortButton = document.getElementById("sortDropdown");
  if (sortButton) {
    const displayName = getSortOptionDisplayName(sortOption);
    sortButton.innerHTML = `<i class="bi bi-sort-down me-2"></i>${displayName}`;
  }
}

function getSortOptionDisplayName(sortOption) {
  const displayNames = {
    "date-newest": "Date Archived (Newest First)",
    "date-oldest": "Date Archived (Oldest First)",
    "title-asc": "Title (A-Z)",
    "title-desc": "Title (Z-A)",
    "priority-high": "Priority (High to Low)",
    "priority-low": "Priority (Low to High)",
  };
  return displayNames[sortOption] || "Date Archived (Newest First)";
}

function setupSortFunctionality() {
  // Get all sort dropdown items
  const sortItems = document.querySelectorAll(
    "#sortDropdown + .dropdown-menu .dropdown-item[data-sort]"
  );

  sortItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      e.preventDefault();

      // Get sort option from data attribute
      const sortOption = this.dataset.sort || "date-newest";

      // Remove active class from all items and add to current
      sortItems.forEach((i) => i.classList.remove("active"));
      this.classList.add("active");

      handleSortChange(sortOption);
    });
  });

  // Set initial active state for default sort option
  const defaultSortItem = document.querySelector(
    `[data-sort="${currentSortOption}"]`
  );
  if (defaultSortItem) {
    defaultSortItem.classList.add("active");
  }
}

// --- Show Empty Search State ---
function showEmptySearchState() {
  const taskContainer = document.getElementById("archivedTaskList");
  const emptyDiv = document.createElement("div");
  emptyDiv.className = "col-12";
  emptyDiv.innerHTML = `
    <div class="text-center py-5">
      <i class="bi bi-search text-muted" style="font-size: 4rem"></i>
      <h3 class="mt-3 text-muted">No Results Found</h3>
      <p class="text-muted">No archived tasks match your search query.</p>
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
  loadArchivedTasks();

  displaySuccessMessage("Search cleared!");
}

// --- Initialize Page ---
document.addEventListener("DOMContentLoaded", function () {
  // Check authentication first
  if (!checkAuth()) {
    return;
  }

  // Load archived tasks
  loadArchivedTasks();

  // Setup event delegation for task actions
  const taskContainer = document.getElementById("archivedTaskList");
  if (taskContainer) {
    taskContainer.addEventListener("click", handleArchivedTaskActions);
  }

  // Setup logout handler
  const logoutBtn = document.querySelector('.dropdown-item[href="#"]');
  if (logoutBtn && logoutBtn.textContent.includes("Logout")) {
    logoutBtn.addEventListener("click", function (e) {
      e.preventDefault();
      handleLogout();
    });
  }

  // Setup search functionality
  setupSearchFunctionality();

  // Setup sort functionality
  setupSortFunctionality();

  const restoreBtn = document.getElementById("restoreTaskBtn");
  if (restoreBtn) {
    restoreBtn.addEventListener("click", function () {
      const modal = document.getElementById("taskDetailsModal");
      if (modal) {
        const taskId = modal.getAttribute("data-task-id");
        if (taskId) {
          restoreTaskFromModal(taskId);
        }
      }
    });
  }

  setupLogoutHandler();
});

// Add these functions at the end of the file to support attachment preview
function showImagePreview(imageUrl, fileName) {
  let previewModal = document.getElementById("imagePreviewModal");
  if (!previewModal) {
    previewModal = document.createElement("div");
    previewModal.className = "modal fade";
    previewModal.id = "imagePreviewModal";
    previewModal.tabIndex = -1;
    previewModal.setAttribute("aria-labelledby", "imagePreviewModalLabel");
    previewModal.setAttribute("aria-hidden", "true");
    previewModal.innerHTML = `
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="imagePreviewModalLabel">Image Preview</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body text-center">
            <img id="previewImage" src="" alt="Preview" class="img-fluid" style="max-height: 70vh;">
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <a id="downloadImageBtn" href="" download class="btn btn-primary">
              <i class="bi bi-download me-1"></i>Download
            </a>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(previewModal);
  }
  const previewImage = previewModal.querySelector("#previewImage");
  const downloadImageBtn = previewModal.querySelector("#downloadImageBtn");
  if (previewImage && downloadImageBtn) {
    previewImage.src = imageUrl;
    downloadImageBtn.href = imageUrl;
    downloadImageBtn.download = fileName;
  }
  const modal = new bootstrap.Modal(previewModal);
  modal.show();
}

function showMediaPreview(mediaUrl, fileName, fileExtension) {
  let mediaModal = document.getElementById("mediaPreviewModal");
  if (!mediaModal) {
    mediaModal = document.createElement("div");
    mediaModal.className = "modal fade";
    mediaModal.id = "mediaPreviewModal";
    mediaModal.tabIndex = -1;
    mediaModal.setAttribute("aria-labelledby", "mediaPreviewModalLabel");
    mediaModal.setAttribute("aria-hidden", "true");
    mediaModal.innerHTML = `
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="mediaPreviewModalLabel">Media Preview</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body text-center" id="mediaPreviewBody"></div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <a id="downloadMediaBtn" href="" download class="btn btn-primary">
              <i class="bi bi-download me-1"></i>Download
            </a>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(mediaModal);
  }
  const mediaPreviewBody = mediaModal.querySelector("#mediaPreviewBody");
  const downloadMediaBtn = mediaModal.querySelector("#downloadMediaBtn");
  if (mediaPreviewBody && downloadMediaBtn) {
    if (["mp4", "webm"].includes(fileExtension)) {
      mediaPreviewBody.innerHTML = `<video src="${mediaUrl}" controls style="max-width: 100%; max-height: 60vh;"></video>`;
    } else if (["mp3", "wav", "ogg"].includes(fileExtension)) {
      mediaPreviewBody.innerHTML = `<audio src="${mediaUrl}" controls style="width: 100%"></audio>`;
    } else {
      mediaPreviewBody.innerHTML = `<p>Cannot preview this file type.</p>`;
    }
    downloadMediaBtn.href = mediaUrl;
    downloadMediaBtn.download = fileName;
  }
  const modal = new bootstrap.Modal(mediaModal);
  modal.show();
}

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

function setupLogoutHandler() {
  // Look for logout buttons or links
  const logoutElements = document.querySelectorAll('[data-action="logout"], .logout-btn, .bi-box-arrow-right');
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
