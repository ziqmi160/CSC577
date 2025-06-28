// archived.js - Script for archived tasks page with restore and delete functionality

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
      const attachmentItem = document.createElement("div");
      attachmentItem.className = "d-flex align-items-center mb-2";
      attachmentItem.innerHTML = `
        <i class="bi bi-paperclip me-2"></i>
        <a href="#" class="text-primary">${attachment.trim()}</a>
      `;
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
});
