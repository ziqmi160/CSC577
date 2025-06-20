// // index.js - Updated to connect with Node.js backend

// // --- API Configuration ---
// // IMPORTANT: Make sure this matches the PORT you set in your backend's .env file (e.g., 5000)
// const API_BASE_URL = 'http://localhost:5000';

// // --- Creating instances of document objects ---
// const taskList = document.getElementById("taskList");
// const dueDateInput = document.getElementById("dueDate");
// const priorityInput = document.getElementById("priority");
// const submitBtn = document.getElementById("submitBtn");
// const editTaskBtn = document.getElementById("editTask");
// const tasksHeading = document.getElementById("heading-tasks");
// const searchBar = document.getElementById("searchBar");
// const modeToggleBtn = document.getElementById("modeToggle");
// // Note: checkboxes are now handled dynamically as tasks are loaded
// let editItem = null;
// // tasksWithPriority and tasksTitleArray are no longer needed as data is managed by backend

// const priorityColors = {
//   High: "task-priority-High",
//   Medium: "task-priority-Medium",
//   Low: "task-priority-Low",
//   // 'Completed' is a state, not a priority for coloring, handled by a separate class
// };

// const priorityValues = {
//   High: 3,
//   Medium: 2,
//   Low: 1,
// };

// // --- Helper function for API requests ---
// // This simplified version does not handle JWT tokens, as the current backend doesn't require it for tasks.
// // If you add user authentication to your backend later, you'd re-introduce token management here.
// async function apiFetch(endpoint, options = {}) {
//   try {
//     const token = localStorage.getItem('token');
//     const headers = {
//       'Content-Type': 'application/json',
//       ...options.headers,
//     };
//     if (token) {
//       headers['Authorization'] = 'Bearer ' + token;
//     }
//     const response = await fetch(`${API_BASE_URL}${endpoint}`, {
//       headers,
//       ...options,
//     });

//     // Check for network errors or non-OK responses
//     if (!response.ok) {
//       const errorData = await response.json();
//       throw new Error(errorData.message || `API error: ${response.statusText}`);
//     }

//     // Return JSON data if successful
//     return await response.json();
//   } catch (error) {
//     console.error('API Request Error:', error);
//     displayErrorMessage(`Network or API error: ${error.message}`);
//     throw error; // Re-throw to allow calling functions to catch
//   }
// }

// // --- Event Listeners ---
// editTaskBtn.addEventListener("click", (e) => {
//   handleEditClick(e);
// });
// submitBtn.addEventListener("click", (e) => {
//   addItem(e);
// });
// taskList.addEventListener("click", handleItemClick);
// modeToggleBtn.addEventListener("click", toggleMode);

// // flatpickr initialization
// flatpickr(dueDateInput, {
//   enableTime: false,
//   dateFormat: "Y-m-d",
// });

// // --- Initialization ---
// function init() {
//   const searchBar = document.getElementById("searchBar");
//   searchBar.addEventListener("input", handleSearch);
//   loadTasksFromAPI(); // Load tasks from API instead of Local Storage
//   tasksCheck(); // Check initial UI state
//   themeSwitcher(); // Apply initial theme
// }

// // --- Search Logic ---
// function handleSearch() {
//   const searchTerm = searchBar.value.trim(); // Trim whitespace
//   // Fetch tasks from API, passing the search term as a query parameter
//   // The backend will filter based on the 'title' parameter
//   loadTasksFromAPI(searchTerm ? `/tasks?title=${encodeURIComponent(searchTerm)}` : '/tasks');
// }

// // --- UI State Check (hide/show elements based on task count) ---
// function tasksCheck() {
//   const tasks = taskList.children;
//   if (tasks.length === 0) {
//     tasksHeading.classList.add("hidden");
//     searchBar.classList.add("hidden");
//     document.querySelector(".clear_btn").style.display = "none";
//     document.querySelector(".dropdown").style.display = "none";
//   } else {
//     tasksHeading.classList.remove("hidden");
//     searchBar.classList.remove("hidden");
//     document.querySelector(".clear_btn").style.display = "inline";
//     document.querySelector(".dropdown").style.display = "inline";
//   }
// }

// // --- Populate edit form with task data ---
// function handleEditItem(e) {
//   e.preventDefault();
//   editTaskBtn.style.display = "inline";
//   submitBtn.style.display = "none";

//   const listItem = e.target.closest('li'); // Get the parent <li> element
//   if (!listItem) return;

//   // Extract data from the list item
//   const taskTitle = listItem.childNodes[1].textContent.trim();
//   const taskDescriptionElement = listItem.querySelector("#description-at");
//   const taskDescription = taskDescriptionElement ? taskDescriptionElement.textContent.replace("Description:", "").trim() : "";
//   const taskDueDate = listItem.querySelector("#task-dueDate").textContent.replace("Due Date:", "").trim();
//   const taskPriority = listItem.querySelector("#task-priority").textContent.trim();

//   // Populate form fields
//   document.getElementById("item").value = taskTitle;
//   document.getElementById("description").value = taskDescription;
//   document.getElementById("dueDate").value = taskDueDate;
//   document.getElementById("priority").value = taskPriority; // Set priority dropdown

//   document.getElementById("maintitle").innerText = "Edit your tasks below :";
//   editItem = listItem; // Store the actual list item for later use in handleEditClick
//   document.documentElement.scrollTop = 0;
//   document.getElementById("item").focus();
// }

// // --- Handle Task Edit (PATCH API call) ---
// async function handleEditClick(e) {
//   e.preventDefault();
//   const itemInput = document.getElementById("item");
//   const dueDateInput = document.getElementById("dueDate");
//   const descriptionInput = document.getElementById("description");
//   const editedItemText = itemInput.value.trim();
//   const editedDescriptionText = descriptionInput.value.trim();
//   const editedDueDate = dueDateInput.value; // Keep as string for API
//   const currentDate = new Date().toISOString().split("T")[0];
//   const editedPriority = document.getElementById("priority").value;

//   // Basic validation
//   if (!editedItemText) {
//     displayErrorMessage("Task title must not be empty.");
//     return;
//   }
//   if (!editedDueDate) {
//     displayErrorMessage("Please specify a due date.");
//     return;
//   }
//   if (new Date(editedDueDate) < new Date(currentDate)) {
//     displayErrorMessage("Due date has already passed !!!");
//     return;
//   }
//   if (!editedPriority) {
//     displayErrorMessage("Please select priority");
//     return;
//   }

//   const taskId = editItem.dataset.taskId; // Get the task ID from the stored list item
//   if (!taskId) {
//     displayErrorMessage("Error: Task ID not found for editing.");
//     return;
//   }

//   try {
//     const updatedTaskData = {
//       title: editedItemText,
//       description: editedDescriptionText,
//       dueDate: editedDueDate,
//       priority: editedPriority,
//     };

//     await apiFetch(`/tasks/${taskId}`, {
//       method: 'PATCH',
//       body: JSON.stringify(updatedTaskData)
//     });

//     displaySuccessMessage("Task edited successfully !!!");
//     // Reset form and UI
//     itemInput.value = "";
//     descriptionInput.value = "";
//     dueDateInput.value = "";
//     document.getElementById("priority").value = ""; // Clear priority dropdown
//     document.getElementById("maintitle").innerText = "Add your tasks below :";
//     editTaskBtn.style.display = "none";
//     submitBtn.style.display = "inline";

//     loadTasksFromAPI(); // Reload tasks to reflect changes
//   } catch (error) {
//     // Error message handled by apiFetch, but you can add more specific handling here if needed
//     console.error("Failed to edit task:", error);
//   }
// }

// // --- Voice Command Logic ---
// document.addEventListener("DOMContentLoaded", function () {
//   const recognition = new (window.SpeechRecognition ||
//     window.webkitSpeechRecognition)();
//   recognition.lang = "en-US";
//   recognition.interimResults = false;

//   let isListening = false;
//   const voiceCommandButton = document.getElementById("voice-command-button");
//   if (voiceCommandButton) { // Check if button exists
//     voiceCommandButton.addEventListener("click", function () {
//       if (isListening) {
//         recognition.stop();
//         isListening = false;
//         voiceCommandButton.innerHTML = '<i class="fas fa-microphone"></i>';
//       } else {
//         recognition.start();
//         isListening = true;
//         voiceCommandButton.innerHTML = '<i class="fas fa-microphone-slash"></i>';
//       }
//     });
//   }

//   recognition.onresult = function (event) {
//     const transcript = event.results[0][0].transcript;
//     handleVoiceCommand(transcript);
//   };

//   recognition.onend = function () {
//     isListening = false;
//     if (voiceCommandButton) {
//       voiceCommandButton.innerHTML = '<i class="fas fa-microphone"></i>';
//     }
//   };

