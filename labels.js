// labels.js - Script for labels page with full backend integration

// --- API Configuration ---
const API_BASE_URL = "http://localhost:5000";

// --- Global Variables ---
let allTasks = []; // Store all tasks for filtering
let currentSelectedLabel = null; // Track currently selected label
let editItem = null; // Track task being edited
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

// --- Utility Functions ---
function displaySuccessMessage(message) {
  // Create or update success message element
  let alertDiv = document.querySelector(".alert-success");
  if (!alertDiv) {
    alertDiv = document.createElement("div");
    alertDiv.className =
      "alert alert-success alert-dismissible fade show position-fixed";
    alertDiv.style.cssText =
      "top: 80px; right: 20px; z-index: 9999; min-width: 300px;";
    document.body.appendChild(alertDiv);
  }

  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  // Auto-hide after 3 seconds
  setTimeout(() => {
    if (alertDiv) {
      alertDiv.remove();
    }
  }, 3000);
}

function displayErrorMessage(message) {
  // Create or update error message element
  let alertDiv = document.querySelector(".alert-danger");
  if (!alertDiv) {
    alertDiv = document.createElement("div");
    alertDiv.className =
      "alert alert-danger alert-dismissible fade show position-fixed";
    alertDiv.style.cssText =
      "top: 80px; right: 20px; z-index: 9999; min-width: 300px;";
    document.body.appendChild(alertDiv);
  }

  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (alertDiv) {
      alertDiv.remove();
    }
  }, 5000);
}

// --- Load All Tasks from API ---
async function loadAllTasks() {
  try {
    console.log("Loading all tasks from API...");
    allTasks = await apiFetch("/tasks");
    console.log("Loaded tasks:", allTasks);

    // Update label chips with task counts
    updateLabelChipCounts();

    // Update statistics
    updateStatistics();
  } catch (error) {
    console.error("Failed to load tasks:", error);
    allTasks = [];
  }
}

// --- Update Label Chip Counts ---
function updateLabelChipCounts() {
  console.log("Updating label chip counts...");

  // Get all unique labels from tasks
  const labelCounts = {};
  const allLabels = new Set();
  let unlabeledCount = 0;

  allTasks.forEach((task) => {
    if (task.label && Array.isArray(task.label) && task.label.length > 0) {
      task.label.forEach((label) => {
        const labelName = label.trim();
        if (labelName) {
          allLabels.add(labelName);
          labelCounts[labelName] = (labelCounts[labelName] || 0) + 1;
        }
      });
    } else {
      unlabeledCount++;
    }
  });

  // Clear existing label chips
  const labelsGrid = document.getElementById("labelsGrid");
  if (labelsGrid) {
    labelsGrid.innerHTML = "";

    // Add unlabeled tasks chip first (if there are unlabeled tasks)
    if (unlabeledCount > 0) {
      const unlabeledChip = createLabelChip("Unlabeled", unlabeledCount, true);
      labelsGrid.appendChild(unlabeledChip);
    }

    // Create label chips for each unique label
    Array.from(allLabels)
      .sort()
      .forEach((labelName) => {
        const count = labelCounts[labelName] || 0;
        const labelChip = createLabelChip(labelName, count, false);
        labelsGrid.appendChild(labelChip);
      });
  }

  console.log(`Created ${allLabels.size} label chips + unlabeled chip`);
}

// --- Create Label Chip Element ---
function createLabelChip(labelName, count, isUnlabeled = false) {
  const colDiv = document.createElement("div");
  colDiv.className = "col";

  const chipDiv = document.createElement("div");
  if (isUnlabeled) {
    chipDiv.className = "card label-chip label-unlabeled";
    chipDiv.dataset.label = "unlabeled";
  } else {
    chipDiv.className = `card label-chip label-${labelName.toLowerCase()}`;
    chipDiv.dataset.label = labelName;
  }

  // Count badge
  const countSpan = document.createElement("span");
  countSpan.className = "count";
  countSpan.textContent = count;

  // Icon (use a default icon or map specific ones)
  const iconElement = document.createElement("i");
  iconElement.className = `bi ${
    isUnlabeled ? "bi-question-circle" : getLabelIcon(labelName)
  }`;

  // Label name
  const nameSpan = document.createElement("span");
  nameSpan.textContent = isUnlabeled ? "Unlabeled" : labelName;

  chipDiv.appendChild(countSpan);
  chipDiv.appendChild(iconElement);
  chipDiv.appendChild(nameSpan);
  colDiv.appendChild(chipDiv);

  return colDiv;
}

