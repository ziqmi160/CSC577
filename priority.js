// priority.js - Script for priority tasks page with backend integration

// --- API Configuration ---
const API_BASE_URL = "http://localhost:5000";

// --- Global Variables ---
let allTasks = []; // Store all tasks fetched from backend
let currentPriorityFilter = "all"; // Track current priority filter
let currentSearchQuery = null; // Track current search query for semantic search
let selectedFiles = []; // Store selected files for upload
let editExistingAttachments = []; // Store existing attachments when editing
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

    // Update existing tags dropdown whenever tasks are loaded
    populateExistingTagsDropdown();

    // Reset search state when fetching all tasks
    currentSearchQuery = null;
    updateSearchStatus(false);

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
  const filteredTasks =
    priority === "all"
      ? allTasks
      : allTasks.filter(
          (task) =>
            task.priority &&
            task.priority.toLowerCase() === priority.toLowerCase()
        );

  // Render the filtered tasks
  renderTasks(filteredTasks);
}

// --- Helper function to check if task is archived ---
function isTaskCompleted(task) {
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

  // Create card header with title and badges
  const cardHeaderDiv = document.createElement("div");
  cardHeaderDiv.className = "d-flex justify-content-between align-items-center mb-2";

  // Task title
  const titleH5 = document.createElement("h5");
  titleH5.className = "card-title mb-0";
  titleH5.textContent = task.title || "Untitled Task";

  // Badges container
  const badgesDiv = document.createElement("div");
  badgesDiv.className = "d-flex flex-row align-items-center gap-2";

  // Priority badge
  const priorityBadge = document.createElement("span");
  const priorityClass = `priority-${(task.priority || "low").toLowerCase()}`;
  priorityBadge.className = `badge ${priorityClass}`;
  priorityBadge.textContent = task.priority || "Low";
  badgesDiv.appendChild(priorityBadge);

  // Overdue badge (if applicable)
  if (task.dueDate && !isTaskCompleted(task)) {
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    if (dueDate < today) {
      const overdueBadge = document.createElement("span");
      overdueBadge.className = "badge overdue-badge";
      overdueBadge.textContent = "Overdue";
      badgesDiv.appendChild(overdueBadge);
    }
  }

  // Completed badge (if applicable)
  if (isTaskCompleted(task)) {
    // Remove any existing Completed badge to prevent duplicates
    Array.from(badgesDiv.querySelectorAll('.badge.bg-warning')).forEach(badge => {
      if (badge.textContent.trim() === 'Completed') badge.remove();
    });
    const completedBadge = document.createElement("span");
    completedBadge.className = "badge bg-warning ms-2";
    completedBadge.textContent = "Completed";
    badgesDiv.appendChild(completedBadge);
  }

  cardHeaderDiv.appendChild(titleH5);
  cardHeaderDiv.appendChild(badgesDiv);

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

  // Apply styling based on task status (matching dashboard exactly)
  const isCompleted =
    task.completed === true ||
    task.completed === "true" ||
    task.completed === 1;

  if (isCompleted) {
    // Apply exact same styling as dashboard
    cardDiv.classList.add("bg-light");
    titleH5.innerHTML = `<i class="bi bi-check-circle me-1 text-success"></i> ${
      task.title || "Untitled Task"
    }`;
    titleH5.classList.add("text-muted");

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

// Complete task function
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
  const isTaskCompleted =
    task.completed === true ||
    task.completed === "true" ||
    task.completed === 1;

  // Set task title with archived styling (matching dashboard exactly)
  const taskTitle = document.getElementById("taskDetailsTitle");
  if (isTaskCompleted) {
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
        <i class=\"bi bi-paperclip me-2\" style=\"color: #7b34d2;\"></i>
        <span class=\"attachment-filename me-2\">${fileName}</span>
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
      '<p class="text-muted fst-italic mb-0">No attachments</p>';
  }

  // Set creation date
  const createdDate = task.createdAt
    ? new Date(task.createdAt).toLocaleDateString()
    : "Unknown";
  document.getElementById("taskDetailsCreated").textContent = createdDate;

  // Set archived status and button (matching dashboard exactly)
  const archivedBadge = document.getElementById("taskDetailsCompleted");
  const archiveBtn = document.getElementById("archiveTaskBtn");

  if (isTaskCompleted) {
    archivedBadge.classList.remove("d-none");
    archiveBtn.innerHTML =
      '<i class="bi bi-arrow-counterclockwise me-1"></i> Restore';
    archiveBtn.classList.remove("btn-warning");
    archiveBtn.classList.add("btn-success");
  } else {
    archivedBadge.classList.add("d-none");
    archiveBtn.innerHTML = '<i class="bi bi-archive me-1"></i> Complete';
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

  // Complete button
  document.getElementById("archiveTaskBtn").onclick = function () {
    archiveTask(taskId);
    bootstrap.Modal.getInstance(
      document.getElementById("taskDetailsModal")
    ).hide();
  };
}

// --- Edit Task Form Functions ---

// Populate edit form with task data
function populateEditForm(task) {
  // Reset file state
  selectedFiles = [];
  editExistingAttachments = task.attachment && Array.isArray(task.attachment) ? [...task.attachment] : [];

  // Set form fields
  document.getElementById("editTaskTitle").value = task.title || "";
  document.getElementById("editTaskDescription").value = task.description || "";
  document.getElementById("editTaskPriority").value = task.priority || "Low";

  // Set due date (convert from ISO string to date input format)
  if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    document.getElementById("editTaskDueDate").value = dueDate
      .toISOString()
      .split("T")[0];
  } else {
    document.getElementById("editTaskDueDate").value = "";
  }

  // Set minimum date to today for edit form
  const dueDateField = document.getElementById("editTaskDueDate");
  if (dueDateField) {
    const today = new Date().toISOString().split("T")[0];
    dueDateField.setAttribute("min", today);
  }

  // Set tags container
  if (task.label && Array.isArray(task.label)) {
    // Clear existing tags
    const editTagContainer = document.getElementById("editTagContainer");
    if (editTagContainer) {
      editTagContainer.innerHTML = "";
      
      // Add each tag as a badge
      task.label.forEach(tag => {
        addTagToContainer(tag, editTagContainer, "edit");
      });
    }
    
    // Clear the input field
    const editTagInput = document.getElementById("editTagInput");
    if (editTagInput) {
      editTagInput.value = "";
    }
  }

  // Clear file input and render attachments
  const editTaskAttachment = document.getElementById("editTaskAttachment");
  if (editTaskAttachment) {
    editTaskAttachment.value = "";
  }
  
  const editAttachmentContainer = document.getElementById("editAttachmentContainer");
  if (editAttachmentContainer) {
    renderAttachmentList(editAttachmentContainer, selectedFiles, editExistingAttachments);
  }
}

// Helper function to add tag to container
function addTagToContainer(tagText, container, prefix = "") {
  if (!tagText || !container) return;
  
  const tagBadge = document.createElement("span");
  tagBadge.className = "badge bg-secondary me-1 mb-1";
  tagBadge.innerHTML = `${tagText} <i class="bi bi-x" style="cursor: pointer;"></i>`;
  
  // Add click handler to remove tag
  const removeIcon = tagBadge.querySelector("i");
  if (removeIcon) {
    removeIcon.addEventListener("click", function() {
      container.removeChild(tagBadge);
    });
  }
  
  container.appendChild(tagBadge);
}

// Format file size in KB, MB, etc.
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  else return (bytes / 1073741824).toFixed(1) + ' GB';
}