//   async function handleVoiceCommand(command) {
//     console.log("Recognized Command:", command);
//     const commandParts = command.toLowerCase().split(" ");

//     // Helper to extract value from command parts
//     const getCommandValue = (parts, keyword, nextKeyword) => {
//         const keywordIndex = parts.indexOf(keyword);
//         if (keywordIndex === -1) return null;
//         const nextKeywordIndex = nextKeyword ? parts.indexOf(nextKeyword, keywordIndex + 1) : -1;
//         if (nextKeyword && nextKeywordIndex === -1) return null;

//         const start = keywordIndex + 1;
//         const end = nextKeyword ? nextKeywordIndex : parts.length;
//         return parts.slice(start, end).join(" ").trim();
//     };

//     if (commandParts.includes("add") && commandParts.includes("task")) {
//         // Example: "add task buy groceries due date 2025-12-25 priority high description remember milk"
//         const taskTitle = getCommandValue(commandParts, "task", "due");
//         const dueDate = getCommandValue(commandParts, "date", "priority");
//         const priority = getCommandValue(commandParts, "priority", "description");
//         const description = getCommandValue(commandParts, "description", null);


//         if (taskTitle && dueDate && priority) {
//             // Re-use the addItem logic after setting form fields
//             document.getElementById("item").value = taskTitle;
//             document.getElementById("dueDate").value = dueDate;
//             document.getElementById("priority").value = priority.charAt(0).toUpperCase() + priority.slice(1);
//             document.getElementById("description").value = description || '';

//             // Call addItem directly or trigger submit button click
//             await addItem(new Event('click')); // Pass a dummy event object
//             // Clear form fields after adding
//             document.getElementById("item").value = '';
//             document.getElementById("dueDate").value = '';
//             document.getElementById("priority").value = '';
//             document.getElementById("description").value = '';
//         } else {
//             displayErrorMessage("Invalid 'add task' command format. Try: 'add task [title] due date [YYYY-MM-DD] priority [high/medium/low] description [optional description]'");
//         }
//     } else if (commandParts.includes("edit") && commandParts.includes("task")) {
//         // Example: "edit task buy groceries to buy bread due date 2025-12-30 priority medium"
//         const oldTitle = getCommandValue(commandParts, "task", "to");
//         const newTitle = getCommandValue(commandParts, "to", "due");
//         const newDueDate = getCommandValue(commandParts, "date", "priority");
//         const newPriority = getCommandValue(commandParts, "priority", "description");
//         const newDescription = getCommandValue(commandParts, "description", null);

//         if (oldTitle && newTitle && newDueDate && newPriority) {
//             // Find the task by old title to get its ID
//             const tasks = Array.from(taskList.children);
//             const taskElementToEdit = tasks.find(task => task.childNodes[1].textContent.trim().toLowerCase() === oldTitle);

//             if (taskElementToEdit) {
//                 // Populate form and trigger edit click
//                 document.getElementById("item").value = newTitle;
//                 document.getElementById("dueDate").value = newDueDate;
//                 document.getElementById("priority").value = newPriority.charAt(0).toUpperCase() + newPriority.slice(1);
//                 document.getElementById("description").value = newDescription || '';
//                 editItem = taskElementToEdit; // Set the global editItem to the found li element

//                 await handleEditClick(new Event('click'));
//                 // Clear form fields after editing
//                 document.getElementById("item").value = '';
//                 document.getElementById("dueDate").value = '';
//                 document.getElementById("priority").value = '';
//                 document.getElementById("description").value = '';
//             } else {
//                 displayErrorMessage(`Task "${oldTitle}" not found for editing.`);
//             }
//         } else {
//             displayErrorMessage("Invalid 'edit task' command format. Try: 'edit task [old title] to [new title] due date [YYYY-MM-DD] priority [high/medium/low] description [optional description]'");
//         }
//     } else if (commandParts.includes("delete") && commandParts.includes("task")) {
//         const taskTitleToDelete = getCommandValue(commandParts, "task", null);
//         if (taskTitleToDelete) {
//             const tasks = Array.from(taskList.children);
//             const taskElementToDelete = tasks.find(task => task.childNodes[1].textContent.trim().toLowerCase() === taskTitleToDelete);

//             if (taskElementToDelete) {
//                 // Simulate a click on the delete button to trigger the confirmation flow
//                 const deleteButton = taskElementToDelete.querySelector('.delete');
//                 if (deleteButton) {
//                     deleteButton.click();
//                     // User will need to confirm via the UI dialog
//                 } else {
//                     displayErrorMessage("Delete button not found for this task.");
//                 }
//             } else {
//                 displayErrorMessage(`Task "${taskTitleToDelete}" not found for deletion.`);
//             }
//         } else {
//             displayErrorMessage("Invalid 'delete task' command format. Try: 'delete task [title]'");
//         }
//     } else {
//         displayErrorMessage("Voice command not recognized. Try 'add task', 'edit task', or 'delete task'.");
//     }
//   }
// });

// // --- API-driven Add Task Function (called by addItem and voice command) ---
// async function addTaskToAPI(taskData) {
//   try {
//     const newTask = await apiFetch('/tasks', {
//       method: 'POST',
//       body: JSON.stringify(taskData)
//     });
//     displaySuccessMessage("Task added successfully!");
//     loadTasksFromAPI(); // Reload tasks to show the new one
//     // Clear form fields after successful add
//     document.getElementById("item").value = "";
//     document.getElementById("dueDate").value = "";
//     document.getElementById("description").value = "";
//     document.getElementById("priority").value = "";
//   } catch (error) {
//     // Check if the error is due to a duplicate task title from backend (status 409)
//     if (error.message.includes('Task with this title already exists.')) {
//         showComfirmboxForDuplicateTasks(); // Use existing confirmation box for duplicates
//     } else {
//         // Error message already displayed by apiFetch
//         console.error("Error adding task:", error);
//     }
//   }
// }

// // --- Add Item (Manual Form Submission) ---
// async function addItem(e) {
//   e.preventDefault();
//   const newTaskTitle = document.getElementById("item").value.trim();
//   const description = document.getElementById("description").value.trim();
//   const dueDate = document.getElementById("dueDate").value;
//   const priority = document.getElementById("priority").value;

//   const currentDate = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format

//   // Form validation
//   if (!newTaskTitle) {
//     displayErrorMessage("Task title cannot be empty!");
//     return;
//   }
//   if (!dueDate) {
//     displayErrorMessage("Please specify a due date!");
//     return;
//   }
//   if (new Date(dueDate) < new Date(currentDate)) { // Compare as Date objects
//     displayErrorMessage("Due date has already passed!");
//     return;
//   }
//   if (!priority) {
//     displayErrorMessage("Please select priority!");
//     return;
//   }

//   const taskData = {
//     title: newTaskTitle,
//     description: description,
//     dueDate: dueDate,
//     priority: priority,
//     completed: false // Always false initially
//   };

//   await addTaskToAPI(taskData);
// }

// // --- Handle Item Click (Delete and Mark Complete) ---
// async function handleItemClick(e) {
//   // Handle Delete button click
//   if (e.target.classList.contains("delete") || e.target.closest('.delete')) {
//     e.preventDefault();
//     const li = e.target.closest('li');
//     const taskId = li.dataset.taskId;

//     if (!taskId) {
//       displayErrorMessage("Error: Task ID not found for deletion.");
//       return;
//     }

//     const confirmationBox = document.getElementById("custom-confirm");
//     const delalert_title = document.getElementById("confirm-msg");
//     delalert_title.innerHTML = "&#9888; Are you sure you want to delete this task?";
//     delalert_title.className = "alert alert-danger";
//     delalert_title.role = "alert";

//     const confirmYesButton = document.getElementById("confirm-yes");
//     const confirmNoButton = document.getElementById("confirm-no");
//     const confirmCancelButton = document.getElementById("confirm-cancel");

//     // Remove previous listeners to prevent multiple executions
//     const cloneYes = confirmYesButton.cloneNode(true);
//     confirmYesButton.parentNode.replaceChild(cloneYes, confirmYesButton);
//     const cloneNo = confirmNoButton.cloneNode(true);
//     confirmNoButton.parentNode.replaceChild(cloneNo, confirmNoButton);
//     const cloneCancel = confirmCancelButton.cloneNode(true);
//     confirmCancelButton.parentNode.replaceChild(cloneCancel, confirmCancelButton);

//     const handleYesClick = async () => {
//       confirmationBox.style.display = "none";
//       try {
//         await apiFetch(`/tasks/${taskId}`, { method: 'DELETE' });
//         displaySuccessMessage("Task deleted successfully !!!");
//         loadTasksFromAPI(); // Reload tasks to update the list
//       } catch (error) {
//         console.error("Failed to delete task:", error);
//       }
//     };