// --- Get Icon for Label ---
function getLabelIcon(labelName) {
  const iconMap = {
    work: "bi-briefcase",
    personal: "bi-person",
    study: "bi-book",
    health: "bi-heart-pulse",
    finance: "bi-cash-coin",
    family: "bi-people",
    home: "bi-house",
    travel: "bi-airplane",
    urgent: "bi-exclamation-triangle",
    meeting: "bi-calendar-event",
    project: "bi-folder",
    shopping: "bi-cart",
    exercise: "bi-activity",
    learning: "bi-mortarboard",
  };

  const normalizedName = labelName.toLowerCase();
  return iconMap[normalizedName] || "bi-tag";
}

// --- Update Statistics Display ---
function updateStatistics() {
  // Get unique labels from all tasks
  const allLabels = new Set();
  let unlabeledCount = 0;

  allTasks.forEach((task) => {
    if (task.label && Array.isArray(task.label) && task.label.length > 0) {
      task.label.forEach((label) => {
        if (label.trim()) {
          allLabels.add(label.trim());
        }
      });
    } else {
      unlabeledCount++;
    }
  });

  // Update statistics cards
  const totalTasksElement = document.getElementById("totalTasksCount");
  const activeLabelsElement = document.getElementById("activeLabelsCount");
  const unlabeledTasksElement = document.getElementById("unlabeledTasksCount");

  if (totalTasksElement) {
    totalTasksElement.textContent = allTasks.length;
  }

  if (activeLabelsElement) {
    activeLabelsElement.textContent = allLabels.size;
  }

  if (unlabeledTasksElement) {
    unlabeledTasksElement.textContent = unlabeledCount;
  }

  console.log(
    `Statistics updated: ${allTasks.length} total tasks, ${allLabels.size} labels, ${unlabeledCount} unlabeled`
  );
}

// --- Create Task Card Element (matching priority page structure) ---
function createTaskCard(task) {
  // Create the column wrapper
  const colDiv = document.createElement("div");
  colDiv.className = "col";

  // Create card with Bootstrap classes matching priority page
  const cardDiv = document.createElement("div");
  cardDiv.className = "card h-100 shadow-sm rounded-4 task-card";
  cardDiv.dataset.taskId = task._id;
  cardDiv.style.cursor = "pointer";

  // Make the entire card clickable to show task details
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
    e.stopPropagation();
    editTask(task._id);
  };

  // Archive icon
  const archiveIcon = document.createElement("i");
  const isArchived =
    task.completed === true ||
    task.completed === "true" ||
    task.completed === 1;
  archiveIcon.className = isArchived
    ? "action-icon text-success bi bi-arrow-counterclockwise"
    : "action-icon text-warning bi bi-archive";
  archiveIcon.title = isArchived ? "Restore Task" : "Archive Task";
  archiveIcon.style.cursor = "pointer";
  archiveIcon.onclick = (e) => {
    e.stopPropagation();
    toggleArchiveTask(task._id, !isArchived);
  };

  // Delete icon
  const deleteIcon = document.createElement("i");
  deleteIcon.className = "action-icon text-danger bi bi-trash";
  deleteIcon.title = "Delete Task";
  deleteIcon.style.cursor = "pointer";
  deleteIcon.onclick = (e) => {
    e.stopPropagation();
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

  // Apply styling based on task status (matching priority page exactly)
  if (isArchived) {
    // Apply exact same styling as priority page
    cardDiv.classList.add("bg-light");
    titleH5.innerHTML = `<i class="bi bi-check-circle me-1 text-success"></i> ${
      task.title || "Untitled Task"
    }`;
    titleH5.classList.add("text-muted");

    // Add archived badge to header
    const archivedBadge = document.createElement("span");
    archivedBadge.className = "badge bg-warning ms-2";
    archivedBadge.textContent = "Archived";
    cardHeaderDiv.appendChild(archivedBadge);

    // Hide edit button
    editIcon.style.display = "none";
  }

  return colDiv;
}

