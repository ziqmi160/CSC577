// labels.js - Script for labels page with full backend integration

// --- API Configuration ---
const API_BASE_URL = "http://localhost:5000";

// --- Global Variables ---
let allTasks = []; // Store all tasks for filtering
let currentSelectedLabel = null; // Track currently selected label
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
    
    // Update existing tags dropdown
    populateExistingTagsDropdown();
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

    // Check if there are any tasks at all
    if (allTasks.length === 0) {
      // Show simple message for no tasks at all
      labelsGrid.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>
          <h4 class="mt-3 text-muted">No Tasks Yet</h4>
          <p class="text-muted">Create your first task to start organizing with labels.</p>
          <a href="dashboard.html" class="btn btn-primary-accent">
            <i class="bi bi-plus-circle me-2"></i>Create Task
          </a>
        </div>
      `;
      return;
    }

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

  // Add attachments icon and count to card view
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
    cardFooterDiv.appendChild(attachmentsDiv);
  }

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

  // Clear any previous search query when switching labels
  currentSearchQuery = null;
  updateSearchUI();

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

  // Render the filtered tasks
  renderTaskList(filteredTasks, labelName);
}

// --- Render Task List (unified function for both filtering and search results) ---
function renderTaskList(tasks, labelName, isSearchResult = false) {
  // Get the task list container
  const labelTasksList = document.getElementById("labelTasksList");

  // Clear previous tasks
  labelTasksList.innerHTML = "";

  if (tasks.length === 0) {
    // Show appropriate empty state message
    let emptyMessage;
    if (isSearchResult) {
      emptyMessage = `No matching tasks found for "${currentSearchQuery}"`;
    } else if (labelName.toLowerCase() === "unlabeled") {
      emptyMessage = "No unlabeled tasks found";
    } else {
      emptyMessage = `No tasks with the "${labelName}" label`;
    }

    labelTasksList.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>
        <h4 class="mt-3 text-muted">${emptyMessage}</h4>
        <p class="text-muted">${
          isSearchResult
            ? "Try a different search term."
            : "Add a task to see it here."
        }</p>
      </div>
    `;
  } else {
    // Create and display task cards
    tasks.forEach((task) => {
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
    const displayName =
      labelName.toLowerCase() === "unlabeled" ? "Unlabeled" : labelName;
    selectedLabelName.textContent = isSearchResult
      ? `"${currentSearchQuery}" in ${displayName}`
      : displayName;
  }
}

// --- Update Search UI State ---
function updateSearchUI() {
  const searchBar = document.querySelector("#searchBar, .search-bar");
  const clearSearchBtn = document.getElementById("clearSearchBtn");

  if (searchBar) {
    // Update placeholder based on selected label and search options
    if (currentSelectedLabel) {
      const labelDisplay =
        currentSelectedLabel === "unlabeled"
          ? "Unlabeled"
          : currentSelectedLabel;

      // Get current search options
      const useSemantic =
        document.getElementById("semanticSearchCheckbox")?.checked || false;
      const useContains =
        document.getElementById("containsSearchCheckbox")?.checked || false;

      let searchType = "";
      if (useSemantic && useContains) {
        searchType = "semantic & text ";
      } else if (useSemantic) {
        searchType = "semantic ";
      } else if (useContains) {
        searchType = "text ";
      } else {
        searchType = ""; // Default behavior
      }

      searchBar.placeholder = `${searchType}Search within ${labelDisplay} tasks...`;

      // Clear search input if no active search
      if (!currentSearchQuery) {
        searchBar.value = "";
      }
    } else {
      searchBar.placeholder = "Select a label first to enable search";
      searchBar.value = "";
    }
  }

  // Show/hide clear search button
  if (clearSearchBtn) {
    if (currentSearchQuery && currentSelectedLabel) {
      clearSearchBtn.style.display = "inline-block";
    } else {
      clearSearchBtn.style.display = "none";
    }
  }
}

// --- Clear Semantic Search ---
function clearSemanticSearch() {
  console.log("Clearing semantic search, returning to label view");

  // Reset search state
  currentSearchQuery = null;
  updateSearchUI();

  // Return to showing all tasks for the current label
  if (currentSelectedLabel) {
    filterTasksByLabel(currentSelectedLabel);
  }

  // Show success message (consistent with priority and scheduled pages)
  displaySuccessMessage("Search cleared!");
}

// --- Handle Search Bar Input ---
function handleSearchInput(event) {
  // Only process search if a label is currently selected
  if (!currentSelectedLabel) {
    console.log("No label selected, search disabled");
    return;
  }

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
      // Empty query - return to label view
      clearSemanticSearch();
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
    performSearch(query, currentSelectedLabel, useSemantic, useContains);
  }
}