//     const handleNoClick = () => {
//       confirmationBox.style.display = "none";
//     };

//     const handleCancelClick = () => {
//       confirmationBox.style.display = "none";
//     };

//     cloneYes.addEventListener("click", handleYesClick);
//     cloneNo.addEventListener("click", handleNoClick);
//     cloneCancel.addEventListener("click", handleCancelClick);

//     confirmationBox.style.display = "flex";
//   }

//   // Handle Mark as Complete checkbox click
//   if (e.target.classList.contains("task-completed-checkbox")) { // Use the new class
//     const li = e.target.closest('li');
//     const taskId = li.dataset.taskId;
//     const isCompleted = e.target.checked;
//     const editButton = li.querySelector(".edit");

//     if (!taskId) {
//       displayErrorMessage("Error: Task ID not found for status update.");
//       e.target.checked = !isCompleted; // Revert checkbox if ID is missing
//       return;
//     }

//     try {
//       await apiFetch(`/tasks/${taskId}`, {
//         method: 'PATCH',
//         body: JSON.stringify({ completed: isCompleted })
//       });

//       displaySuccessMessage(`Task marked as ${isCompleted ? 'completed' : 'incomplete'}!`);
//       // Update local UI immediately without full reload for responsiveness
//       if (isCompleted) {
//         li.classList.add("task-completed");
//         if (editButton) editButton.style.display = 'none';
//       } else {
//         li.classList.remove("task-completed");
//         // Re-apply original priority class if available, or just remove 'task-completed'
//         const currentPriority = li.querySelector("#task-priority").textContent.trim();
//         li.classList.add(priorityColors[currentPriority] || '');
//         if (editButton) editButton.style.display = 'block';
//       }
//     } catch (error) {
//       e.target.checked = !isCompleted; // Revert checkbox on API error
//       console.error("Failed to update task status:", error);
//     }
//   }
// }

// // --- Message Box Functions ---
// function displaySuccessMessage(message) {
//   const lblSuccess = document.getElementById("lblsuccess");
//   if (lblSuccess) {
//     lblSuccess.innerHTML = message;
//     lblSuccess.style.display = "block";
//     setTimeout(function () {
//       lblSuccess.style.display = "none";
//     }, 3000);
//   }
// }

// function displayErrorMessage(message) {
//   const lblError = document.getElementById("lblerror");
//   if (lblError) {
//     lblError.innerHTML = message;
//     lblError.style.display = "block";
//     setTimeout(function () {
//       lblError.style.display = "none";
//     }, 3000);
//   }
// }

// // --- Load Tasks from API ---
// async function loadTasksFromAPI(endpoint = '/tasks') {
//   try {
//     const tasks = await apiFetch(endpoint);

//     // Clear current tasks from the DOM
//     while (taskList.firstChild) {
//       taskList.removeChild(taskList.firstChild);
//     }

//     if (tasks.length > 0) {
//       tasks.forEach((task) => {
//         displayTaskInDOM(task); // Render each task from API
//       });
//     }
//     tasksCheck(); // Update UI visibility based on loaded tasks
//   } catch (error) {
//     console.error('Error loading tasks from API:', error);
//     // Error message already displayed by apiFetch
//     tasksCheck(); // Ensure UI is updated even if tasks fail to load
//   }
// }

// // --- Display a single task in DOM (from API data) ---
// function displayTaskInDOM(task) {
//   const li = document.createElement("li");
//   // Apply 'task-completed' class if the task is completed
//   const isCompleted = task.completed;
//   const priorityClass = task.completed ? "task-completed" : (priorityColors[task.priority] || '');

//   li.className = `list-group-item card shadow mb-4 bg-transparent ${priorityClass}`;
//   li.dataset.taskId = task._id; // Store the backend task ID for CRUD operations

//   const completeCheckbox = document.createElement("input");
//   completeCheckbox.type = "checkbox";
//   completeCheckbox.className = "form-check-input task-completed-checkbox"; // Specific class for this checkbox
//   completeCheckbox.checked = isCompleted;
//   completeCheckbox.addEventListener("change", handleItemClick); // Use handleItemClick for consistency

//   const deleteButton = document.createElement("button");
//   deleteButton.type = "button";
//   deleteButton.className = "btn btn-outline-danger float-right delete";
//   deleteButton.innerHTML =
//     '<ion-icon name="trash-outline" style="font-size: 20px"></ion-icon>';
//   deleteButton.style.paddingTop = "10px";
//   deleteButton.style.PaddingRight = "10px";

//   const editButton = document.createElement("button");
//   editButton.className = "btn btn-outline-secondary btn-sm float-right edit";
//   editButton.innerHTML =
//     '<ion-icon name="create-outline" style="font-size: 20px"></ion-icon>';
//   editButton.style.marginRight = "8px";
//   editButton.style.paddingTop = "10px";
//   editButton.style.PaddingRight = "10px";
//   editButton.addEventListener("click", handleEditItem);
//   if (isCompleted) { // Hide edit button if task is completed
//     editButton.style.display = 'none';
//   }

//   const descriptionParagraph = document.createElement("p");
//   if (task.description && task.description.trim() !== "") { // Use task.description from API
//     descriptionParagraph.className = "text-muted";
//     descriptionParagraph.id = "description-at";
//     descriptionParagraph.style.fontSize = "15px";
//     descriptionParagraph.style.margin = "0 19px";
//     descriptionParagraph.appendChild(
//       document.createTextNode("Description: " + task.description)
//     );
//   }

//   const dateTimeParagraph = document.createElement("p");
//   dateTimeParagraph.className = "text-muted";
//   dateTimeParagraph.id = "created-at";
//   dateTimeParagraph.style.fontSize = "15px";
//   dateTimeParagraph.style.margin = "0 19px";
//   dateTimeParagraph.appendChild(
//     document.createTextNode("Created: " + new Date(task.createdAt).toLocaleString())
//   );

//   const dueDateParagraph = document.createElement("p");
//   dueDateParagraph.className = "text-muted";
//   dueDateParagraph.id = "task-dueDate";
//   dueDateParagraph.style.fontSize = "15px";
//   dueDateParagraph.style.margin = "0 19px";
//   dueDateParagraph.appendChild(document.createTextNode("Due Date: " + task.dueDate));

//   const priorityParagraph = document.createElement("p");
//   priorityParagraph.className = "text-muted";
//   priorityParagraph.id = "task-priority";
//   priorityParagraph.style.fontSize = "15px";
//   priorityParagraph.style.margin = "0 19px";
//   priorityParagraph.appendChild(document.createTextNode(task.priority));

//   li.appendChild(completeCheckbox);
//   li.appendChild(document.createTextNode(task.title)); // Use task.title from API
//   li.appendChild(deleteButton);
//   li.appendChild(editButton);
//   if (task.description && task.description.trim() !== "") {
//     li.appendChild(descriptionParagraph);
//   }
//   li.appendChild(dateTimeParagraph);
//   li.appendChild(dueDateParagraph);
//   li.appendChild(priorityParagraph);

//   taskList.appendChild(li);
// }

// // Function to enable submit button (kept for existing UI elements if needed)
// function enableSubmit(ref, btnID) {
//   document.getElementById(btnID).disabled = false;
// }

// // --- Theme Toggling ---
// function toggleMode() {
//   document.body.classList.toggle("dark-mode");
//   document.body.classList.toggle("light-mode");
//   if (modeToggleBtn.checked === true) {
//     localStorage.setItem("dark-mode", "enabled");
//   } else {
//     localStorage.setItem("dark-mode", null);
//   }
// }

// // --- Clear All Tasks (API Call) ---
// async function clearAllTasks() {
//   const taskList = document.getElementById("taskList");
//   const confirmationBoxAll = document.getElementById("custom-confirm-all");
//   const alertTitle = document.getElementById("confirm-msg-all");
//   const confirmYesButtonAll = document.getElementById("confirm-yes-all");
//   const confirmNoButtonAll = document.getElementById("confirm-no-all");
//   const confirmCancelButtonAll = document.getElementById("confirm-cancel-all");

//   if (taskList.children.length === 0) {
//     displayErrorMessage("No tasks to clear!");
//     return;
//   }

//   alertTitle.innerHTML = "&#9888; Are you sure you want to delete all tasks?";
//   alertTitle.className = "alert alert-danger";
//   alertTitle.role = "alert";