// --- Filter and Display Tasks by Label ---
function filterTasksByLabel(labelName) {
  console.log(`Filtering tasks by label: ${labelName}`);

  let filteredTasks;

  if (labelName.toLowerCase() === "unlabeled") {
    // Filter tasks that have no labels or empty label array
    filteredTasks = allTasks.filter((task) => {
      return (
        !task.label || !Array.isArray(task.label) || task.label.length === 0
      );
    });
  } else {
    // Filter tasks by the selected label (case-insensitive)
    filteredTasks = allTasks.filter((task) => {
      if (!task.label || !Array.isArray(task.label)) return false;
      return task.label.some(
        (label) => label.toLowerCase() === labelName.toLowerCase()
      );
    });
  }

  console.log(`Found ${filteredTasks.length} tasks with label "${labelName}"`);

  // Get the task list container
  const labelTasksList = document.getElementById("labelTasksList");

  // Clear previous tasks
  labelTasksList.innerHTML = "";

  if (filteredTasks.length === 0) {
    // Show empty state
    const emptyMessage =
      labelName.toLowerCase() === "unlabeled"
        ? "No unlabeled tasks found"
        : `No tasks with the "${labelName}" label`;

    labelTasksList.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>
        <h4 class="mt-3 text-muted">${emptyMessage}</h4>
        <p class="text-muted">Add a task to see it here.</p>
      </div>
    `;
  } else {
    // Create and display task cards
    filteredTasks.forEach((task) => {
      const taskCard = createTaskCard(task);
      labelTasksList.appendChild(taskCard);
    });
  }

  // Update UI to show the filtered view
  const labelTasksSection = document.getElementById("labelTasksSection");
  const selectedLabelName = document.getElementById("selectedLabelName");

  if (labelTasksSection) {
    labelTasksSection.classList.remove("d-none");
  }

  if (selectedLabelName) {
    selectedLabelName.textContent =
      labelName.toLowerCase() === "unlabeled" ? "Unlabeled" : labelName;
  }
}

// --- Handle Label Chip Click ---
function handleLabelChipClick(labelName) {
  console.log(`Label chip clicked: ${labelName}`);

  // Remove active class from all chips
  document.querySelectorAll(".label-chip").forEach((chip) => {
    chip.classList.remove("active");
  });

  // Add active class to selected chip
  const selectedChip = document.querySelector(`[data-label="${labelName}"]`);
  if (selectedChip) {
    selectedChip.classList.add("active");
  }

  // Update current selection
  currentSelectedLabel = labelName;

  // Update UI elements
  const selectedLabelInfo = document.getElementById("selectedLabelInfo");
  const clearSelectionBtn = document.getElementById("clearSelectionBtn");

  if (selectedLabelInfo) {
    selectedLabelInfo.innerHTML = `<span class="text-primary-accent fw-bold">${labelName}</span> tasks`;
  }

  if (clearSelectionBtn) {
    clearSelectionBtn.classList.remove("d-none");
  }

  // Filter and display tasks
  filterTasksByLabel(labelName);
}

// --- Clear Selection ---
function clearSelection() {
  console.log("Clearing label selection");

  // Remove active class from all chips
  document.querySelectorAll(".label-chip").forEach((chip) => {
    chip.classList.remove("active");
  });

  // Reset current selection
  currentSelectedLabel = null;

  // Update UI elements
  const selectedLabelInfo = document.getElementById("selectedLabelInfo");
  const clearSelectionBtn = document.getElementById("clearSelectionBtn");
  const labelTasksSection = document.getElementById("labelTasksSection");

  if (selectedLabelInfo) {
    selectedLabelInfo.innerHTML = '<span class="text-muted">All labels</span>';
  }

  if (clearSelectionBtn) {
    clearSelectionBtn.classList.add("d-none");
  }

  if (labelTasksSection) {
    labelTasksSection.classList.add("d-none");
  }
}

// --- View Task Details (matching priority page structure) ---
function viewTaskDetails(task) {
  console.log("Showing task details modal for:", task.title);

  const isTaskArchived =
    task.completed === true ||
    task.completed === "true" ||
    task.completed === 1;

  // Set task title with archived styling (matching priority page exactly)
  const taskTitle = document.getElementById("taskDetailsTitle");
  if (isTaskArchived) {
    taskTitle.innerHTML = `<i class="bi bi-check-circle me-1 text-success"></i> ${task.title}`;
    taskTitle.classList.add("text-muted");
  } else {
    taskTitle.textContent = task.title;
    taskTitle.classList.remove("text-muted");
  }

  // Set priority badge (matching dashboard format exactly)
  const priorityBadge = document.getElementById("taskDetailsPriority");
  const priorityText =
    task.priority === "High"
      ? "High Priority"
      : task.priority === "Medium"
      ? "Medium Priority"
      : "Low Priority";
  priorityBadge.textContent = priorityText;
  priorityBadge.className =
    "badge priority-" + (task.priority || "low").toLowerCase();

  // Set description
  document.getElementById("taskDetailsDescription").textContent =
    task.description || "No description";

  // Set due date (matching dashboard structure)
  document
    .getElementById("taskDetailsDueDate")
    .querySelector("span").textContent = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString()
    : "No due date";

  // Set creation date (matching dashboard structure)
  document.getElementById("taskDetailsCreated").textContent = task.createdAt
    ? new Date(task.createdAt).toLocaleDateString()
    : "Unknown";

  // Set tags (matching dashboard format exactly)
  const tagsContainer = document.getElementById("taskDetailsTags");
  tagsContainer.innerHTML = "";
  if (task.label && Array.isArray(task.label) && task.label.length > 0) {
    task.label.forEach((tag) => {
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

  // Set attachments (matching dashboard format exactly)
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
        <a href="#" class="text-decoration-none">${attachment.trim()}</a>
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

  // Set archived status and button (matching priority page exactly)
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

// --- Setup Modal Action Buttons (matching dashboard approach) ---
function setupModalActionButtons(taskId) {
  // Edit button - show edit modal directly on labels page
  document.getElementById("editTaskBtn").onclick = function () {
    bootstrap.Modal.getInstance(
      document.getElementById("taskDetailsModal")
    ).hide();
    setTimeout(() => editTask(taskId), 500);
  };

  // Archive button
  document.getElementById("archiveTaskBtn").onclick = function () {
    const task = allTasks.find((t) => t._id === taskId);
    if (task) {
      const isCurrentlyArchived =
        task.completed === true ||
        task.completed === "true" ||
        task.completed === 1;
      toggleArchiveTask(taskId, !isCurrentlyArchived);
    }
    bootstrap.Modal.getInstance(
      document.getElementById("taskDetailsModal")
    ).hide();
  };
}

// --- Edit Task Function (show edit modal on labels page directly) ---
async function editTask(taskId) {
  // Find the task to edit
  const task = allTasks.find((t) => t._id === taskId);
  if (!task) {
    displayErrorMessage("Task not found");
    return;
  }

  // Show edit modal directly on this page instead of redirecting
  openEditModal(task);
}

// --- Open Edit Modal ---
function openEditModal(task) {
  console.log("Opening edit modal for task:", task.title);

  // Get the edit modal from HTML
  const modal = document.getElementById("editTaskModal");
  if (!modal) {
    displayErrorMessage("Edit modal not found");
    return;
  }

  // Populate form with task data
  const form = modal.querySelector("form");
  if (form) {
    form.querySelector("#editTaskTitle").value = task.title || "";
    form.querySelector("#editTaskDescription").value = task.description || "";
    form.querySelector("#editTaskDueDate").value = task.dueDate || "";
    form.querySelector("#editTaskPriority").value = task.priority || "Low";
    form.querySelector("#editTaskTags").value = task.label
      ? task.label.join(", ")
      : "";

    // Update current attachment display
    const currentAttachment = modal.querySelector("#currentAttachment");
    if (currentAttachment) {
      currentAttachment.textContent = task.attachment
        ? `Current: ${task.attachment}`
        : "Current: no attachment";
    }
  }

  // Store task ID for update
  modal.dataset.taskId = task._id;

  // Show the modal
  const bootstrapModal = new bootstrap.Modal(modal);
  bootstrapModal.show();
}

// --- Toggle Archive Task ---
async function toggleArchiveTask(taskId, newCompletedState) {
  if (actionInProgress.has(taskId)) return;
  actionInProgress.add(taskId);

  try {
    await apiFetch(`/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({
        completed: newCompletedState,
      }),
    });

    displaySuccessMessage(
      newCompletedState
        ? "Task archived successfully!"
        : "Task restored successfully!"
    );

    // Reload tasks and refresh display
    await loadAllTasks();
    if (currentSelectedLabel) {
      filterTasksByLabel(currentSelectedLabel);
    }
  } catch (error) {
    console.error("Failed to update task status:", error);
  } finally {
    actionInProgress.delete(taskId);
  }
}

