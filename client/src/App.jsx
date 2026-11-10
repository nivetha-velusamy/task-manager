
import React, { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, "")
  : (typeof window !== "undefined" && (window.location.port === "5173" || window.location.port === "3000"))
  ? "http://localhost:5000"
  : "";

const App = () => {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/tasks`);
      setTasks(response.data);
      setError(null);
    } catch (err) {
      setError("Could not fetch tasks.");
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Create a new task
  const createTask = async () => {
    if (!title.trim()) {
      setError("Task title cannot be empty.");
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/tasks`, { title });
      setTasks([...tasks, response.data]);
      setTitle("");
      setError(null);
      setSuccess("Task created successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Could not create task.");
      console.error(err);
    }
  };

  // Update task status
  const updateTaskStatus = async (id, newStatus) => {
    try {
      const response = await axios.patch(`${API_BASE_URL}/tasks/${id}`, {
        status: newStatus
      });

      setTasks(
        tasks.map((task) =>
          task._id === id ? response.data : task
        )
      );

      setSuccess("Task status updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Could not update task status.");
      console.error(err);
    }
  };

  // Update task title (Edit task)
  const updateTaskTitle = async (id, newTitle) => {
    if (!newTitle.trim()) {
      setError("Task title cannot be empty.");
      return;
    }

    try {
      const response = await axios.patch(`${API_BASE_URL}/tasks/${id}`, {
        title: newTitle
      });

      setTasks(
        tasks.map((task) =>
          task._id === id ? response.data : task
        )
      );

      setSuccess("Task updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Could not update task.");
      console.error(err);
    }
  };

  // Delete a task
  const deleteTask = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/tasks/${id}`);
      setTasks(tasks.filter((task) => task._id !== id));
      setSuccess("Task deleted successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Could not delete task.");
      console.error(err);
    }
  };

  return (
    <div className="container mt-5">
      <h1 className="text-center">Task Manager</h1>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      <div className="input-group mb-3">
        <input
          type="text"
          className="form-control"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter task title"
        />

        <button
          className="btn btn-primary"
          onClick={createTask}
        >
          Add Task
        </button>
      </div>

      <div className="row">
        {["Pending", "Ongoing", "Completed"].map(
          (status) => (
            <div className="col-md-4" key={status}>
              <div className="card mb-4">
                <div className="card-header">
                  <h5>{status} Tasks</h5>
                </div>

                <div className="card-body">
                  {tasks
                    .filter(
                      (task) => task.status === status
                    )
                    .map((task) => (
                      <TaskCard
                        key={task._id}
                        task={task}
                        onUpdateStatus={updateTaskStatus}
                        onUpdateTitle={updateTaskTitle}
                        onDelete={deleteTask}
                      />
                    ))}

                  {tasks.filter(
                    (task) => task.status === status
                  ).length === 0 && (
                    <p className="text-muted">
                      No tasks in this category.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

const TaskCard = ({
  task,
  onUpdateStatus,
  onUpdateTitle,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    await onUpdateTitle(task._id, editTitle);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(task.title);
    setIsEditing(false);
  };

  return (
    <div className="card mb-2">
      <div className="card-body">
        {isEditing ? (
          <div className="mb-2">
            <input
              type="text"
              className="form-control mb-2"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <div className="btn-group btn-group-sm">
              <button className="btn btn-primary" onClick={handleSaveEdit}>
                Save
              </button>
              <button className="btn btn-secondary" onClick={handleCancelEdit}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="d-flex justify-content-between align-items-center mb-1">
            <h6 className="card-title mb-0">{task.title}</h6>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setIsEditing(true)}
              title="Edit Task"
            >
              Edit
            </button>
          </div>
        )}

        <p className="card-text">
          Status: {task.status}
        </p>

        <div className="btn-group" role="group">
          {task.status !== "Ongoing" && (
            <button
              className="btn btn-info"
              onClick={() =>
                onUpdateStatus(task._id, "Ongoing")
              }
            >
              Mark as Ongoing
            </button>
          )}

          {task.status !== "Completed" && (
            <button
              className="btn btn-success"
              onClick={() =>
                onUpdateStatus(task._id, "Completed")
              }
            >
              Mark as Completed
            </button>
          )}

          <button
            className="btn btn-danger"
            onClick={() => onDelete(task._id)}
          >
            Delete Task
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;