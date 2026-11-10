require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health and Root endpoints
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.status(200).json({ message: "Task Manager API is running" });
});

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/taskmanager";
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.log("MongoDB connection error:", err));

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

const Task = mongoose.model("Task", TaskSchema);

// Get all tasks
app.get("/tasks", async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({
      message: "Server error. Could not fetch tasks."
    });
  }
});

// Create a new task
app.post("/tasks", async (req, res) => {
  const { title } = req.body;
  const task = new Task({ title });

  try {
    const newTask = await task.save();
    res.status(201).json(newTask);
  } catch (err) {
    console.error("Error creating task:", err);
    res.status(400).json({
      message: "Invalid data. Could not create task."
    });
  }
});

// Update task (status and/or title)
app.patch("/tasks/:id", async (req, res) => {
  const { title, status } = req.body;
  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (status !== undefined) updateData.status = status;

  try {
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedTask) {
      return res.status(404).json({
        message: "Task not found."
      });
    }

    res.json(updatedTask);
  } catch (err) {
    console.error("Error updating task:", err);
    res.status(500).json({
      message: "Server error. Could not update task."
    });
  }
});

// Delete a task by ID
app.delete("/tasks/:id", async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(
      req.params.id
    );

    if (!deletedTask) {
      return res.status(404).json({
        message: "Task not found."
      });
    }

    res.json({ message: "Task deleted." });
  } catch (err) {
    console.error("Error deleting task:", err);
    res.status(500).json({
      message: "Server error. Could not delete task."
    });
  }
});

// Serve frontend static assets if built
const path = require("path");
const clientDist = path.join(__dirname, "client", "dist");
app.use(express.static(clientDist));

// SPA fallback
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/tasks") || req.path === "/health") {
    return next();
  }
  const indexPath = path.join(clientDist, "index.html");
  if (require("fs").existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

// Server configuration
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;