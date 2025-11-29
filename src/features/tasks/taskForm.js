import React, { useState, useEffect } from "react";
import { fetchLists } from '../lists/listService';
import { fetchGoals } from '../goals/goalService';
import Select from 'react-select';
import DateTimePicker from '../../components/DateTimePicker';
import { useLocation } from "react-router-dom";

const TaskForm = ({ task, onSubmit }) => {
  const [lists, setLists] = useState([]);
  const [parentGoals, setParentGoals] = useState([]);

  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [estimatedCompletionTime, setEstimatedCompletionTime] = useState(
    task?.estimatedCompletionTime || 0
  );
  const [targetCompletionDate, setTargetCompletionDate] = useState(
    task?.targetCompletionDate ? new Date(task.targetCompletionDate) : null
  );


  const [selectedList, setSelectedList] = useState(null);
  const [selectedParentGoal, setSelectedParentGoal] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch lists and goals
  useEffect(() => {
    const loadListsAndGoals = async () => {
      setLoading(true);
      try {
        const [listResponse, goalResponse] = await Promise.all([
          fetchLists(),
          fetchGoals(),
        ]);
        setLists(listResponse);
        setParentGoals(goalResponse);
      } catch (err) {
        setError("Failed to load tasks");
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadListsAndGoals();
  }, []);

  // set form fields when task prop changes (e.g., when editing a different task)
  useEffect(() => {
    setTitle(task?.title || "");
    setDescription(task?.description || "");
    setEstimatedCompletionTime(task?.estimatedCompletionTime || 0);
    setSelectedList(null);
    setSelectedParentGoal(null);
    setTargetCompletionDate(task?.targetCompletionDate ? new Date(task.targetCompletionDate) : null);
  }, [task]);

  // Once lists/parentGoals are loaded, set initial selected values
  useEffect(() => {
    if (!loading) {
      const listOptions = lists.map((list) => ({
        value: list._id,
        label: list.title,
      }));
      const parentGoalOptions = parentGoals.map((pg) => ({
        value: pg._id,
        label: pg.title,
      }));

      if (task?.listId) {
        const match = listOptions.find((o) => o.value === task.listId);
        setSelectedList(match || null);
      }

      if (task?.parentGoalId) {
        const match = parentGoalOptions.find(
          (o) => o.value === task.parentGoalId
        );
        setSelectedParentGoal(match || null);
      }
    }
  }, [loading, lists, parentGoals, task]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const taskData = {
      title,
      description,
      listId: selectedList?.value,
      parentGoalId: selectedParentGoal?.value,
      estimatedCompletionTime,
    };
    onSubmit(taskData);

    // clear form after submit if you're in "create" mode
    setTitle("");
    setDescription("");
    setEstimatedCompletionTime(0);
    setSelectedList(null);
    setSelectedParentGoal(null);
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  const listOptions = lists.map((list) => ({
    value: list._id,
    label: list.title,
  }));
  const parentGoalOptions = parentGoals.map((pg) => ({
    value: pg._id,
    label: pg.title,
  }));

  return (
    <div>
      <h2>{task ? "Update Task" : "Create Task"}</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="title">Title:</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="description">Description:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="list">List:</label>
          <Select
            options={listOptions}
            value={selectedList}
            onChange={setSelectedList}
          />
        </div>

        <div>
          <label htmlFor="parentGoal">Parent Goal:</label>
          <Select
            options={parentGoalOptions}
            value={selectedParentGoal}
            onChange={setSelectedParentGoal}
          />
        </div>

        <div>
          <label htmlFor="estimatedCompletionTime">
            Estimated Completion Time:
          </label>
          <input
            id="estimatedCompletionTime"
            type="number"
            step="0.01"
            value={estimatedCompletionTime}
            onChange={(e) => setEstimatedCompletionTime(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="targetCompletionDate">Target Completion Date:</label>
          <DateTimePicker
            value={targetCompletionDate}
            onChange={(newValue) => setTargetCompletionDate(newValue?.toDate ? newValue.toDate() : newValue)}
          />
        </div>
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default TaskForm;