//   // Remove previous listeners to prevent multiple executions
//   const cloneYesAll = confirmYesButtonAll.cloneNode(true);
//   confirmYesButtonAll.parentNode.replaceChild(cloneYesAll, confirmYesButtonAll);
//   const cloneNoAll = confirmNoButtonAll.cloneNode(true);
//   confirmNoButtonAll.parentNode.replaceChild(cloneNoAll, confirmNoButtonAll);
//   const cloneCancelAll = confirmCancelButtonAll.cloneNode(true);
//   confirmCancelButtonAll.parentNode.replaceChild(cloneCancelAll, confirmCancelButtonAll);

//   const handleYesClickAll = async () => {
//     confirmationBoxAll.style.display = "none";
//     try {
//       await apiFetch('/tasks', { method: 'DELETE' }); // Call backend to delete all
//       displaySuccessMessage("All tasks deleted successfully!");
//       loadTasksFromAPI(); // Reload to show empty list
//     } catch (error) {
//       console.error("Failed to clear all tasks:", error);
//     }
//   };

//   const handleNoClickAll = () => {
//     confirmationBoxAll.style.display = "none";
//   };

//   const handleCancelClickAll = () => {
//     confirmationBoxAll.style.display = "none";
//   };

//   cloneYesAll.addEventListener("click", handleYesClickAll);
//   cloneNoAll.addEventListener("click", handleNoClickAll);
//   cloneCancelAll.addEventListener("click", handleCancelClickAll);

//   confirmationBoxAll.style.display = "flex";
// }

// // --- Sort Task List by Due Date (API Call) ---
// async function sortByDueDate(order) {
//   let sortParam = '';
//   if (order === "early") {
//     sortParam = 'dueDate:asc';
//   } else if (order === "late") {
//     sortParam = 'dueDate:desc';
//   }
//   await loadTasksFromAPI(`/tasks?sortBy=${sortParam}`);
//   displaySuccessMessage(`Tasks sorted by due date (${order}).`);
// }

// // --- Sort Task List by Priority (API Call) ---
// async function sortByPriority(order) {
//   let sortParam = '';
//   if (order === "highToLow") {
//     sortParam = 'priority:desc'; // Assuming your backend sorts 'High', 'Medium', 'Low' correctly
//   } else if (order === "lowToHigh") {
//     sortParam = 'priority:asc';
//   }
//   await loadTasksFromAPI(`/tasks?sortBy=${sortParam}`);
//   displaySuccessMessage(`Tasks sorted by priority (${order}).`);
// }

// // --- Dropdown Menu Logic ---
// function myFunction() {
//   document.getElementById("myDropdown").classList.toggle("show");
// }

// window.onclick = function (event) {
//   if (!event.target.matches(".dropbtn")) {
//     var dropdowns = document.getElementsByClassName("dropdown-content");
//     for (var i = 0; i < dropdowns.length; i++) {
//       var openDropdown = dropdowns[i];
//       if (openDropdown.classList.contains("show")) {
//         openDropdown.classList.remove("show");
//       }
//     }
//   }
// };

// // --- Preloader and Header Typing Effect (existing code) ---
// document.addEventListener("DOMContentLoaded", function () {
//   setTimeout(function () {
//     const preloader = document.querySelector(".preloader");
//     if (preloader) {
//       preloader.style.display = "none";
//     }
//   }, 2000);

//   const headerText = "To-Do List Application";
//   const headerElement = document.getElementById("todo-header");

//   function typeText(text, index) {
//     if (headerElement) { // Check if element exists
//       headerElement.textContent = text.slice(0, index);
//     }

//     if (index < text.length) {
//       setTimeout(function () {
//         typeText(text, index + 1);
//       }, 50);
//     }
//   }

//   typeText(headerText, 0);

//   // Initialize the app after DOM is loaded and preloader is handled
//   init();
// });

// // --- Theme Switcher (existing code, uses localStorage) ---
// function themeSwitcher() {
//   const modeToggleBtn = document.getElementById("modeToggle");
//   if (!modeToggleBtn) return; // Exit if button not found

//   if (localStorage.length === 0 || localStorage.getItem("dark-mode") === null) {
//     const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
//     if (prefersDarkScheme.matches) {
//       document.body.classList.add("dark-mode"); // Add, not toggle for initial setup
//       localStorage.setItem("dark-mode", "enabled");
//       modeToggleBtn.checked = true;
//     } else {
//       document.body.classList.add("light-mode"); // Add, not toggle
//       localStorage.setItem("dark-mode", null);
//     }
//   } else {
//     if (localStorage.getItem("dark-mode") === "enabled") {
//       document.body.classList.add("dark-mode");
//       modeToggleBtn.checked = true;
//     } else {
//       document.body.classList.add("light-mode");
//     }
//   }
// }
// // Initial call to set theme, now moved inside DOMContentLoaded

// // --- Removed/Redundant Functions due to API Integration ---

// // displayTaskDetails - kept for logging purposes, but not affecting data state
// function displayTaskDetails(taskElement) {
//   if (taskElement) {
//     const dueDateElement = taskElement.querySelector("#task-dueDate");
//     const priorityElement = taskElement.querySelector("#task-priority");
//     const dueDate = dueDateElement
//       ? dueDateElement.textContent.split(":")[1].trim()
//       : null;
//     const priority = priorityElement
//       ? priorityElement.textContent.trim()
//       : null;
//     console.log(`Task Details - Due Date: ${dueDate}, Priority: ${priority}`);
//   }
// }

// // showComfirmboxForDuplicateTasks - adapted to be called when API returns duplicate error
// function showComfirmboxForDuplicateTasks() {
//   const confirmationBox = document.getElementById("duplicate-task");

//   //display confirmation message
//   const delalert_title = document.getElementById("duplicate-msg");
//   delalert_title.innerHTML = "&#9888; This task is already present";
//   delalert_title.className = "alert alert-danger";
//   delalert_title.role = "alert";

//   const confirmYesButton = document.getElementById("duplicate-ok");
//   const confirmCancelButton = document.getElementById("duplicate-cancel");

//   // Remove previous listeners to prevent multiple executions
//   const cloneYes = confirmYesButton.cloneNode(true);
//   confirmYesButton.parentNode.replaceChild(cloneYes, confirmYesButton);
//   const cloneCancel = confirmCancelButton.cloneNode(true);
//   confirmCancelButton.parentNode.replaceChild(cloneCancel, confirmCancelButton);

//   //conform message controls click logic
//   const handleYesClick = () => {
//     confirmationBox.style.display = "none";
//   };

//   const handleCancelClick = () => {
//     confirmationBox.style.display = "none";
//   };

//   cloneYes.addEventListener("click", handleYesClick);
//   cloneCancel.addEventListener("click", handleCancelClick);

//   confirmationBox.style.display = "flex";
// }

// // Original Voice Command `deleteTask` and `editTask` functions are replaced by calls to their API-driven counterparts.
// // Original `addTask` function (for voice commands) is replaced by `addTaskToAPI`.
// // `checkForDuplicateTasks` is removed as backend handles it.
// // `saveTasksToLocalStorage`, `extractTasksData`, `createTaskObject`, `storeTasksInLocalStorage`, `getTasksFromLocalStorage`, `loadTasksFromLocalStorage` (the original one), `displayTask` (the original one) are all removed as they are no longer needed.

// index.js - Updated to connect with Node.js backend and semantic search

// --- API Configuration ---
// IMPORTANT: Make sure this matches the PORT you set in your backend's .env file (e.g., 5000)
const API_BASE_URL = 'http://localhost:5000';

// --- Creating instances of document objects ---
const taskList = document.getElementById("taskList");
const dueDateInput = document.getElementById("dueDate");
const priorityInput = document.getElementById("priority");
const submitBtn = document.getElementById("submitBtn");
const editTaskBtn = document.getElementById("editTask");
const tasksHeading = document.getElementById("heading-tasks");
// Changed searchBar reference to the new ID
const searchBar = document.getElementById("searchBar"); // This is the search bar inside taskActions
const modeToggleBtn = document.getElementById("modeToggle");
// Note: checkboxes are now handled dynamically as tasks are loaded
let editItem = null;
// tasksWithPriority and tasksTitleArray are no longer needed as data is managed by backend

const priorityColors = {
  High: "task-priority-High",
  Medium: "task-priority-Medium",
  Low: "task-priority-Low",
  // 'Completed' is a state, not a priority for coloring, handled by a separate class
};

const priorityValues = {
  High: 3,
  Medium: 2,
  Low: 1,
};

// --- Helper function for API requests ---
// This simplified version does not handle JWT tokens, as the current backend doesn't require it for tasks.
// If you add user authentication to your backend later, you'd re-introduce token management here.
async function apiFetch(endpoint, options = {}) {
  try {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers,
      ...options,
    });

    // Check for network errors or non-OK responses
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `API error: ${response.statusText}`);
    }

    // Return JSON data if successful
    return await response.json();
  } catch (error) {
    console.error('API Request Error:', error);
    displayErrorMessage(`Network or API error: ${error.message}`);
    throw error; // Re-throw to allow calling functions to catch
  }
}