// Upload files to server
async function uploadFiles(files) {
  if (!files || !files.length) return [];

  try {
    console.log("Starting file upload for", files.length, "files");
    const formData = new FormData();
    
    // Add each file to the form data
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
      console.log("Added file to FormData:", files[i].name, files[i].size);
    }

    const token = localStorage.getItem("token");
    console.log("Token available:", !!token);

    // Send the upload request
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

// Setup file attachment handlers
function setupFileAttachmentHandlers() {
  const editTaskAttachment = document.getElementById("editTaskAttachment");
  const editAttachmentContainer = document.getElementById("editAttachmentContainer");
  
  if (editTaskAttachment && editAttachmentContainer) {
    // Listen for file selection changes
    editTaskAttachment.addEventListener("change", function() {
      selectedFiles = Array.from(this.files);
      renderAttachmentList(editAttachmentContainer, selectedFiles, editExistingAttachments);
    });
  }
}

// Render attachment list with delete functionality (matching dashboard.js)
// Render attachment list
function renderAttachmentList(container, newFiles = [], existingAttachments = []) {
  if (!container) return;
  
  container.innerHTML = "";

  // Show existing attachments (when editing)
  existingAttachments.forEach((url, idx) => {
    const div = document.createElement("div");
    div.className = "attachment-item mb-2 p-2 border rounded";
    div.style.backgroundColor = "var(--background-color)";

    const fileIcon = document.createElement("i");
    fileIcon.className = `bi bi-file-earmark me-2`;
    fileIcon.style.color = "var(--text-color)";

    const fileNameSpan = document.createElement("span");
    fileNameSpan.className = "attachment-filename";
    fileNameSpan.textContent = url.split("/").pop();

    const viewableExtensions = [
      "pdf", "txt", "html", "htm", "css", "js", "json", "xml", "csv", "md",
      "jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "ico",
      "mp3", "wav", "ogg", "mp4", "webm", "py", "java", "cpp", "c", "php", "rb", "go", "rs", "swift", "kt", "yaml", "yml", "toml", "ini", "conf", "log", "woff", "woff2", "ttf", "eot"
    ];
    const canView = viewableExtensions.includes(url.split(".").pop()?.toLowerCase());

    const actionDiv = document.createElement("div");
    actionDiv.className = "d-flex gap-1";

    if (canView) {
      const viewBtn = document.createElement("button");
      viewBtn.type = "button";
      viewBtn.className = "btn btn-sm btn-outline-primary";
      viewBtn.innerHTML = '<i class="bi bi-eye"></i>';
      viewBtn.onclick = () => previewFile(`${API_BASE_URL}${url}`, url.split("/").pop());
      actionDiv.appendChild(viewBtn);
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-sm btn-outline-danger";
    deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
    deleteBtn.onclick = () => {
      editExistingAttachments.splice(idx, 1);
      renderAttachmentList(container, selectedFiles, editExistingAttachments);
    };
    actionDiv.appendChild(deleteBtn);

    div.appendChild(fileIcon);
    div.appendChild(fileNameSpan);
    div.appendChild(actionDiv);
    container.appendChild(div);
  });

  // Show new files
  newFiles.forEach((file, idx) => {
    const div = document.createElement("div");
    div.className = "attachment-item mb-2 p-2 border rounded";
    div.style.backgroundColor = "var(--background-color)";

    const fileIcon = document.createElement("i");
    fileIcon.className = `bi bi-file-earmark me-2`;
    fileIcon.style.color = "var(--text-color)";

    const fileNameSpan = document.createElement("span");
    fileNameSpan.className = "attachment-filename";
    fileNameSpan.textContent = file.name;

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-sm btn-outline-danger";
    deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
    deleteBtn.onclick = () => {
      selectedFiles.splice(idx, 1);
      renderAttachmentList(container, selectedFiles, editExistingAttachments);
    };

    div.appendChild(fileIcon);
    div.appendChild(fileNameSpan);
    div.appendChild(deleteBtn);
    container.appendChild(div);
  });
}

// Preview file function
function previewFile(url, fileName) {
  const fileExt = fileName.split('.').pop()?.toLowerCase();
  
  if (["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "ico"].includes(fileExt)) {
    showImagePreview(url, fileName);
  } else if (["mp3", "wav", "ogg", "mp4", "webm"].includes(fileExt)) {
    showMediaPreview(url, fileName, fileExt);
  } else {
    showDocumentPreview(url, fileName);
  }
}

// Handle edit task form submission
async function handleEditTaskSubmission(taskId) {
  try {
    // Collect form data
    const taskData = {
      title: document.getElementById("editTaskTitle").value.trim(),
      description: document.getElementById("editTaskDescription").value.trim(),
      priority: document.getElementById("editTaskPriority").value,
      dueDate: document.getElementById("editTaskDueDate").value || null,
    };

    // Validate required fields
    if (!taskData.title) {
      displayErrorMessage("Task title is required");
      return;
    }
    if (!taskData.dueDate) {
      displayErrorMessage("Due date is required");
      return;
    }
    
    // Validate due date is not in the past
    const currentDate = new Date().toISOString().split("T")[0];
    if (new Date(taskData.dueDate) < new Date(currentDate)) {
      displayErrorMessage("Due date cannot be in the past!");
      return;
    }

    // Process tags from tag container
    const editTagContainer = document.getElementById("editTagContainer");
    if (editTagContainer) {
      const tagElements = editTagContainer.querySelectorAll(".badge");
      taskData.label = Array.from(tagElements).map(badge => {
        // Extract text content without the "×" icon
        const text = badge.textContent || "";
        return text.replace("×", "").trim();
      }).filter(tag => tag);
    } else {
      taskData.label = [];
    }

    // Handle file uploads if needed
    let uploadedUrls = [];
    if (selectedFiles && selectedFiles.length > 0) {
      try {
        // Upload files first and get the URLs
        uploadedUrls = await uploadFiles(selectedFiles);
      } catch (error) {
        console.error("File upload failed:", error);
        displayErrorMessage(`File upload failed: ${error.message}`);
        return; // Don't proceed if upload fails
      }
    }
    
    // Combine existing attachments with newly uploaded ones
    taskData.attachment = [
      ...editExistingAttachments,
      ...uploadedUrls
    ];

    // Update the task
      await apiFetch(`/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify(taskData),
      });

    displaySuccessMessage("Task updated successfully!");

    // Hide the modal
    const editModal = bootstrap.Modal.getInstance(
      document.getElementById("editTaskModal")
    );
    editModal.hide();

    // Reset attachment state
    selectedFiles = [];
    editExistingAttachments = [];

    // Refresh the tasks to reflect the changes
    await fetchAllTasks();
  } catch (error) {
    console.error("Failed to update task:", error);
    displayErrorMessage("Failed to update task: " + error.message);
  }
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

// --- Search Functionality ---
function setupSearchFilter() {
  const searchInput = document.querySelector(".search-bar");
  const searchButton = document.querySelector(
    '.input-group .btn-primary-accent[type="button"]'
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
      // If current search exists, re-run it with new options
      if (currentSearchQuery) {
        const useSemantic = this.checked;
        const useContains = containsCheckbox?.checked || false;
        performPriorityTasksSearch(
          currentSearchQuery,
          useSemantic,
          useContains
        );
      }
    });
  }

  if (containsCheckbox) {
    containsCheckbox.addEventListener("change", function () {
      // If current search exists, re-run it with new options
      if (currentSearchQuery) {
        const useSemantic = semanticCheckbox?.checked || false;
        const useContains = this.checked;
        performPriorityTasksSearch(
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
      // Empty query - return to normal view with current priority filter
      currentSearchQuery = null;
      applyPriorityFilter(currentPriorityFilter);
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
    performPriorityTasksSearch(query, useSemantic, useContains);
  }
}

// --- Enhanced Search Function (supports both semantic and contains search) ---
async function performPriorityTasksSearch(
  query,
  useSemantic = true,
  useContains = false
) {
  try {
    // Show loading state
    showLoadingState();

    // Build search URL with parameters (same as labels page)
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

    // Send GET request to the backend
    const searchResults = await apiFetch(searchUrl);

    // Store the current search query for UI state
    currentSearchQuery = query;

    // Update allTasks with search results for priority filtering
    allTasks = searchResults || [];

    // Apply current priority filter to search results
    applyPriorityFilter(currentPriorityFilter);

    // Update search status display
    updateSearchStatus(true, query);
  } catch (error) {
    console.error("Search failed:", error);
    displayErrorMessage("Search failed. Please try again.");

    // Fall back to regular search
    filterTasksBySearch(query);
  }
}

// --- Fallback Regular Search Function ---
function filterTasksBySearch(searchTerm) {
  if (!searchTerm) {
    applyPriorityFilter(currentPriorityFilter);
    return;
  }

  // Filter allTasks by search term
  const searchResults = allTasks.filter((task) => {
    const titleMatch = task.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const descriptionMatch =
      task.description &&
      task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const tagsMatch =
      task.label &&
      task.label.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      );

    return titleMatch || descriptionMatch || tagsMatch;
  });

  // Apply priority filter to search results
  const filteredResults =
    currentPriorityFilter === "all"
      ? searchResults
      : searchResults.filter(
          (task) =>
            task.priority &&
            task.priority.toLowerCase() === currentPriorityFilter.toLowerCase()
        );

  // Render the filtered tasks
  renderTasks(filteredResults);
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
      // Clear search input
      const searchInput = document.querySelector(".search-bar");
      if (searchInput) {
        searchInput.value = "";
      }

      // Reset search checkboxes to default state
      const semanticCheckbox = document.getElementById(
        "semanticSearchCheckbox"
      );
      const containsCheckbox = document.getElementById(
        "containsSearchCheckbox"
      );
      if (semanticCheckbox) semanticCheckbox.checked = true; // Default to semantic search
      if (containsCheckbox) containsCheckbox.checked = false;

      // Reset search state
      currentSearchQuery = null;

      // Reset priority filter to "all"
      currentPriorityFilter = "all";

      // Update priority filter buttons
      const priorityButtons = document.querySelectorAll("[data-priority]");
      priorityButtons.forEach((btn) => btn.classList.remove("active"));
      const allButton = document.querySelector('[data-priority="all"]');
      if (allButton) {
        allButton.classList.add("active");
      }

      // Fetch all tasks to reset everything
      fetchAllTasks();

      // Show success message
      displaySuccessMessage("Filters reset successfully!");
    });
  }
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

// Setup edit task form submission
function setupEditTaskFormSubmission() {
  // Get the edit task form
  const editTaskForm = document.getElementById("editTaskForm");

  if (editTaskForm) {
    editTaskForm.addEventListener("submit", function (e) {
      e.preventDefault();

      // Check if we have a task ID stored
      if (window.currentEditTaskId) {
        handleEditTaskSubmission(window.currentEditTaskId);
      } else {
        displayErrorMessage("No task selected for editing");
      }
    });
  }
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

// --- Clear Search Function (can be called from UI) ---
function clearSearch() {
  const searchInput = document.querySelector(".search-bar");
  if (searchInput) {
    searchInput.value = "";
  }

  currentSearchQuery = null;
  updateSearchStatus(false);
  fetchAllTasks();

  displaySuccessMessage("Search cleared!");
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

// --- Initialize Priority Page ---
function initPriorityPage() {
  // Check if user is authenticated
  if (!checkAuth()) {
    return;
  }

  // Display user info
  displayUserInfo();

  // Setup event listeners for priority filter buttons
  setupPriorityFilters();

  // Setup search functionality
  setupSearchFilter();

  // Setup reset filters button
  setupResetFilters();

  // Setup logout handler
  setupLogoutHandler();

  // Setup edit task form submission
  setupEditTaskFormSubmission();
  
  // Setup tag functionality for edit form
  setupTagFunctionality();

  // Set initial filter to "all" and make sure the button is active
  const allButton = document.querySelector('[data-priority="all"]');
  if (allButton) {
    allButton.classList.add("active");
  }

  // Fetch and display all tasks from the backend
  fetchAllTasks();
}

// Setup tag functionality for edit form
function setupTagFunctionality() {
  // Add tag button click handler for edit form
  const editAddTagBtn = document.getElementById("editAddTagBtn");
  const editTagInput = document.getElementById("editTagInput");
  const editTagContainer = document.getElementById("editTagContainer");
  const editExistingTagsDropdown = document.getElementById("editExistingTagsDropdown");

  if (editAddTagBtn && editTagInput && editTagContainer) {
    editAddTagBtn.addEventListener("click", function() {
      addTagFromInput(editTagInput, editTagContainer);
    });

    // Add tag on Enter key
    editTagInput.addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addTagFromInput(editTagInput, editTagContainer);
      }
    });
  }

  // Add tag from existing tags dropdown
  if (editExistingTagsDropdown && editTagContainer) {
    editExistingTagsDropdown.addEventListener("change", function() {
      const selectedTag = this.value;
      if (selectedTag) {
        addTagToContainer(selectedTag, editTagContainer, "edit");
        this.value = ""; // Reset dropdown
      }
    });
  }

  // Setup file attachment handlers
  setupFileAttachmentHandlers();

  // Populate existing tags dropdown
  populateExistingTagsDropdown();
}

// Populate existing tags dropdown from all tasks
function populateExistingTagsDropdown() {
  console.log("Populating existing tags dropdown");
  const existingTagsDropdown = document.getElementById("editExistingTagsDropdown");
  if (!existingTagsDropdown) {
    console.error("Existing tags dropdown element not found");
    return;
  }
  
  // Reset dropdown
  existingTagsDropdown.innerHTML = '<option value="">Select existing tag</option>';
  
  // Collect all unique tags from tasks
  const allTags = new Set();
  
  if (!allTasks || !Array.isArray(allTasks)) {
    console.error("allTasks is not properly initialized:", allTasks);
    return;
  }
  
  console.log(`Processing ${allTasks.length} tasks for tags`);
  
  allTasks.forEach(task => {
    if (task.label && Array.isArray(task.label)) {
      task.label.forEach(tag => {
        if (tag && tag.trim()) {
          allTags.add(tag.trim());
        }
      });
    }
  });
  
  console.log(`Found ${allTags.size} unique tags:`, Array.from(allTags));
  
  // Add options for each unique tag
  Array.from(allTags).sort().forEach(tag => {
    const option = document.createElement("option");
    option.value = tag;
    option.textContent = tag;
    existingTagsDropdown.appendChild(option);
  });
  
  console.log("Finished populating tags dropdown");
}

// Helper function to add tag from input
function addTagFromInput(input, container) {
  if (!input || !container) return;
  
  const tagText = input.value.trim();
  if (tagText) {
    // Split by comma and add each tag
    const tags = tagText.split(",").map(tag => tag.trim()).filter(tag => tag);
    tags.forEach(tag => {
      addTagToContainer(tag, container);
    });
    input.value = "";
  }
}

// --- Initialize when DOM is loaded ---
document.addEventListener("DOMContentLoaded", function () {
  // Small delay to ensure all elements are properly loaded
  setTimeout(initPriorityPage, 100);
});

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
