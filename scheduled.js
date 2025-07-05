// scheduled.js - Script for scheduled tasks page with backend integration

// --- API Configuration ---
const API_BASE_URL = "http://localhost:5000";

// --- Global Variables ---
let allTasks = []; // Store all tasks for filtering
let currentTaskData = null; // Store current task data for modal
let currentSearchQuery = null; // Track current search query for semantic search
let selectedFiles = []; // Store selected files for upload
let editExistingAttachments = []; // Store existing attachments when editing

function handleLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

// --- Authentication Functions ---
function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    console.log("No token found, but continuing for testing purposes");
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

function getStartOfWeek(date) {
  const start = new Date(date);
  const day = start.getDay();
  // Adjust to start of week (Monday = 1, so we need to go back to Monday)
  // If day is 0 (Sunday), we go back 6 days to get Monday
  // If day is 1 (Monday), we go back 0 days
  // If day is 2 (Tuesday), we go back 1 day, etc.
  const diff = day === 0 ? -6 : -(day - 1);
  const monday = new Date(start);
  monday.setDate(start.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getEndOfWeek(date) {
  const end = new Date(getStartOfWeek(date));
  end.setDate(end.getDate() + 6); // Add 6 days to get Sunday
  end.setHours(23, 59, 59, 999);
  return end;
}

function getStartOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getEndOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function isSameDate(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isDateInRange(date, startDate, endDate) {
  return date >= startDate && date <= endDate;
}

function parseTaskDate(dateString) {
  if (!dateString) return null;

  // Handle different date formats that might come from the database
  let date;

  // Try parsing as ISO string first
  if (typeof dateString === "string" && dateString.includes("T")) {
    date = new Date(dateString);
  }
  // Try parsing as YYYY-MM-DD format
  else if (
    typeof dateString === "string" &&
    dateString.match(/^\d{4}-\d{2}-\d{2}$/)
  ) {
    date = new Date(dateString + "T00:00:00.000Z");
  }
  // Try parsing as MM/DD/YYYY or other formats
  else {
    date = new Date(dateString);
  }

  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.warn(`Invalid date format: ${dateString}`);
    return null;
  }

  return date;
}

// --- Task Filtering Functions ---
function categorizeTasksBySchedule(tasks) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const weekStart = getStartOfWeek(now);
  const weekEnd = getEndOfWeek(now);

  const monthStart = getStartOfMonth(now);
  const monthEnd = getEndOfMonth(now);

  const categories = {
    overdue: [],
    today: [],
    thisWeek: [],
    thisMonth: [],
  };

  tasks.forEach((task) => {
    const taskDate = parseTaskDate(task.dueDate);

    // Skip tasks without due dates
    if (!taskDate) {
      return;
    }

    // Normalize taskDate to start of day for comparison
    const taskDateStart = new Date(
      taskDate.getFullYear(),
      taskDate.getMonth(),
      taskDate.getDate()
    );

    // Exclusive categorization: Each task appears in only ONE section
    // Priority order: Overdue > Today > This Week > This Month

    // Check if task is overdue (highest priority)
    if (taskDateStart < todayStart) {
      categories.overdue.push(task);
    } else if (isSameDate(taskDateStart, todayStart)) {
      categories.today.push(task);
    }
    // Check if task is due this week BUT NOT today
    else if (isDateInRange(taskDateStart, weekStart, weekEnd)) {
      categories.thisWeek.push(task);
    }
    // Check if task is due this month BUT NOT this week
    else if (isDateInRange(taskDateStart, monthStart, monthEnd)) {
      categories.thisMonth.push(task);
    }
  });

  return categories;
}

// --- Task Card Creation Functions ---
function createTaskCard(task, isOverdue = false) {
  // Create the column wrapper
  const colDiv = document.createElement("div");
  colDiv.className = "col";

  // Create card
  const cardDiv = document.createElement("div");
  cardDiv.className = `card task-card h-100 shadow-sm rounded-4${
    isOverdue ? " overdue-task" : ""
  }`;
  cardDiv.style.cursor = "pointer";
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
  cardBodyDiv.className = "card-body";

  // Create card header with title and priority
  const cardHeaderDiv = document.createElement("div");
  cardHeaderDiv.className =
    "d-flex justify-content-between align-items-center mb-2";

  // Task title
  const titleH5 = document.createElement("h5");
  titleH5.className = "card-title mb-0";
  titleH5.textContent = task.title;

  // Badges container (priority and overdue)
  const badgesDiv = document.createElement("div");
  badgesDiv.className = "d-flex gap-2";

  // Priority badge
  const priorityBadge = document.createElement("span");
  priorityBadge.className = `badge priority-${task.priority.toLowerCase()}`;
  priorityBadge.textContent = task.priority;
  badgesDiv.appendChild(priorityBadge);

  // Overdue badge (if applicable)
  if (isOverdue) {
    const overdueBadge = document.createElement("span");
    overdueBadge.className = "badge overdue-badge";
    overdueBadge.textContent = "Overdue";
    badgesDiv.appendChild(overdueBadge);
  }

  cardHeaderDiv.appendChild(titleH5);
  cardHeaderDiv.appendChild(badgesDiv);

  // Description
  const descriptionP = document.createElement("p");
  descriptionP.className = "card-text text-muted";
  descriptionP.textContent = task.description || "No description provided";

  // Tags section
  const tagsDiv = document.createElement("div");
  tagsDiv.className = "d-flex flex-wrap gap-2 mb-3";
  if (task.label && task.label.length > 0) {
    task.label.forEach((tag) => {
      const tagBadge = document.createElement("span");
      tagBadge.className = "badge bg-secondary";
      tagBadge.textContent = tag;
      tagsDiv.appendChild(tagBadge);
    });
  }

  // Footer with due date and actions
  const footerDiv = document.createElement("div");
  footerDiv.className = "d-flex justify-content-between align-items-center";

  // Due date
  const dueDateDiv = document.createElement("div");
  const dueDateSmall = document.createElement("small");
  dueDateSmall.className = "text-muted";

  if (task.dueDate) {
    const taskDate = new Date(task.dueDate);
    dueDateSmall.innerHTML = `<i class="bi bi-calendar-event me-1"></i>${taskDate.toLocaleDateString()}`;
  } else {
    dueDateSmall.innerHTML = `<i class="bi bi-calendar-event me-1"></i>No due date`;
  }

  dueDateDiv.appendChild(dueDateSmall);

  // Action icons
  const actionsDiv = document.createElement("div");

  // Edit icon
  const editIcon = document.createElement("i");
  editIcon.className = "action-icon text-info bi bi-pencil";
  editIcon.title = "Edit Task";
  editIcon.setAttribute("data-bs-toggle", "tooltip");
  editIcon.setAttribute("data-bs-placement", "top");

  // Archive icon
  const archiveIcon = document.createElement("i");
  archiveIcon.className = "action-icon text-warning bi bi-archive";
  archiveIcon.title = "Archive Task";
  archiveIcon.setAttribute("data-bs-toggle", "tooltip");
  archiveIcon.setAttribute("data-bs-placement", "top");

  // Delete icon
  const deleteIcon = document.createElement("i");
  deleteIcon.className = "action-icon text-danger bi bi-trash";
  deleteIcon.title = "Delete Task";
  deleteIcon.setAttribute("data-bs-toggle", "tooltip");
  deleteIcon.setAttribute("data-bs-placement", "top");

  actionsDiv.appendChild(editIcon);
  actionsDiv.appendChild(archiveIcon);
  actionsDiv.appendChild(deleteIcon);

  footerDiv.appendChild(dueDateDiv);
  footerDiv.appendChild(actionsDiv);

  // Assemble the card
  cardBodyDiv.appendChild(cardHeaderDiv);
  cardBodyDiv.appendChild(descriptionP);
  cardBodyDiv.appendChild(tagsDiv);
  cardBodyDiv.appendChild(footerDiv);

  // Add attachments
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

  // Add click event listeners for actions and modal
  cardDiv.addEventListener("click", function (e) {
    e.preventDefault();

    // Handle Edit icon click
    if (
      e.target.classList.contains("bi-pencil") ||
      e.target.closest(".bi-pencil")
    ) {
      e.stopPropagation();
      handleEditTaskAction(cardDiv);
      return;
    }

    // Handle Archive icon click
    if (
      e.target.classList.contains("bi-archive") ||
      e.target.classList.contains("bi-arrow-counterclockwise") ||
      e.target.closest(".bi-archive, .bi-arrow-counterclockwise")
    ) {
      e.stopPropagation();
      handleArchiveTaskAction(cardDiv);
      return;
    }

    // Handle Delete icon click
    if (
      e.target.classList.contains("bi-trash") ||
      e.target.closest(".bi-trash")
    ) {
      e.stopPropagation();
      handleDeleteTaskAction(cardDiv);
      return;
    }

    // Don't open modal if clicking on any action icon
    if (
      e.target.classList.contains("action-icon") ||
      e.target.closest(".action-icon")
    ) {
      return;
    }

    // Open modal for card click
    openTaskDetailsModal(cardDiv);
  });

  return colDiv;
}

// --- Render Functions ---
function renderTasksInSection(sectionId, tasks, sectionTitle) {
  const section = document.getElementById(sectionId);
  if (!section) {
    console.warn(`Section with ID '${sectionId}' not found`);
    return;
  }

  // Find the task container (row with cards)
  let taskContainer = section.querySelector(".row.row-cols-1");

  if (!taskContainer) {
    // Create the task container if it doesn't exist
    taskContainer = document.createElement("div");
    taskContainer.className = "row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4";
    section.appendChild(taskContainer);
  }

  // Clear existing tasks (including hardcoded ones)
  taskContainer.innerHTML = "";

  // Update the section header with task count and current date
  const headerElement = section.querySelector(".time-section-header");
  if (headerElement) {
    // Find badge by section type
    let badge;
    if (sectionTitle === "Today") {
      badge = document.getElementById("todayCount");
    } else if (sectionTitle === "This Week") {
      badge = document.getElementById("weekCount");
    } else if (sectionTitle === "This Month") {
      badge = document.getElementById("monthCount");
    } else if (sectionTitle === "Overdue") {
      badge = document.getElementById("overdueCount");
    }

    if (badge) {
      badge.textContent = `${tasks.length} ${
        tasks.length === 1 ? "Task" : "Tasks"
      }`;
      // Make sure badge is visible
      badge.style.display = "inline-block";
    }

    // Update the date display based on section type
    const dateElement = headerElement.querySelector("small");
    if (dateElement) {
      if (sectionTitle === "Today") {
        const today = new Date();
        dateElement.textContent = today.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      } else if (sectionTitle === "This Week") {
        const now = new Date();
        const weekStart = getStartOfWeek(now);
        const weekEnd = getEndOfWeek(now);
        const startMonth = weekStart.toLocaleDateString("en-US", {
          month: "long",
        });
        const endMonth = weekEnd.toLocaleDateString("en-US", { month: "long" });
        const startDay = weekStart.getDate();
        const endDay = weekEnd.getDate();
        const year = weekStart.getFullYear();

        if (startMonth === endMonth) {
          dateElement.textContent = `${startMonth} ${startDay} - ${endDay}, ${year}`;
        } else {
          dateElement.textContent = `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
        }
      } else if (sectionTitle === "This Month") {
        const today = new Date();
        dateElement.textContent = today.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        });
      } else if (sectionTitle === "Overdue") {
        dateElement.textContent = "Past due date";
      }
    }
  }

  // Show or hide the section based on whether there are tasks
  if (sectionTitle === "Overdue") {
    if (tasks.length > 0) {
      section.classList.remove("d-none");
    } else {
      section.classList.add("d-none");
    }
  }

  // Render tasks or show empty state
  if (tasks.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "col-12";
    emptyState.innerHTML = `
      <div class="text-center py-4">
        <i class="bi bi-calendar-x display-4 text-muted"></i>
        <p class="text-muted mt-2">No tasks scheduled for ${sectionTitle.toLowerCase()}</p>
      </div>
    `;
    taskContainer.appendChild(emptyState);
  } else {
    // Render each task as a card
    tasks.forEach((task) => {
      const isOverdue = sectionTitle === "Overdue";
      const taskCard = createTaskCard(task, isOverdue);
      taskContainer.appendChild(taskCard);
    });
  }
}

// --- Load and Display Scheduled Tasks ---
async function loadScheduledTasks() {
  try {
    console.log("Loading scheduled tasks...");

    // Show loading state
    showLoadingState();

    // Fetch all tasks from the backend
    const tasks = await apiFetch("/tasks");
    console.log("Fetched tasks:", tasks);

    allTasks = tasks || [];

    // Reset search state when loading all tasks
    currentSearchQuery = null;
    updateSearchStatus(false);

    // Filter tasks that have due dates and are not completed
    const scheduledTasks = allTasks.filter((task) => {
      // Check if task has required properties
      if (!task || typeof task !== "object") {
        return false;
      }

      // Check if task has dueDate
      if (!task.dueDate) {
        return false;
      }

      // Check if task is completed
      const isCompleted =
        task.completed === true ||
        task.completed === "true" ||
        task.completed === 1;
      if (isCompleted) {
        return false;
      }

      return true;
    });

    console.log("Filtered scheduled tasks:", scheduledTasks);

    // Categorize tasks by schedule
    const categorizedTasks = categorizeTasksBySchedule(scheduledTasks);

    // Render tasks in their respective sections
    renderTasksInSection("overdueSection", categorizedTasks.overdue, "Overdue");
    renderTasksInSection("todaySection", categorizedTasks.today, "Today");
    renderTasksInSection("weekSection", categorizedTasks.thisWeek, "This Week");
    renderTasksInSection(
      "monthSection",
      categorizedTasks.thisMonth,
      "This Month"
    );

    // Hide loading state
    hideLoadingState();

    // Show empty state if no scheduled tasks at all
    const totalScheduledTasks =
      categorizedTasks.overdue.length +
      categorizedTasks.today.length +
      categorizedTasks.thisWeek.length +
      categorizedTasks.thisMonth.length;

    console.log("Total scheduled tasks:", totalScheduledTasks);

    // Note: Empty state handling removed per user request
  } catch (error) {
    console.error("Failed to load scheduled tasks:", error);
    hideLoadingState();

    // Note: Empty state handling removed per user request
    displayErrorMessage(
      "Could not connect to server. Please check your connection and try again."
    );
  }
}

// --- UI State Management ---
function showLoadingState() {
  // You can add loading spinners to each section if needed
  console.log("Loading scheduled tasks...");
}

function hideLoadingState() {
  console.log("Finished loading scheduled tasks.");
}

// --- Modal Functions ---
function openTaskDetailsModal(card) {
  // Parse tags and attachments from dataset
  const tags = card.dataset.tags ? card.dataset.tags.split(',').filter(tag => tag.trim()) : [];
  const attachments = card.dataset.attachment ? card.dataset.attachment.split(',').filter(att => att.trim()) : [];
  
  const taskData = {
    title: card.dataset.title,
    description: card.dataset.description,
    dueDate: card.dataset.dueDate,
    priority: card.dataset.priority,
    tags: card.dataset.tags, // Keep as string for display purposes
    attachment: card.dataset.attachment, // Keep as string for display purposes
    label: tags, // Add as array for edit modal
    attachmentArray: attachments, // Add as array for edit modal
    created: card.dataset.created,
    archived: card.dataset.archived,
    taskId: card.dataset.taskId,
  };

  // Store current task data for modal actions
  currentTaskData = taskData;

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

  // Format due date
  let dueDateText = "No due date";
  if (taskData.dueDate) {
    const dueDate = new Date(taskData.dueDate);
    dueDateText = dueDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  document
    .getElementById("taskDetailsDueDate")
    .querySelector("span").textContent = dueDateText;

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
    // Close modal first
    bootstrap.Modal.getInstance(
      document.getElementById("taskDetailsModal")
    ).hide();

    // Wait for modal to close, then open edit modal
    setTimeout(() => {
      // Create edit task data with proper array format
      const editTaskData = {
        taskId: taskData.taskId,
        title: taskData.title,
        description: taskData.description,
        dueDate: taskData.dueDate,
        priority: taskData.priority,
        label: taskData.label || [],
        attachment: taskData.attachmentArray || [],
      };
      openEditTaskModal(editTaskData);
    }, 300);
  };

  document.getElementById("archiveTaskBtn").onclick = function () {
    // Handle archive/restore task
    handleArchiveTask(taskData.taskId, !isTaskArchived);
    bootstrap.Modal.getInstance(
      document.getElementById("taskDetailsModal")
    ).hide();
  };
}

// --- Task Action Functions ---
async function handleArchiveTask(taskId, shouldArchive) {
  try {
    // Update task status via API
    await apiFetch(`/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({
        completed: shouldArchive,
      }),
    });

    displaySuccessMessage(
      shouldArchive
        ? "Task archived successfully!"
        : "Task restored successfully!"
    );

    // Reload the scheduled tasks to reflect the change
    loadScheduledTasks();
  } catch (error) {
    console.error("Failed to archive/restore task:", error);
    displayErrorMessage("Failed to update task. Please try again.");
  }
}

// --- Task Action Handler Functions ---
function handleEditTaskAction(card) {
  // Open edit modal directly on this page instead of redirecting
  const taskId = card.dataset.taskId;
  
  // Parse tags and attachments from dataset
  const tags = card.dataset.tags ? card.dataset.tags.split(',').filter(tag => tag.trim()) : [];
  const attachments = card.dataset.attachment ? card.dataset.attachment.split(',').filter(att => att.trim()) : [];
  
  const taskData = {
    taskId: taskId,
    title: card.dataset.title,
    description: card.dataset.description,
    dueDate: card.dataset.dueDate,
    priority: card.dataset.priority,
    label: tags,
    attachment: attachments,
  };

  openEditTaskModal(taskData);
}

async function handleArchiveTaskAction(card) {
  const taskId = card.dataset.taskId;
  const isCurrentlyArchived = card.dataset.archived === "true";
  const newArchivedState = !isCurrentlyArchived;

  try {
    await apiFetch(`/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({
        completed: newArchivedState,
      }),
    });

    displaySuccessMessage(
      newArchivedState
        ? "Task archived successfully!"
        : "Task restored successfully!"
    );
    loadScheduledTasks(); // Reload tasks to reflect changes
  } catch (error) {
    console.error("Failed to archive/restore task:", error);
    displayErrorMessage("Failed to update task. Please try again.");
  }
}

async function handleDeleteTaskAction(card) {
  const taskId = card.dataset.taskId;
  const taskTitle = card.dataset.title;

  if (confirm(`Are you sure you want to delete the task "${taskTitle}"?`)) {
    try {
      await apiFetch(`/tasks/${taskId}`, {
        method: "DELETE",
      });

      displaySuccessMessage("Task deleted successfully!");
      loadScheduledTasks(); // Reload tasks to reflect changes
    } catch (error) {
      console.error("Failed to delete task:", error);
      displayErrorMessage("Failed to delete task. Please try again.");
    }
  }
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
      // If current search exists, re-run it with new options
      if (currentSearchQuery) {
        const useSemantic = this.checked;
        const useContains = containsCheckbox?.checked || false;
        performScheduledTasksSearch(
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
        performScheduledTasksSearch(
          currentSearchQuery,
          useSemantic,
          useContains
        );
      }
    });
  }

  // Set up clear search button event listener
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
      loadScheduledTasks();
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
    performScheduledTasksSearch(query, useSemantic, useContains);
  }
}

// --- Enhanced Search Function (supports both semantic and contains search) ---
async function performScheduledTasksSearch(
  query,
  useSemantic = true,
  useContains = false
) {
  try {
    console.log(
      `Performing search for "${query}" - Semantic: ${useSemantic}, Contains: ${useContains}`
    );

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

    console.log("Search URL:", searchUrl);

    // Send GET request to the backend
    const searchResults = await apiFetch(searchUrl);
    console.log(`Search returned ${searchResults.length} total results`);

    // Filter for scheduled tasks (tasks with due dates and not completed)
    const scheduledSearchResults = searchResults.filter((task) => {
      return (
        task.dueDate &&
        task.completed !== true &&
        task.completed !== "true" &&
        task.completed !== 1
      );
    });

    console.log(
      `Filtered to ${scheduledSearchResults.length} scheduled search results`
    );

    // Store the current search query for UI state
    currentSearchQuery = query;
    updateSearchStatus(true, query);

    // Categorize search results by schedule
    const categorizedTasks = categorizeTasksBySchedule(scheduledSearchResults);

    // Render search results
    renderTasksInSection("overdueSection", categorizedTasks.overdue, "Overdue");
    renderTasksInSection("todaySection", categorizedTasks.today, "Today");
    renderTasksInSection("weekSection", categorizedTasks.thisWeek, "This Week");
    renderTasksInSection(
      "monthSection",
      categorizedTasks.thisMonth,
      "This Month"
    );

    // Hide loading state
    hideLoadingState();

    // Show/hide empty state based on total results
    const totalResults =
      categorizedTasks.overdue.length +
      categorizedTasks.today.length +
      categorizedTasks.thisWeek.length +
      categorizedTasks.thisMonth.length;

    // Note: Empty state handling removed per user request
  } catch (error) {
    console.error("Search failed:", error);
    displayErrorMessage("Search failed. Please try again.");
    hideLoadingState();

    // Fall back to regular search
    filterTasksBySearch(query);
  }
}

// --- Fallback Regular Search Function ---
function filterTasksBySearch(query) {
  if (!query) {
    loadScheduledTasks(); // Reset to show all tasks
    return;
  }

  // Filter tasks that have due dates and match the search query
  const filteredTasks = allTasks.filter((task) => {
    if (
      !task.dueDate ||
      task.completed === true ||
      task.completed === "true" ||
      task.completed === 1
    ) {
      return false;
    }

    const titleMatch = task.title.toLowerCase().includes(query);
    const descriptionMatch =
      task.description && task.description.toLowerCase().includes(query);
    const tagsMatch =
      task.label && task.label.some((tag) => tag.toLowerCase().includes(query));

    return titleMatch || descriptionMatch || tagsMatch;
  });

  // Categorize filtered tasks
  const categorizedTasks = categorizeTasksBySchedule(filteredTasks);

  // Render filtered tasks
  renderTasksInSection("overdueSection", categorizedTasks.overdue, "Overdue");
  renderTasksInSection("todaySection", categorizedTasks.today, "Today");
  renderTasksInSection("weekSection", categorizedTasks.thisWeek, "This Week");
  renderTasksInSection(
    "monthSection",
    categorizedTasks.thisMonth,
    "This Month"
  );
}

// --- Show/Hide Search Status ---
function updateSearchStatus(isSearchActive, query = null) {
  let clearSearchBtn = document.getElementById("clearSearchBtn");

  if (isSearchActive && query) {
    // Create clear search button if it doesn't exist
    if (!clearSearchBtn) {
      const searchBar = document.querySelector(".search-bar");
      if (searchBar) {
        clearSearchBtn = document.createElement("button");
        clearSearchBtn.id = "clearSearchBtn";
        clearSearchBtn.className = "btn btn-sm btn-outline-secondary ms-2";
        clearSearchBtn.innerHTML =
          '<i class="bi bi-x-circle me-1"></i>Clear Search';
        clearSearchBtn.title = "Clear search and return to scheduled view";

        // Insert after the search input group
        const inputGroup = searchBar.closest(".input-group");
        if (inputGroup && inputGroup.parentNode) {
          inputGroup.parentNode.insertBefore(
            clearSearchBtn,
            inputGroup.nextSibling
          );
        }
      }
    }

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
  loadScheduledTasks();

  displaySuccessMessage("Search cleared!");
}

// --- Utility Functions ---
function displaySuccessMessage(message) {
  // Create and show a temporary success message
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

  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.parentNode.removeChild(alertDiv);
    }
  }, 3000);
}

function displayErrorMessage(message) {
  // Create and show a temporary error message
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

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.parentNode.removeChild(alertDiv);
    }
  }, 5000);
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

// --- Initialization ---
document.addEventListener("DOMContentLoaded", function () {
  console.log("Scheduled tasks page DOM loaded, initializing...");

  // Check authentication
  if (!checkAuth()) {
    console.log("Authentication failed, redirecting to login");
    return;
  }

  console.log("Authentication successful");

  // Display user info
  displayUserInfo();

  // Load scheduled tasks from backend
  loadScheduledTasks();

  // Setup search functionality
  setupSearchFunctionality();

  // Set up edit form
  setupEditTaskForm();

  // Setup tag functionality for edit form
  setupTagFunctionality();

  // Add global event listener for action icons (including hardcoded HTML)
  document.addEventListener("click", function (e) {
    // Handle action icons in any task card
    const taskCard = e.target.closest(".task-card");
    if (!taskCard) return;

    // Handle Edit action
    if (
      e.target.classList.contains("bi-pencil") ||
      e.target.closest(".bi-pencil")
    ) {
      e.preventDefault();
      e.stopPropagation();
      handleEditTaskAction(taskCard);
      return;
    }

    // Handle Archive action
    if (
      e.target.classList.contains("bi-archive") ||
      e.target.classList.contains("bi-arrow-counterclockwise") ||
      e.target.closest(".bi-archive, .bi-arrow-counterclockwise")
    ) {
      e.preventDefault();
      e.stopPropagation();
      handleArchiveTaskAction(taskCard);
      return;
    }

    // Handle Delete action
    if (
      e.target.classList.contains("bi-trash") ||
      e.target.closest(".bi-trash")
    ) {
      e.preventDefault();
      e.stopPropagation();
      handleDeleteTaskAction(taskCard);
      return;
    }
  });

  // Initialize tooltips for action icons
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  console.log("Scheduled tasks page initialized successfully");

  setupLogoutHandler();
});

// --- Edit Task Modal Functions ---
let editItem = null; // Store current task being edited (same as dashboard)

function openEditTaskModal(taskData) {
  console.log("Opening edit modal for task:", taskData);

  // Reset file state
  selectedFiles = [];
  editExistingAttachments = taskData.attachment && Array.isArray(taskData.attachment) ? [...taskData.attachment] : [];

  // Store task ID for form submission
  window.currentEditTaskId = taskData.taskId;

  // Pre-fill form fields
  const titleField = document.getElementById("editTaskTitle");
  const descriptionField = document.getElementById("editTaskDescription");
  const dueDateField = document.getElementById("editTaskDueDate");
  const priorityField = document.getElementById("editTaskPriority");

  if (titleField) titleField.value = taskData.title || "";
  if (descriptionField) descriptionField.value = taskData.description || "";
  if (dueDateField) {
    dueDateField.value = taskData.dueDate || "";
    // Set minimum date to today for edit form
    const today = new Date().toISOString().split("T")[0];
    dueDateField.setAttribute("min", today);
  }
  if (priorityField) priorityField.value = taskData.priority || "Medium";

  // Handle tags - populate tag container
  const editTagContainer = document.getElementById("editTagContainer");
  const editTagInput = document.getElementById("editTagInput");
  
  if (editTagContainer) {
    editTagContainer.innerHTML = "";
    if (taskData.label && Array.isArray(taskData.label)) {
      taskData.label.forEach(tag => {
        addTagToContainer(tag, editTagContainer, "edit");
      });
    }
  }
  
  if (editTagInput) {
    editTagInput.value = "";
  }

  // Handle attachments - render attachment list
  const editTaskAttachment = document.getElementById("editTaskAttachment");
  const editAttachmentContainer = document.getElementById("editAttachmentContainer");
  
  if (editTaskAttachment) {
    editTaskAttachment.value = "";
  }
  
  if (editAttachmentContainer) {
    renderAttachmentList(editAttachmentContainer, selectedFiles, editExistingAttachments);
  }

  // Populate existing tags dropdown
  populateExistingTagsDropdown();

  // Show the modal
  const editModal = document.getElementById("editTaskModal");
  if (editModal) {
  const modal = new bootstrap.Modal(editModal);
  modal.show();
  }

  console.log("Edit modal opened successfully");
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

// Populate existing tags dropdown from all tasks
function populateExistingTagsDropdown() {
  const existingTagsDropdown = document.getElementById("editExistingTagsDropdown");
  if (!existingTagsDropdown) return;
  
  // Reset dropdown
  existingTagsDropdown.innerHTML = '<option value="">Select existing tag</option>';
  
  // Collect all unique tags from tasks
  const allTags = new Set();
  
  if (allTasks && Array.isArray(allTasks)) {
    allTasks.forEach(task => {
      if (task.label && Array.isArray(task.label)) {
        task.label.forEach(tag => {
          if (tag && tag.trim()) {
            allTags.add(tag.trim());
          }
        });
      }
    });
  }
  
  // Add options for each unique tag
  Array.from(allTags).sort().forEach(tag => {
    const option = document.createElement("option");
    option.value = tag;
    option.textContent = tag;
    existingTagsDropdown.appendChild(option);
  });
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

// --- Setup Edit Task Form (updated for new structure) ---
function setupEditTaskForm() {
  const editTaskModal = document.getElementById("editTaskModal");
  if (!editTaskModal) return;

  const form = editTaskModal.querySelector("form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

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

    try {
      if (window.currentEditTaskId) {
        // Update existing task
        await updateTask(window.currentEditTaskId, taskData);
        window.currentEditTaskId = null;
      }

      // Close modal and reset form
      const modal = bootstrap.Modal.getInstance(editTaskModal);
      modal.hide();
      form.reset();

      // Reset attachment state
      selectedFiles = [];
      editExistingAttachments = [];
    } catch (error) {
      console.error("Failed to save task:", error);
    }
  });

  // Reset form when modal is hidden
  editTaskModal.addEventListener("hidden.bs.modal", () => {
    form.reset();
    window.currentEditTaskId = null;
    
    // Reset attachment state
    selectedFiles = [];
    editExistingAttachments = [];
    
    // Clear tag container
    const editTagContainer = document.getElementById("editTagContainer");
    if (editTagContainer) {
      editTagContainer.innerHTML = "";
    }
    
    // Clear attachment container
    const editAttachmentContainer = document.getElementById("editAttachmentContainer");
    if (editAttachmentContainer) {
      editAttachmentContainer.innerHTML = "";
    }
  });
}

// --- Update Task Function (copied from dashboard pattern) ---
async function updateTask(taskId, taskData) {
  try {
    const updatedTask = await apiFetch(`/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(taskData),
    });

    console.log("Task updated successfully:", updatedTask);

    // Show success message
    displaySuccessMessage("Task updated successfully!");

    // Refresh tasks to get latest data
    await loadScheduledTasks();

    return updatedTask;
  } catch (error) {
    console.error("Error updating task:", error);
    displayErrorMessage("Failed to update task");
    throw error;
  }
}

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