// --- Event Listeners ---
editTaskBtn.addEventListener("click", (e) => {
  handleEditClick(e);
});
submitBtn.addEventListener("click", (e) => {
  addItem(e);
});
taskList.addEventListener("click", handleItemClick);
modeToggleBtn.addEventListener("click", toggleMode);

// flatpickr initialization
flatpickr(dueDateInput, {
  enableTime: false,
  dateFormat: "Y-m-d",
});

// --- Initialization ---
function init() {
  const searchBarElement = document.getElementById("searchBar");
  if (searchBarElement) {
    searchBarElement.addEventListener("input", handleSearch);
  }

  // NEW: Add event listeners to the new checkboxes
  const semanticCheckbox = document.getElementById('semanticSearchCheckbox');
  const containsCheckbox = document.getElementById('containsSearchCheckbox');

  if (semanticCheckbox) {
      semanticCheckbox.addEventListener('change', handleSearch);
  }
  if (containsCheckbox) {
      containsCheckbox.addEventListener('change', handleSearch);
  }

  loadTasksFromAPI(); // Load tasks from API instead of Local Storage
  themeSwitcher(); // Apply initial theme
}

// --- Search Logic ---
function handleSearch() {
  const searchTerm = searchBar.value.trim();
  const useSemantic = document.getElementById('semanticSearchCheckbox').checked;
  const useContains = document.getElementById('containsSearchCheckbox').checked;

  let endpoint = '/tasks';
  const params = [];

  if (searchTerm) {
    if (useSemantic) {
      params.push(`q=${encodeURIComponent(searchTerm)}`);
    }
    if (useContains) {
      params.push(`contains=${encodeURIComponent(searchTerm)}`);
    }
  }

  if (params.length > 0) {
    endpoint += `?${params.join('&')}`;
  }

  loadTasksFromAPI(endpoint);
}

// --- UI State Check (hide/show elements based on task count) ---
function tasksCheck() {
  const table = document.getElementById('taskList');
  const tbody = table.querySelector('tbody');
  const tasks = tbody.children;
  const taskActionsDiv = document.getElementById('taskActions');
  const currentSearchTerm = searchBar.value.trim();
  if (tasks.length === 0 && currentSearchTerm === '') {
    taskActionsDiv.classList.add('hidden');
  } else {
    taskActionsDiv.classList.remove('hidden');
  }
}

// --- Populate edit form with task data ---
function handleEditItem(e) {
  e.preventDefault();
  // Show modal and set form for editing
  const addTaskModal = document.getElementById('addTaskModal');
  const addForm = document.getElementById('addForm');
  const editTaskBtn = document.getElementById('editTask');
  const submitBtn = document.getElementById('submitBtn');
  addTaskModal.style.display = 'flex';
  editTaskBtn.style.display = 'inline-block';
  submitBtn.style.display = 'none';
  editTaskBtn.disabled = false;
  submitBtn.disabled = true;

  const row = e.target.closest('tr');
  if (!row) return;
  const cells = row.children;
  const taskTitle = cells[1].textContent.trim();
  const taskDescription = cells[2].textContent.trim();
  const taskDueDate = cells[3].textContent.trim();
  const taskPriority = cells[4].textContent.trim();
  let labelArr = [];
  if (row.dataset.label) {
    try { labelArr = JSON.parse(row.dataset.label); } catch {}
  }
  let attachArr = [];
  if (row.dataset.attachment) {
    try { attachArr = JSON.parse(row.dataset.attachment); } catch {}
  }
  document.getElementById('item').value = taskTitle;
  document.getElementById('description').value = taskDescription;
  document.getElementById('dueDate').value = taskDueDate;
  document.getElementById('priority').value = taskPriority;
  setTags(labelArr);
  setAttachmentDisplay(attachArr);
  tagInput.value = '';
  tagInput.disabled = false;
  addTagBtn.disabled = false;
  tagInput.style.display = '';
  addTagBtn.style.display = '';
  document.getElementById('maintitle').innerText = 'Edit your tasks below :';
  editItem = row;
  document.documentElement.scrollTop = 0;
  document.getElementById('item').focus();
}

function setTags(tags) {
  tagContainer.innerHTML = '';
  (tags || []).forEach(tag => addTag(tag));
}

// Update handleEditClick to hide modal after editing
async function handleEditClick(e) {
  e.preventDefault();
  const itemInput = document.getElementById("item");
  const dueDateInput = document.getElementById("dueDate");
  const descriptionInput = document.getElementById("description");
  const editedItemText = itemInput.value.trim();
  const editedDescriptionText = descriptionInput.value.trim();
  const editedDueDate = dueDateInput.value;
  const currentDate = new Date().toISOString().split("T")[0];
  const editedPriority = document.getElementById("priority").value;
  if (!editedItemText) {
    displayErrorMessage("Task title must not be empty.");
    return;
  }
  if (!editedDueDate) {
    displayErrorMessage("Please specify a due date.");
    return;
  }
  if (new Date(editedDueDate) < new Date(currentDate)) {
    displayErrorMessage("Due date has already passed !!!");
    return;
  }
  if (!editedPriority) {
    displayErrorMessage("Please select priority");
    return;
  }
  const taskId = editItem.dataset.taskId;
  if (!taskId) {
    displayErrorMessage("Error: Task ID not found for editing.");
    return;
  }
  const label = getTagArray();
  const attachmentFiles = getAttachmentFiles();
  let attachment = Array.isArray(editExistingAttachments) ? [...editExistingAttachments] : [];
  if (attachmentFiles.length > 0) {
    const newUploads = await uploadFiles(attachmentFiles);
    attachment = attachment.concat(newUploads);
  }
    const updatedTaskData = {
      title: editedItemText,
      description: editedDescriptionText,
      dueDate: editedDueDate,
      priority: editedPriority,
    label,
    attachment
    };
    await apiFetch(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updatedTaskData)
    });
    displaySuccessMessage("Task edited successfully !!!");
    itemInput.value = "";
    descriptionInput.value = "";
    dueDateInput.value = "";
  document.getElementById("priority").value = "";
  document.getElementById("maintitle").innerText = "To Do List :";
    document.getElementById('editTask').style.display = "none";
    document.getElementById('submitBtn').style.display = "inline-block";
  tagContainer.innerHTML = '';
  fileInput.value = '';
  selectedFiles = [];
  editExistingAttachments = [];
  attachmentContainer.innerHTML = '';
  // Hide modal after editing
  document.getElementById('addTaskModal').style.display = 'none';
  loadTasksFromAPI();
}

