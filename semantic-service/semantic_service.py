# semantic_service.py
from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer
from pymongo import MongoClient
from bson.objectid import ObjectId
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import os
import logging
import time # NEW: Import time module for performance logging
import re

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)

# --- Configuration ---
# Use environment variables for sensitive data
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/todo-app-db')
MONGO_DB_NAME = os.getenv('MONGO_DB_NAME', 'todo-app-db') # Ensure this matches your database name
MONGO_COLLECTION_NAME = os.getenv('MONGO_COLLECTION_NAME', 'tasks') # Ensure this matches your collection name
PYTHON_SERVICE_PORT = int(os.getenv('PYTHON_SERVICE_PORT', 5001)) # Port for this Python service

# Constants for text chunking
MAX_CHUNK_LENGTH = 200  # Maximum number of words per chunk
OVERLAP_LENGTH = 50     # Number of words to overlap between chunks

def chunk_text(text):
    """
    Split text into overlapping chunks of maximum length MAX_CHUNK_LENGTH.
    Each chunk overlaps by OVERLAP_LENGTH words to maintain context.
    """
    # Split text into words
    words = text.split()
    chunks = []
    
    if len(words) <= MAX_CHUNK_LENGTH:
        return [text]
    
    start_idx = 0
    while start_idx < len(words):
        end_idx = min(start_idx + MAX_CHUNK_LENGTH, len(words))
        chunk = ' '.join(words[start_idx:end_idx])
        chunks.append(chunk)
        start_idx = end_idx - OVERLAP_LENGTH
    
    return chunks

def get_average_embedding(text):
    """
    Generate embedding for text by chunking if necessary and averaging the embeddings.
    """
    chunks = chunk_text(text)
    chunk_embeddings = []
    
    for chunk in chunks:
        embedding = model.encode(chunk)
        chunk_embeddings.append(embedding)
    
    # Average the embeddings from all chunks
    return np.mean(chunk_embeddings, axis=0)

# --- Load Sentence Transformer Model ---
# Using a common multilingual model. You can choose a different one if needed.
# 'all-MiniLM-L6-v2' is a good balance of speed and and performance.
try:
    model = SentenceTransformer('all-MiniLM-L6-v2')
    logging.info("Sentence Transformer model loaded successfully: all-MiniLM-L6-v2")
except Exception as e:
    logging.error(f"Failed to load Sentence Transformer model: {e}")
    exit(1) # Exit if the model cannot be loaded

# --- MongoDB Connection ---
try:
    client = MongoClient(MONGO_URI)
    db = client[MONGO_DB_NAME]
    tasks_collection = db[MONGO_COLLECTION_NAME]
    logging.info(f"MongoDB connected successfully to DB: '{MONGO_DB_NAME}' collection: '{MONGO_COLLECTION_NAME}'")
except Exception as e:
    logging.error(f"Failed to connect to MongoDB: {e}")
    exit(1) # Exit if MongoDB connection fails

# --- API Endpoints ---

@app.route('/embed_task', methods=['POST'])
def embed_task():
    """
    Receives task text, generates its embedding, and stores it in MongoDB.
    Expected JSON: {"taskId": "...", "title": "...", "description": "..."}
    """
    data = request.get_json()
    task_id = data.get('taskId')
    title = data.get('title', '')
    description = data.get('description', '')

    if not task_id or (not title and not description):
        logging.warning("Received invalid data for /embed_task: taskId or text missing.")
        return jsonify({"message": "taskId and at least title or description are required"}), 400

    text_to_embed = f"{title}. {description}".strip()
    if not text_to_embed:
        logging.warning(f"No text to embed for taskId: {task_id}")
        return jsonify({"message": "No text content provided for embedding"}), 400

    try:
        start_time = time.time()
        # Generate embedding using the new chunking method
        embedding = get_average_embedding(text_to_embed).tolist()
        end_time = time.time()
        logging.info(f"Embedding generation for taskId {task_id} took {end_time - start_time:.4f} seconds.")

        # Update the task in MongoDB with its embedding
        tasks_collection.update_one(
            {'_id': ObjectId(task_id)},
            {'$set': {'embedding': embedding}}
        )
        logging.info(f"Embedding successfully generated and stored for taskId: {task_id}")
        return jsonify({"message": "Embedding stored successfully", "taskId": task_id}), 200
    except Exception as e:
        logging.error(f"Error embedding task {task_id}: {e}")
        return jsonify({"message": f"Error processing embedding: {e}"}), 500

@app.route('/search_semantic', methods=['POST'])
def search_semantic():
    """
    Receives a search query, generates its embedding, performs semantic search,
    and returns relevant task IDs.
    Expected JSON: {"query": "..."}
    """
    data = request.get_json()
    query_text = data.get('query')

    if not query_text:
        logging.warning("Received empty query for /search_semantic.")
        return jsonify({"message": "Search query is required"}), 400

    try:
        start_time_total = time.time() # Start total timing

        # Generate query embedding using the new chunking method
        start_time_embed = time.time()
        query_embedding = get_average_embedding(query_text)
        end_time_embed = time.time()
        logging.info(f"Query embedding generation took {end_time_embed - start_time_embed:.4f} seconds.")

        # Retrieve all task embeddings from MongoDB
        start_time_fetch = time.time()
        # Only fetch _id and embedding to minimize data transfer
        all_tasks_with_embeddings = tasks_collection.find(
            {'embedding': {'$exists': True}},
            {'_id': 1, 'embedding': 1}
        )

        task_embeddings = []
        task_ids = []
        for task in all_tasks_with_embeddings:
            task_ids.append(str(task['_id'])) # Convert ObjectId to string
            task_embeddings.append(task['embedding'])
        end_time_fetch = time.time()
        logging.info(f"Fetched {len(task_embeddings)} task embeddings from DB in {end_time_fetch - start_time_fetch:.4f} seconds.")

        if not task_embeddings:
            logging.info("No task embeddings found in the database.")
            return jsonify({"results": []}), 200

        # Convert to numpy arrays for similarity calculation
        task_embeddings_np = np.array(task_embeddings)

        # Calculate cosine similarity between query and all task embeddings
        start_time_similarity = time.time()
        similarities = cosine_similarity(query_embedding.reshape(1, -1), task_embeddings_np)[0]
        end_time_similarity = time.time()
        logging.info(f"Cosine similarity calculation took {end_time_similarity - start_time_similarity:.4f} seconds.")

        # Get top N most similar task IDs
        # You can adjust the number of results and similarity threshold
        top_n_indices = similarities.argsort()[-10:][::-1] # Get top 10 indices, sorted descending

        results = []
        for i in top_n_indices:
            # Optionally add a similarity score threshold
            if similarities[i] > 0.4: # Only return if similarity is above a certain threshold (adjust as needed)
                results.append({
                    "taskId": task_ids[i],
                    "score": float(similarities[i]) # Convert numpy float to Python float
                })
        
        end_time_total = time.time() # End total timing
        logging.info(f"Semantic search for '{query_text}' returned {len(results)} results. Total search time: {end_time_total - start_time_total:.4f} seconds.")
        return jsonify({"results": results}), 200
    except Exception as e:
        logging.error(f"Error during semantic search for query '{query_text}': {e}")
        return jsonify({"message": f"Error during semantic search: {e}"}), 500

if __name__ == '__main__':
    # Flask runs on 0.0.0.0 to be accessible externally (e.g., from Node.js backend)
    # Ensure this port is open in your firewall if you're deploying it externally
    app.run(host='0.0.0.0', port=PYTHON_SERVICE_PORT, debug=True) # debug=True for development