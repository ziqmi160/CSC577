// reembed_tasks.js
// This script fetches all existing tasks from your Node.js backend
// and then sends a PATCH request for each task. This action
// triggers the `sendForEmbedding` function in your Node.js backend,
// which in turn calls your Python semantic service to generate
// and store the semantic embeddings for each task.

// IMPORTANT: Ensure your Node.js backend is running on this URL
// IMPORTANT: Ensure your Python semantic service is also running
// (as your Node.js backend will forward requests to it).
const API_BASE_URL = 'http://localhost:5000'; // Match your Node.js backend's PORT

async function reembedAllTasks() {
    console.log("--- Starting Re-embedding Process ---");
    console.log("Make sure both your Node.js backend and Python semantic service are running.");

    try {
        // 1. Fetch all existing tasks from the Node.js backend
        console.log("Step 1: Fetching all tasks from the Node.js backend...");
        const fetchResponse = await fetch(`${API_BASE_URL}/tasks`);

        if (!fetchResponse.ok) {
            const errorData = await fetchResponse.json();
            throw new Error(`Failed to fetch tasks: ${errorData.message || fetchResponse.statusText}`);
        }
        const tasks = await fetchResponse.json();
        console.log(`Step 1: Successfully fetched ${tasks.length} tasks.`);

        if (tasks.length === 0) {
            console.log("No tasks found in the database. No re-embedding needed. Exiting.");
            return;
        }

        // 2. Iterate through each task and send a PATCH request
        // This will cause the Node.js backend to call the Python service for embedding.
        let reembeddedCount = 0;
        for (const task of tasks) {
            console.log(`Step 2: Sending re-embedding request for task: "${task.title}" (ID: ${task._id})...`);
            
            // We're sending the task's current data back to trigger the embedding process.
            const patchResponse = await fetch(`${API_BASE_URL}/tasks/${task._id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: task.title,
                    description: task.description,
                    dueDate: task.dueDate,
                    priority: task.priority,
                    completed: task.completed
                }),
            });

            if (!patchResponse.ok) {
                const errorData = await patchResponse.json();
                console.error(`Error re-embedding task "${task.title}" (ID: ${task._id}): ${errorData.message || patchResponse.statusText}`);
            } else {
                console.log(`Successfully re-embedded task: "${task.title}"`);
                reembeddedCount++;
            }
        }
        console.log(`--- Re-embedding Process Completed: ${reembeddedCount} tasks re-embedded ---`);

    } catch (error) {
        console.error("An unhandled error occurred during the re-embedding process:", error);
    }
}

// Execute the function
reembedAllTasks();