// --- Voice Command Logic ---
document.addEventListener("DOMContentLoaded", function () {
  const recognition = new (window.SpeechRecognition ||
    window.webkitSpeechRecognition)();
  recognition.lang = "en-US";
  recognition.interimResults = false;

  let isListening = false;
  const voiceCommandButton = document.getElementById("voice-command-button");
  if (voiceCommandButton) { // Check if button exists
    voiceCommandButton.addEventListener("click", function () {
      if (isListening) {
        recognition.stop();
        isListening = false;
        voiceCommandButton.innerHTML = '<i class="fas fa-microphone"></i>';
      } else {
        recognition.start();
        isListening = true;
        voiceCommandButton.innerHTML = '<i class="fas fa-microphone-slash"></i>';
      }
    });
  }

  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript;
    handleVoiceCommand(transcript);
  };

  recognition.onend = function () {
    isListening = false;
    if (voiceCommandButton) {
      voiceCommandButton.innerHTML = '<i class="fas fa-microphone"></i>';
    }
  };

  async function handleVoiceCommand(command) {
    console.log("Recognized Command:", command);
    const commandParts = command.toLowerCase().split(" ");

    // Helper to extract value from command parts
    const getCommandValue = (parts, keyword, nextKeyword) => {
        const keywordIndex = parts.indexOf(keyword);
        if (keywordIndex === -1) return null;
        const nextKeywordIndex = nextKeyword ? parts.indexOf(nextKeyword, keywordIndex + 1) : -1;
        if (nextKeyword && nextKeywordIndex === -1) return null;

        const start = keywordIndex + 1;
        const end = nextKeyword ? nextKeywordIndex : parts.length;
        return parts.slice(start, end).join(" ").trim();
    };

    if (commandParts.includes("add") && commandParts.includes("task")) {
        // Example: "add task buy groceries due date 2025-12-25 priority high description remember milk"
        const taskTitle = getCommandValue(commandParts, "task", "due");
        const dueDate = getCommandValue(commandParts, "date", "priority");
        const priority = getCommandValue(commandParts, "priority", "description");
        const description = getCommandValue(commandParts, "description", null);


        if (taskTitle && dueDate && priority) {
            // Populate form fields for addItem to pick up
            document.getElementById("item").value = taskTitle;
            document.getElementById("dueDate").value = dueDate;
            document.getElementById("priority").value = priority.charAt(0).toUpperCase() + priority.slice(1);
            document.getElementById("description").value = description || '';

            // Call addItem directly
            await addItem(new Event('click')); // Pass a dummy event object
            // Clear form fields after adding
            document.getElementById("item").value = '';
            document.getElementById("dueDate").value = '';
            document.getElementById("priority").value = '';
            document.getElementById("description").value = '';
        } else {
            displayErrorMessage("Invalid 'add task' command format. Try: 'add task [title] due date [YYYY-MM-DD] priority [high/medium/low] description [optional description]'");
        }
    } else if (commandParts.includes("edit") && commandParts.includes("task")) {
        // Example: "edit task buy groceries to buy bread due date 2025-12-30 priority medium"
        const oldTitle = getCommandValue(commandParts, "task", "to");
        const newTitle = getCommandValue(commandParts, "to", "due");
        const newDueDate = getCommandValue(commandParts, "date", "priority");
        const newPriority = getCommandValue(commandParts, "priority", "description");
        const newDescription = getCommandValue(commandParts, "description", null);

        if (oldTitle && newTitle && newDueDate && newPriority) {
            // Find the task by old title to get its ID
            const tasks = Array.from(taskList.children);
            const taskElementToEdit = tasks.find(task => task.childNodes[1].textContent.trim().toLowerCase() === oldTitle);

            if (taskElementToEdit) {
                // Populate form and trigger edit click
                document.getElementById("item").value = newTitle;
                document.getElementById("dueDate").value = newDueDate;
                document.getElementById("priority").value = newPriority.charAt(0).toUpperCase() + newPriority.slice(1);
                document.getElementById("description").value = newDescription || '';
                editItem = taskElementToEdit; // Set the global editItem to the found li element

                await handleEditClick(new Event('click'));
                // Clear form fields after editing
                document.getElementById("item").value = '';
                document.getElementById("dueDate").value = '';
                document.getElementById("priority").value = '';
                document.getElementById("description").value = '';
            } else {
                displayErrorMessage(`Task "${oldTitle}" not found for editing.`);
            }
        } else {
            displayErrorMessage("Invalid 'edit task' command format. Try: 'edit task [old title] to [new title] due date [YYYY-MM-DD] priority [high/medium/low] description [optional description]'");
        }
    } else if (commandParts.includes("delete") && commandParts.includes("task")) {
        const taskTitleToDelete = getCommandValue(commandParts, "task", null);
        if (taskTitleToDelete) {
            const tasks = Array.from(taskList.children);
            const taskElementToDelete = tasks.find(task => task.childNodes[1].textContent.trim().toLowerCase() === taskTitleToDelete);

            if (taskElementToDelete) {
                // Simulate a click on the delete button to trigger the confirmation flow
                const deleteButton = taskElementToDelete.querySelector('.delete');
                if (deleteButton) {
                    deleteButton.click();
                    // User will need to confirm via the UI dialog
                } else {
                    displayErrorMessage("Delete button not found for this task.");
                }
            } else {
                displayErrorMessage(`Task "${taskTitleToDelete}" not found for deletion.`);
            }
        } else {
            displayErrorMessage("Invalid 'delete task' command format. Try: 'delete task [title]'");
        }
    } else {
        displayErrorMessage("Voice command not recognized. Try 'add task', 'edit task', or 'delete task'.");
    }
  }
});

// --- API-driven Add Task Function (called by addItem and voice command) ---
async function addTaskToAPI(taskData) {
  try {
    const newTask = await apiFetch('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
    displaySuccessMessage("Task added successfully!");
    loadTasksFromAPI(); // Reload tasks to show the new one
    // Clear form fields after successful add
    document.getElementById("item").value = "";
    document.getElementById("dueDate").value = "";
    document.getElementById("description").value = "";
    document.getElementById("priority").value = "";
  } catch (error) {
    // Check if the error is due to a duplicate task title from backend (status 409)
    if (error.message && error.message.includes('Task with this title already exists.')) {
        showComfirmboxForDuplicateTasks(); // Use existing confirmation box for duplicates
    } else {
        // Error message already displayed by apiFetch
        console.error("Error adding task:", error);
    }
  }
}

// --- Add Item (Manual Form Submission) ---
async function addItem(e) {
  e.preventDefault();
  const newTaskTitle = document.getElementById("item").value.trim();
  const description = document.getElementById("description").value.trim();
  const dueDate = document.getElementById("dueDate").value;
  const priority = document.getElementById("priority").value;
  const currentDate = new Date().toISOString().split("T")[0];
  if (!newTaskTitle) {
    displayErrorMessage("Task title cannot be empty!");
    return;
  }
  if (!dueDate) {
    displayErrorMessage("Please specify a due date!");
    return;
  }
  if (new Date(dueDate) < new Date(currentDate)) {
    displayErrorMessage("Due date has already passed!");
    return;
  }
  if (!priority) {
    displayErrorMessage("Please select priority!");
    return;
  }
  const label = getTagArray();
  const attachmentFiles = getAttachmentFiles();
  let attachment = [];
  if (attachmentFiles.length > 0) {
    attachment = await uploadFiles(attachmentFiles);
  }
  const taskData = {
    title: newTaskTitle,
    description: description,
    dueDate: dueDate,
    priority: priority,
    completed: false,
    label,
    attachment
  };
  await addTaskToAPI(taskData);
  // Clear tags and attachments after adding
  tagContainer.innerHTML = '';
  fileInput.value = '';
  selectedFiles = [];
  attachmentContainer.innerHTML = '';
}

// --- Handle Item Click (Delete and Mark Complete) ---
async function handleItemClick(e) {
  // Handle Delete button click
  if (e.target.classList.contains("delete") || e.target.closest('.delete')) {
    e.preventDefault();
    const tr = e.target.closest('tr'); // Get the closest table row
    const taskId = tr.dataset.taskId;

    if (!taskId) {
      displayErrorMessage("Error: Task ID not found for deletion.");
      return;
    }

    const confirmationBox = document.getElementById("custom-confirm");
    const delalert_title = document.getElementById("confirm-msg");
    delalert_title.innerHTML = "&#9888; Are you sure you want to delete this task?";
    delalert_title.className = "alert alert-danger";
    delalert_title.role = "alert";

    const confirmYesButton = document.getElementById("confirm-yes");
    const confirmNoButton = document.getElementById("confirm-no");
    const confirmCancelButton = document.getElementById("confirm-cancel");

    // Remove previous listeners to prevent multiple executions
    const cloneYes = confirmYesButton.cloneNode(true);
    confirmYesButton.parentNode.replaceChild(cloneYes, confirmYesButton);
    const cloneNo = confirmNoButton.cloneNode(true);
    confirmNoButton.parentNode.replaceChild(cloneNo, confirmNoButton);
    const cloneCancel = confirmCancelButton.cloneNode(true);
    confirmCancelButton.parentNode.replaceChild(cloneCancel, confirmCancelButton);

    const handleYesClick = async () => {
      confirmationBox.style.display = "none";
      try {
        await apiFetch(`/tasks/${taskId}`, { method: 'DELETE' });
        displaySuccessMessage("Task deleted successfully !!!");
        loadTasksFromAPI(); // Reload tasks to update the list
      } catch (error) {
        console.error("Failed to delete task:", error);
      }
    };

    const handleNoClick = () => {
      confirmationBox.style.display = "none";
    };

    const handleCancelClick = () => {
      confirmationBox.style.display = "none";
    };

    cloneYes.addEventListener("click", handleYesClick);
    cloneNo.addEventListener("click", handleNoClick);
    cloneCancel.addEventListener("click", handleCancelClick);

    confirmationBox.style.display = "flex";
  }

  // Handle Mark as Complete checkbox click
  if (e.target.classList.contains("task-completed-checkbox")) { // Use the new class
    const tr = e.target.closest('tr');
    const taskId = tr.dataset.taskId;
    const isCompleted = e.target.checked;
    const editButton = tr.querySelector(".edit");

    if (!taskId) {
      displayErrorMessage("Error: Task ID not found for status update.");
      e.target.checked = !isCompleted; // Revert checkbox if ID is missing
      return;
    }

    try {
      await apiFetch(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: isCompleted })
      });

      displaySuccessMessage(`Task marked as ${isCompleted ? 'completed' : 'incomplete'}!`);
      // Update local UI immediately without full reload for responsiveness
      if (isCompleted) {
        tr.classList.add("task-completed");
        if (editButton) editButton.style.display = 'none';
      } else {
        tr.classList.remove("task-completed");
        if (editButton) editButton.style.display = 'block';
      }
    } catch (error) {
      e.target.checked = !isCompleted; // Revert checkbox on API error
      console.error("Failed to update task status:", error);
    }
  }
}