// --- Enhanced Search Function (supports both semantic and contains search) ---
async function performSearch(
  query,
  labelName,
  useSemantic = true,
  useContains = false
) {
  console.log(
    `Performing search for "${query}" within label "${labelName}" - Semantic: ${useSemantic}, Contains: ${useContains}`
  );

  try {
    let searchUrl = "/tasks";
    const params = [];

    // Add search parameters based on selected options
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
    const allResults = await apiFetch(searchUrl);

    console.log(`Search returned ${allResults.length} total results`);

    // Filter results by the selected label (since backend doesn't support label filtering in search)
    let filteredResults;
    if (labelName === "unlabeled") {
      // Filter for tasks that have no labels or empty label array
      filteredResults = allResults.filter((task) => {
        return (
          !task.label || !Array.isArray(task.label) || task.label.length === 0
        );
      });
    } else {
      // Filter for tasks that have the selected label
      filteredResults = allResults.filter((task) => {
        if (!task.label || !Array.isArray(task.label)) return false;
        return task.label.some(
          (label) => label.toLowerCase() === labelName.toLowerCase()
        );
      });
    }

    console.log(
      `Filtered to ${filteredResults.length} results for label "${labelName}"`
    );

    // Store the current search query for UI state
    currentSearchQuery = query;
    updateSearchUI();

    // Render the search results
    renderTaskList(filteredResults, labelName, true);
  } catch (error) {
    console.error("Search failed:", error);
    displayErrorMessage("Search failed. Please try again.");

    // Fall back to showing all tasks for the label
    filterTasksByLabel(labelName);
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

  // Update current selection and clear any previous search
  currentSelectedLabel = labelName;
  currentSearchQuery = null;

  // Update UI elements
  const selectedLabelInfo = document.getElementById("selectedLabelInfo");
  const clearSelectionBtn = document.getElementById("clearSelectionBtn");

  if (selectedLabelInfo) {
    selectedLabelInfo.innerHTML = `<span class="text-primary-accent fw-bold">${labelName}</span> tasks`;
  }

  if (clearSelectionBtn) {
    clearSelectionBtn.classList.remove("d-none");
  }

  // Update search UI for the new label context
  updateSearchUI();

  // Filter and display tasks for the selected label
  filterTasksByLabel(labelName);
}

// --- Clear Selection ---
function clearSelection() {
  console.log("Clearing label selection");

  // Remove active class from all chips
  document.querySelectorAll(".label-chip").forEach((chip) => {
    chip.classList.remove("active");
  });

  // Reset current selection and search state
  currentSelectedLabel = null;
  currentSearchQuery = null;

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

  // Reset search UI
  updateSearchUI();
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

  // Reset file state
  selectedFiles = [];
  editExistingAttachments = task.attachment && Array.isArray(task.attachment) ? [...task.attachment] : [];

  // Populate form with task data
  const form = modal.querySelector("form");
  if (form) {
    form.querySelector("#editTaskTitle").value = task.title || "";
    form.querySelector("#editTaskDescription").value = task.description || "";
    form.querySelector("#editTaskDueDate").value = task.dueDate || "";
    form.querySelector("#editTaskPriority").value = task.priority || "Low";
    
    // Clear existing tags and populate with task tags
    const tagContainer = document.getElementById("editTagContainer");
    if (tagContainer) {
      tagContainer.innerHTML = "";
      if (task.label && Array.isArray(task.label)) {
        task.label.forEach(tag => {
          addTagToContainer(tag, tagContainer, "edit");
        });
      }
    }
    
    // Clear existing attachments and populate with task attachments
    const attachmentContainer = document.getElementById("editAttachmentContainer");
    if (attachmentContainer) {
      renderAttachmentList(attachmentContainer, selectedFiles, editExistingAttachments);
    }
  }

  // Store task ID for update
  modal.dataset.taskId = task._id;
  
  // Populate existing tags dropdown
  populateExistingTagsDropdown();

  // Show the modal
  const bootstrapModal = new bootstrap.Modal(modal);
  bootstrapModal.show();
}

// --- Tag and Attachment Helper Functions ---

// Add tag to container
function addTagToContainer(tagText, container, prefix = "") {
  if (!tagText || !container) return;
  
  const tagElement = document.createElement("span");
  tagElement.className = "badge bg-secondary me-2 mb-2 d-inline-flex align-items-center";
  tagElement.innerHTML = `
    ${tagText}
    <button type="button" class="btn-close btn-close-white ms-2" style="font-size: 0.5rem;" onclick="removeTag(this)"></button>
  `;
  container.appendChild(tagElement);
}

// Remove tag
function removeTag(button) {
  button.closest(".badge").remove();
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Setup file attachment handlers
function setupFileAttachmentHandlers() {
  const fileInput = document.getElementById("editTaskAttachment");
  const attachmentContainer = document.getElementById("editAttachmentContainer");
  
  if (fileInput && attachmentContainer) {
    fileInput.addEventListener("change", function(e) {
      selectedFiles = Array.from(e.target.files);
      renderAttachmentList(attachmentContainer, selectedFiles, editExistingAttachments);
    });
  }
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

// Preview file
function previewFile(fileUrl, fileName) {
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(fileExtension)) {
    showImagePreview(fileUrl, fileName);
  } else if (['mp4', 'webm', 'mp3', 'wav', 'ogg'].includes(fileExtension)) {
    showMediaPreview(fileUrl, fileName, fileExtension);
  } else if (['pdf', 'txt', 'html', 'htm', 'css', 'js', 'json', 'xml', 'csv', 'md'].includes(fileExtension)) {
    showDocumentPreview(fileUrl, fileName);
  } else {
    // Download file
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.click();
  }
}

// Populate existing tags dropdown
function populateExistingTagsDropdown() {
  const existingTagsDropdown = document.getElementById("editExistingTagsDropdown");
  if (!existingTagsDropdown) return;
  
  // Reset dropdown
  existingTagsDropdown.innerHTML = '<option value="">Select existing tag</option>';
  
  // Collect all unique tags from tasks
  const allTags = new Set();
  allTasks.forEach(task => {
    if (task.label && Array.isArray(task.label)) {
      task.label.forEach(tag => {
        if (tag && tag.trim()) {
          allTags.add(tag.trim());
        }
      });
    }
  });
  
  // Add options for each unique tag
  Array.from(allTags).sort().forEach(tag => {
    const option = document.createElement("option");
    option.value = tag;
    option.textContent = tag;
    existingTagsDropdown.appendChild(option);
  });
}

// Add tag from input
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

// Setup tag functionality
function setupTagFunctionality() {
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
}

// Handle edit task submission
async function handleEditTaskSubmission(taskId) {
  try {
    // Get form data
    const title = document.getElementById("editTaskTitle").value.trim();
    const description = document.getElementById("editTaskDescription").value.trim();
    const dueDate = document.getElementById("editTaskDueDate").value;
    const priority = document.getElementById("editTaskPriority").value;
    
    // Get tags from container
    const tagContainer = document.getElementById("editTagContainer");
    const tags = Array.from(tagContainer.querySelectorAll(".badge"))
      .map(tag => tag.textContent.trim())
      .filter(tag => tag);
    
    // Handle file uploads
    let allAttachments = [...editExistingAttachments]; // Start with existing attachments
    
    if (selectedFiles.length > 0) {
      try {
        const uploadedFiles = await uploadFiles(selectedFiles);
        allAttachments = [...allAttachments, ...uploadedFiles];
      } catch (error) {
        console.error("Failed to upload files:", error);
        displayErrorMessage("Failed to upload some files. Please try again.");
        return;
      }
    }

    const updateData = {
      title,
      description,
      dueDate,
      priority,
      label: tags,
      attachment: allAttachments
    };

    // Update task via API
    await apiFetch(`/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(updateData),
    });

    displaySuccessMessage("Task updated successfully!");

    // Hide modal
    const modal = document.getElementById("editTaskModal");
    const bootstrapModal = bootstrap.Modal.getInstance(modal);
    bootstrapModal.hide();

    // Reset file state
    selectedFiles = [];
    editExistingAttachments = [];

    // Reload tasks and refresh display
    await loadAllTasks();
    if (currentSelectedLabel) {
      filterTasksByLabel(currentSelectedLabel);
    }
  } catch (error) {
    console.error("Failed to update task:", error);
    displayErrorMessage("Failed to update task. Please try again.");
  }
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

// --- Initialize Page ---
document.addEventListener("DOMContentLoaded", async function () {
  console.log("Labels page loaded, initializing...");

  // Check authentication
  if (!checkAuth()) {
    return;
  }

  // Display user info
  displayUserInfo();

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

  // Set up semantic search functionality
  const searchBar = document.querySelector("#searchBar, .search-bar");
  const searchButton = document.querySelector(
    ".btn-primary-accent[type='button']"
  );

  if (searchBar) {
    // Handle Enter key press for search
    searchBar.addEventListener("keypress", handleSearchInput);

    // Update placeholder initially
    updateSearchUI();
  }

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
      if (currentSearchQuery && currentSelectedLabel) {
        const useSemantic = this.checked;
        const useContains = containsCheckbox?.checked || false;
        performSearch(
          currentSearchQuery,
          currentSelectedLabel,
          useSemantic,
          useContains
        );
      }
    });
  }

  if (containsCheckbox) {
    containsCheckbox.addEventListener("change", function () {
      // If current search exists, re-run it with new options
      if (currentSearchQuery && currentSelectedLabel) {
        const useSemantic = semanticCheckbox?.checked || false;
        const useContains = this.checked;
        performSearch(
          currentSearchQuery,
          currentSelectedLabel,
          useSemantic,
          useContains
        );
      }
    });
  }

  // Set up clear search button event listener
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", clearSemanticSearch);
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

  // Set up form submission for new edit form
  const editTaskForm = document.getElementById("editTaskForm");
  if (editTaskForm) {
    editTaskForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      const modal = document.getElementById("editTaskModal");
      const taskId = modal.dataset.taskId;

      if (!taskId) {
        displayErrorMessage("Task ID not found");
        return;
      }

      await handleEditTaskSubmission(taskId);
    });
  }

  // Setup tag functionality
  setupTagFunctionality();

  setupLogoutHandler();

  console.log("Labels page initialization complete");
});

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

function handleLogout() {
  console.log("handleLogout called!");
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}
