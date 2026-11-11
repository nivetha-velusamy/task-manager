require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory fallback store
let memoryTasks = [
  {
    _id: "task_1",
    title: "Review Project Documentation",
    status: "Completed",
    createdAt: new Date().toISOString()
  },
  {
    _id: "task_2",
    title: "Verify Production Deployment",
    status: "Ongoing",
    createdAt: new Date().toISOString()
  },
  {
    _id: "task_3",
    title: "Add New Task",
    status: "Pending",
    createdAt: new Date().toISOString()
  }
];

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

// Connect to MongoDB if MONGODB_URI is provided
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log("MongoDB connected successfully"))
    .catch((err) => console.log("MongoDB connection error:", err.message));
}

// Health and Root endpoints
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    mongo: isMongoConnected() ? "connected" : "fallback_memory",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Define Task Schema and Model
const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["Pending", "Ongoing", "Completed"],
      default: "Pending"
    }
  },
  { timestamps: true }
);

const Task = mongoose.models.Task || mongoose.model("Task", TaskSchema);

// Get all tasks
app.get("/tasks", async (req, res) => {
  if (isMongoConnected()) {
    try {
      const tasks = await Task.find().sort({ createdAt: -1 });
      return res.json(tasks);
    } catch (err) {
      console.error("Error fetching from MongoDB:", err);
    }
  }
  return res.json(memoryTasks);
});

// Create a new task
app.post("/tasks", async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ message: "Task title cannot be empty." });
  }

  if (isMongoConnected()) {
    try {
      const task = new Task({ title: title.trim() });
      const newTask = await task.save();
      return res.status(201).json(newTask);
    } catch (err) {
      console.error("Error creating task in MongoDB:", err);
    }
  }

  const newTask = {
    _id: "task_" + Date.now(),
    title: title.trim(),
    status: "Pending",
    createdAt: new Date().toISOString()
  };
  memoryTasks.push(newTask);
  return res.status(201).json(newTask);
});

// Update task (status and/or title)
app.patch("/tasks/:id", async (req, res) => {
  const { title, status } = req.body;
  const { id } = req.params;

  if (isMongoConnected()) {
    try {
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (status !== undefined) updateData.status = status;

      const updatedTask = await Task.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (updatedTask) {
        return res.json(updatedTask);
      }
    } catch (err) {
      console.error("Error updating task in MongoDB:", err);
    }
  }

  const task = memoryTasks.find((t) => t._id === id);
  if (!task) {
    return res.status(404).json({ message: "Task not found." });
  }

  if (title !== undefined) task.title = title;
  if (status !== undefined) task.status = status;
  return res.json(task);
});

// Delete a task by ID
app.delete("/tasks/:id", async (req, res) => {
  const { id } = req.params;

  if (isMongoConnected()) {
    try {
      const deletedTask = await Task.findByIdAndDelete(id);
      if (deletedTask) {
        return res.json({ message: "Task deleted." });
      }
    } catch (err) {
      console.error("Error deleting task in MongoDB:", err);
    }
  }

  const index = memoryTasks.findIndex((t) => t._id === id);
  if (index === -1) {
    return res.status(404).json({ message: "Task not found." });
  }

  memoryTasks.splice(index, 1);
  return res.json({ message: "Task deleted." });
});

// Serve frontend static assets
const clientDist = path.join(__dirname, "client", "dist");
app.use(express.static(clientDist));

// SPA fallback
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/tasks") || req.path === "/health" || req.path.startsWith("/api")) {
    return next();
  }
  const indexPath = path.join(clientDist, "index.html");
  if (require("fs").existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.send("Task Manager API is running");
});

// Server configuration
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