// --- Message Box Functions ---
function displaySuccessMessage(message) {
  const lblSuccess = document.getElementById("lblsuccess");
  if (lblSuccess) {
    lblSuccess.innerHTML = message;
    lblSuccess.style.display = "block";
    setTimeout(function () {
      lblSuccess.style.display = "none";
    }, 3000);
  }
}

function displayErrorMessage(message) {
  const lblError = document.getElementById("lblerror");
  if (lblError) {
    lblError.innerHTML = message;
    lblError.style.display = "block";
    setTimeout(function () {
      lblError.style.display = "none";
    }, 3000);
  }
}

// --- Load Tasks from API ---
async function loadTasksFromAPI(endpoint = '/tasks') {
  try {
    const table = document.getElementById('taskList');
    const tbody = table.querySelector('tbody');
    // Clear current tasks from the DOM
    while (tbody.firstChild) {
      tbody.removeChild(tbody.firstChild);
    }
    const tasks = await apiFetch(endpoint);
    if (tasks.length > 0) {
      tasks.forEach((task) => {
        const tr = document.createElement('tr');
        tr.dataset.taskId = task._id;
        tr.dataset.label = JSON.stringify(task.label || []);
        tr.dataset.attachment = JSON.stringify(task.attachment || []);
        if (task.completed) {
          tr.classList.add('task-completed');
        }

        // Checkbox
        const tdCheckbox = document.createElement('td');
        const completeCheckbox = document.createElement('input');
        completeCheckbox.type = 'checkbox';
        completeCheckbox.className = 'form-check-input task-completed-checkbox';
        completeCheckbox.checked = task.completed;
        completeCheckbox.addEventListener('change', handleItemClick);
        tdCheckbox.appendChild(completeCheckbox);
        tr.appendChild(tdCheckbox);

        // Title
        const tdTitle = document.createElement('td');
        const titleElem = document.createElement('span');
        titleElem.textContent = task.title;
        titleElem.className = 'font-weight-bold';
        tdTitle.appendChild(titleElem);
        tr.appendChild(tdTitle);

        // Description
        const tdDesc = document.createElement('td');
        tdDesc.textContent = task.description || '';
        tr.appendChild(tdDesc);

        // Due Date
        const tdDue = document.createElement('td');
        tdDue.textContent = task.dueDate || '';
        tr.appendChild(tdDue);

        // Priority
        const tdPriority = document.createElement('td');
        tdPriority.textContent = task.priority || '';
        tdPriority.className = `priority-${(task.priority || '').toLowerCase()}`;
        tr.appendChild(tdPriority);

        // Tags
        const tdTags = document.createElement('td');
        if (task.label && Array.isArray(task.label) && task.label.length > 0) {
          task.label.forEach(l => {
            const chip = document.createElement('span');
            chip.className = 'tag-chip badge badge-info mr-1';
            chip.textContent = l;
            tdTags.appendChild(chip);
          });
        }
        tr.appendChild(tdTags);

        // Attachments
        const tdAttach = document.createElement('td');
        if (task.attachment && Array.isArray(task.attachment) && task.attachment.length > 0) {
          task.attachment.forEach(url => {
            const link = document.createElement('a');
            link.href = url.startsWith('/uploads/') ? API_BASE_URL + url : url;
            link.textContent = url.split('/').pop();
            link.target = '_blank';
            link.className = 'mr-2';
            tdAttach.appendChild(link);
          });
        }
        tr.appendChild(tdAttach);

        // Created Date
        const tdCreated = document.createElement('td');
        tdCreated.textContent = new Date(task.createdAt).toLocaleString();
        tr.appendChild(tdCreated);

        // Edit Button
        const tdEdit = document.createElement('td');
        const editButton = document.createElement('button');
        editButton.className = 'btn btn-outline-secondary btn-sm edit';
        editButton.innerHTML = '<ion-icon name="create-outline" style="font-size: 20px"></ion-icon>';
        editButton.addEventListener('click', handleEditItem);
        tdEdit.appendChild(editButton);
        tr.appendChild(tdEdit);

        // Delete Button
        const tdDelete = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'btn btn-outline-danger btn-sm delete';
        deleteButton.innerHTML = '<ion-icon name="trash-outline" style="font-size: 20px"></ion-icon>';
        deleteButton.addEventListener('click', handleItemClick);
        tdDelete.appendChild(deleteButton);
        tr.appendChild(tdDelete);

        tbody.appendChild(tr);
      });
    }
    tasksCheck();
  } catch (error) {
    displayErrorMessage('Failed to load tasks.');
  }
}

// Function to enable submit button (kept for existing UI elements if needed)
function enableSubmit(ref, btnID) {
  document.getElementById(btnID).disabled = false;
}

// --- Theme Toggling ---
function toggleMode() {
  document.body.classList.toggle("dark-mode");
  document.body.classList.toggle("light-mode");
  if (modeToggleBtn.checked === true) {
    localStorage.setItem("dark-mode", "enabled");
  } else {
    localStorage.setItem("dark-mode", null);
  }
}

// --- Clear All Tasks (API Call) ---
async function clearAllTasks() {
  const taskList = document.getElementById("taskList");
  const confirmationBoxAll = document.getElementById("custom-confirm-all");
  const alertTitle = document.getElementById("confirm-msg-all");
  const confirmYesButtonAll = document.getElementById("confirm-yes-all");
  const confirmNoButtonAll = document.getElementById("confirm-no-all");
  const confirmCancelButtonAll = document.getElementById("confirm-cancel-all");

  if (taskList.children.length === 0) {
    displayErrorMessage("No tasks to clear!");
    return;
  }

  alertTitle.innerHTML = "&#9888; Are you sure you want to delete all tasks?";
  alertTitle.className = "alert alert-danger";
  alertTitle.role = "alert";

  // Remove previous listeners to prevent multiple executions
  const cloneYesAll = confirmYesButtonAll.cloneNode(true);
  confirmYesButtonAll.parentNode.replaceChild(cloneYesAll, confirmYesButtonAll);
  const cloneNoAll = confirmNoButtonAll.cloneNode(true);
  confirmNoButtonAll.parentNode.replaceChild(cloneNoAll, confirmNoButtonAll);
  const cloneCancelAll = confirmCancelButtonAll.cloneNode(true);
  confirmCancelButtonAll.parentNode.replaceChild(cloneCancelAll, confirmCancelButtonAll);

  const handleYesClickAll = async () => {
    confirmationBoxAll.style.display = "none";
    try {
      await apiFetch('/tasks', { method: 'DELETE' }); // Call backend to delete all
      displaySuccessMessage("All tasks deleted successfully!");
      loadTasksFromAPI(); // Reload to show empty list
    } catch (error) {
      console.error("Failed to clear all tasks:", error);
    }
  };

  const handleNoClickAll = () => {
    confirmationBoxAll.style.display = "none";
  };

  const handleCancelClickAll = () => {
    confirmationBoxAll.style.display = "none";
  };

  cloneYesAll.addEventListener("click", handleYesClickAll);
  cloneNoAll.addEventListener("click", handleNoClickAll);
  cloneCancelAll.addEventListener("click", handleCancelClickAll);

  confirmationBoxAll.style.display = "flex";
}

// --- Sort Task List by Due Date (API Call) ---
async function sortByDueDate(order) {
  let sortParam = '';
  if (order === "early") {
    sortParam = 'dueDate:asc';
  } else if (order === "late") {
    sortParam = 'dueDate:desc';
  }
  await loadTasksFromAPI(`/tasks?sortBy=${sortParam}`);
  displaySuccessMessage(`Tasks sorted by due date (${order}).`);
}

// --- Sort Task List by Priority (API Call) ---
async function sortByPriority(order) {
  let sortParam = '';
  if (order === "highToLow") {
    sortParam = 'priority:desc'; // Assuming your backend sorts 'High', 'Medium', 'Low' correctly
  } else if (order === "lowToHigh") {
    sortParam = 'priority:asc';
  }
  await loadTasksFromAPI(`/tasks?sortBy=${sortParam}`);
  displaySuccessMessage(`Tasks sorted by priority (${order}).`);
}

// --- Dropdown Menu Logic ---
function myFunction() {
  document.getElementById("myDropdown").classList.toggle("show");
}