// --- Delete Task ---
async function deleteTask(taskId) {
  if (!confirm("Are you sure you want to delete this task?")) {
    return;
  }

  if (actionInProgress.has(taskId)) return;
  actionInProgress.add(taskId);

  try {
    await apiFetch(`/tasks/${taskId}`, {
      method: "DELETE",
    });

    displaySuccessMessage("Task deleted successfully!");

    // Reload tasks and refresh display
    await loadAllTasks();
    if (currentSelectedLabel) {
      filterTasksByLabel(currentSelectedLabel);
    }
  } catch (error) {
    console.error("Failed to delete task:", error);
  } finally {
    actionInProgress.delete(taskId);
  }
}

// --- Initialize Page ---
document.addEventListener("DOMContentLoaded", async function () {
  console.log("Labels page loaded, initializing...");

  // Check authentication
  if (!checkAuth()) {
    return;
  }

  // Load all tasks from backend
  await loadAllTasks();

  // Set up event listeners for label chips using event delegation
  const labelsGrid = document.getElementById("labelsGrid");
  if (labelsGrid) {
    labelsGrid.addEventListener("click", function (e) {
      const labelChip = e.target.closest(".label-chip[data-label]");
      if (labelChip) {
        const labelName = labelChip.dataset.label;
        handleLabelChipClick(labelName);
      }
    });
  }

  // Set up clear selection button
  const clearSelectionBtn = document.getElementById("clearSelectionBtn");
  if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener("click", clearSelection);
  }

  // Set up edit task update button
  const updateTaskBtn = document.getElementById("updateTaskBtn");
  if (updateTaskBtn) {
    updateTaskBtn.addEventListener("click", async function () {
      const modal = document.getElementById("editTaskModal");
      const taskId = modal.dataset.taskId;

      if (!taskId) {
        displayErrorMessage("Task ID not found");
        return;
      }

      // Get form data from fields directly
      const title = document.getElementById("editTaskTitle").value;
      const description = document.getElementById("editTaskDescription").value;
      const dueDate = document.getElementById("editTaskDueDate").value;
      const priority = document.getElementById("editTaskPriority").value;
      const tagsValue = document.getElementById("editTaskTags").value;
      const labels = tagsValue
        ? tagsValue
            .split(",")
            .map((l) => l.trim())
            .filter((l) => l)
        : [];

      const updateData = {
        title: title,
        description: description,
        dueDate: dueDate,
        priority: priority,
        label: labels,
      };

      try {
        // Update task via API
        await apiFetch(`/tasks/${taskId}`, {
          method: "PATCH",
          body: JSON.stringify(updateData),
        });

        displaySuccessMessage("Task updated successfully!");

        // Hide modal
        bootstrap.Modal.getInstance(modal).hide();

        // Reload tasks and refresh display
        await loadAllTasks();
        if (currentSelectedLabel) {
          filterTasksByLabel(currentSelectedLabel);
        }
      } catch (error) {
        console.error("Failed to update task:", error);
        displayErrorMessage("Failed to update task. Please try again.");
      }
    });
  }

  console.log("Labels page initialization complete");
});