window.onclick = function (event) {
  if (!event.target.matches(".dropbtn")) {
    var dropdowns = document.getElementsByClassName("dropdown-content");
    for (var i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains("show")) {
        openDropdown.classList.remove("show");
      }
    }
  }
};

// --- Preloader and Header Typing Effect (existing code) ---
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(function () {
    const preloader = document.querySelector(".preloader");
    if (preloader) {
      preloader.style.display = "none";
    }
  }, 2000);

  const headerText = "Welcome to Do-it! 📝"; // Updated text
  const headerElement = document.getElementById("todo-header");

  function typeText(text, index) {
    if (headerElement) { // Check if element exists
      headerElement.textContent = text.slice(0, index);
    }

    if (index < text.length) {
      setTimeout(function () {
        typeText(text, index + 1);
      }, 50);
    }
  }

  typeText(headerText, 0);

  // Initialize the app after DOM is loaded and preloader is handled
  init();
});

// --- Theme Switcher (existing code, uses localStorage) ---
function themeSwitcher() {
  const modeToggleBtn = document.getElementById("modeToggle");
  if (!modeToggleBtn) return; // Exit if button not found

  if (localStorage.length === 0 || localStorage.getItem("dark-mode") === null) {
    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
    if (prefersDarkScheme.matches) {
      document.body.classList.add("dark-mode"); // Add, not toggle for initial setup
      localStorage.setItem("dark-mode", "enabled");
      modeToggleBtn.checked = true;
    } else {
      document.body.classList.add("light-mode"); // Add, not toggle
      localStorage.setItem("dark-mode", null);
    }
  } else {
    if (localStorage.getItem("dark-mode") === "enabled") {
      document.body.classList.add("dark-mode");
      modeToggleBtn.checked = true;
    } else {
      document.body.classList.add("light-mode");
    }
  }
}
// Initial call to set theme, now moved inside DOMContentLoaded

// --- Removed/Redundant Functions due to API Integration ---

// displayTaskDetails - kept for logging purposes, but not affecting data state
function displayTaskDetails(taskElement) {
  if (taskElement) {
    const dueDateElement = taskElement.querySelector("#task-dueDate");
    const priorityElement = taskElement.querySelector("#task-priority");
    const dueDate = dueDateElement
      ? dueDateElement.textContent.split(":")[1].trim()
      : null;
    const priority = priorityElement
      ? priorityElement.textContent.trim()
      : null;
    console.log(`Task Details - Due Date: ${dueDate}, Priority: ${priority}`);
  }
}

// showComfirmboxForDuplicateTasks - adapted to be called when API returns duplicate error
function showComfirmboxForDuplicateTasks() {
  const confirmationBox = document.getElementById("duplicate-task");

  //display confirmation message
  const delalert_title = document.getElementById("duplicate-msg");
  delalert_title.innerHTML = "&#9888; This task is already present";
  delalert_title.className = "alert alert-danger";
  delalert_title.role = "alert";

  const confirmYesButton = document.getElementById("duplicate-ok");
  const confirmCancelButton = document.getElementById("duplicate-cancel");

  // Remove previous listeners to prevent multiple executions
  const cloneYes = confirmYesButton.cloneNode(true);
  confirmYesButton.parentNode.replaceChild(cloneYes, confirmYesButton);
  const cloneCancel = confirmCancelButton.cloneNode(true);
  confirmCancelButton.parentNode.replaceChild(cloneCancel, confirmCancelButton);

  //confirm message controls click logic
  const handleYesClick = () => {
    confirmationBox.style.display = "none";
  };

  const handleCancelClick = () => {
    confirmationBox.style.display = "none";
  };

  cloneYes.addEventListener("click", handleYesClick);
  cloneCancel.addEventListener("click", handleCancelClick);

  confirmationBox.style.display = "flex";
}

// Tag logic
const tagInput = document.getElementById("tagInput");
const tagContainer = document.getElementById("tagContainer");
const addTagBtn = document.getElementById("addTagBtn");

function addTag(tag) {
  if (!tag) return;
  // Prevent duplicates by checking DOM chips only
  const tags = Array.from(tagContainer.querySelectorAll('.tag-chip')).map(chip => chip.dataset.value);
  if (tags.includes(tag)) return;
  const chip = document.createElement('span');
  chip.className = 'tag-chip badge badge-info mr-1';
  chip.style.display = 'inline-flex';
  chip.style.alignItems = 'center';
  chip.dataset.value = tag;
  chip.textContent = tag + ' ';
  const removeBtn = document.createElement('button');
  removeBtn.textContent = '×';
  removeBtn.className = 'btn btn-sm btn-link p-0 m-0';
  removeBtn.onclick = (e) => {
    e.stopPropagation();
    chip.remove();
  };
  chip.appendChild(removeBtn);
  tagContainer.appendChild(chip);
}

function setTags(tags) {
  tagContainer.innerHTML = '';
  (tags || []).forEach(tag => addTag(tag));
}

function getTagArray() {
  return Array.from(tagContainer.querySelectorAll('.tag-chip')).map(chip => chip.dataset.value);
}

addTagBtn.onclick = function() {
  const tag = tagInput.value.trim();
  if (tag) {
    tag.split(',').forEach(t => addTag(t.trim()));
    tagInput.value = '';
  }
};

tagInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    addTagBtn.onclick();
  }
});

// Attachment logic with delete support
const fileInput = document.getElementById("fileAttachment");
const attachmentContainer = document.getElementById("attachmentContainer");
let selectedFiles = [];
let editExistingAttachments = [];

fileInput.addEventListener('change', function() {
  selectedFiles = Array.from(fileInput.files);
  renderAttachmentList();
});

function renderAttachmentList() {
  attachmentContainer.innerHTML = '';
  // Show existing attachments (when editing)
  editExistingAttachments.forEach((url, idx) => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    const link = document.createElement('a');
    link.href = url.startsWith('/uploads/') ? (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:5000') + url : url;
    link.textContent = url.split('/').pop();
    link.target = '_blank';
    link.style.marginRight = '8px';
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'X';
    removeBtn.className = 'btn btn-sm btn-danger';
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      editExistingAttachments.splice(idx, 1);
      renderAttachmentList();
    };
    div.appendChild(link);
    div.appendChild(removeBtn);
    attachmentContainer.appendChild(div);
  });
  // Show new attachments (not yet uploaded)
  selectedFiles.forEach((file, idx) => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    const span = document.createElement('span');
    span.textContent = file.name;
    span.style.marginRight = '8px';
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'X';
    removeBtn.className = 'btn btn-sm btn-danger';
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      selectedFiles.splice(idx, 1);
      renderAttachmentList();
      if (selectedFiles.length === 0) {
        fileInput.value = '';
      }
    };
    div.appendChild(span);
    div.appendChild(removeBtn);
    attachmentContainer.appendChild(div);
  });
}

function getAttachmentFiles() {
  return selectedFiles;
}

function setAttachmentDisplay(urls) {
  editExistingAttachments = Array.isArray(urls) ? [...urls] : [];
  selectedFiles = [];
  renderAttachmentList();
}

async function uploadFiles(files) {
  if (!files.length) return [];
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  const uploadResponse = await fetch('http://localhost:5000/upload', { method: 'POST', body: formData });
  if (!uploadResponse.ok) throw new Error('File upload failed');
  const data = await uploadResponse.json();
  return data.files; // Array of URLs
}

// Modal logic for Add Task
const showAddFormBtn = document.getElementById('showAddFormBtn');
const addTaskModal = document.getElementById('addTaskModal');
const closeAddFormBtn = document.getElementById('closeAddFormBtn');
const addForm = document.getElementById('addForm');

function showAddTaskModal() {
  addForm.reset();
  document.getElementById('submitBtn').disabled = true;
  addTaskModal.style.display = 'flex';
  setTimeout(() => {
    document.getElementById('item').focus();
  }, 100);
}
function hideAddTaskModal() {
  addTaskModal.style.display = 'none';
  addForm.reset();
  document.getElementById('submitBtn').disabled = true;
}
if (showAddFormBtn) showAddFormBtn.addEventListener('click', showAddTaskModal);
if (closeAddFormBtn) closeAddFormBtn.addEventListener('click', hideAddTaskModal);
if (addForm) {
  addForm.addEventListener('submit', function(e) {
    // Let the normal addItem logic run, but hide modal after
    setTimeout(hideAddTaskModal, 200); // Hide after add
  });
}

// Optional: Hide modal if user clicks outside modal-content
if (addTaskModal) {
  addTaskModal.addEventListener('click', function(e) {
    if (e.target === addTaskModal) hideAddTaskModal();
  });
}
