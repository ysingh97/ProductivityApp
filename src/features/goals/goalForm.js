import React, { useState, useEffect } from "react";
import { fetchGoals } from './goalService'
import { fetchCategories } from '../categories/categoryService';
import Select from 'react-select';
import { useLocation } from "react-router-dom";
import dayjs from 'dayjs';
import DateTimePicker from '../../components/DateTimePicker';

const getCategoryTitle = (value) => {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  return value.title || "";
};

const GoalForm = ({ onSubmit, goal, isEditing: isEditingProp }) => {
  const [parentGoals, setParentGoals] = useState([]);
  const [categories, setCategories] = useState([]);
  const isEditing = Boolean(isEditingProp || goal);

  const location = useLocation();
  const parentGoal = !isEditing ? location.state?.parentGoal || null : null;
  const isParentGoalFixed = !isEditing ? location.state?.isParentGoalFixed || false : false;
  //console.log("isParentGoalFixed: ", isParentGoalFixed);
  
  const [title, setTitle] = useState(goal?.title || "");
  const [description, setDescription] = useState(goal?.description || "");
  const [category, setCategory] = useState(getCategoryTitle(goal?.category));
  const [targetCompletionDate, setTargetCompletionDate] = useState(
    goal?.targetCompletionDate ? dayjs(goal.targetCompletionDate) : null
  );
  // const [selectedList, setSelectedList] = useState(null);
  const [selectedParentGoal, setSelectedParentGoal] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // console.log("Goal Form - listId: ", listId, ". isFixed: ", isListFixed, ". selectedList: ", selectedList);
  
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent page reload
    const goalData = {
        title,
        description,
        parentGoalId: selectedParentGoal?.value,
        targetCompletionDate: targetCompletionDate ? targetCompletionDate.toDate() : null
        // listId: selectedList.value
    };
    if (!selectedParentGoal?.value) {
      goalData.category = category;
    }
    onSubmit(goalData);
    setTitle("");
    setDescription("");
    setCategory("");
    setTargetCompletionDate(null);
  };

  useEffect(() => {
    if (!goal) {
      if (!isEditing) {
        setTitle("");
        setDescription("");
        setCategory("");
        setTargetCompletionDate(null);
      }
      return;
    }

    setTitle(goal.title || "");
    setDescription(goal.description || "");
    setCategory(getCategoryTitle(goal.category));
    setTargetCompletionDate(
      goal.targetCompletionDate ? dayjs(goal.targetCompletionDate) : null
    );
  }, [goal, isEditing]);

  useEffect(() => {
      //console.log("goalForm useEffect");   
      const loadData = async () => {
        setLoading(true);
        try {
          const [goalResponse, categoryResponse] = await Promise.all([
            // fetchLists(),
            fetchGoals(),
            fetchCategories()
          ]);
          // setLists(listResponse);
          setParentGoals(goalResponse);
          setCategories(categoryResponse);
          // console.log("goal form use effect response: ", goalResponse);
        } catch (err) {
          setError('Failed to load goals or categories');
          console.error(err.message);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }, []);

  useEffect(() => {
    if (loading) return;

    if (isEditing) {
      if (!goal?.parentGoalId) {
        setSelectedParentGoal(null);
        return;
      }
      const match = parentGoals.find((pg) => pg._id === goal.parentGoalId);
      setSelectedParentGoal(
        match
          ? { value: match._id, label: match.title, categoryTitle: getCategoryTitle(match.category) }
          : null
      );
      return;
    }

    // If goal page is entered from another goal, provide parent goal as default parent goal
    const defaultParentGoal = (parentGoal && isParentGoalFixed)
      ? { value: parentGoal._id, label: parentGoal.title, categoryTitle: getCategoryTitle(parentGoal.category) }
      : null;
    setSelectedParentGoal(defaultParentGoal);
    //console.log("default parent goal: ", defaultParentGoal);
  }, [loading, isEditing, goal, parentGoals, parentGoal, isParentGoalFixed]);

  useEffect(() => {
    if (selectedParentGoal) {
      setCategory(selectedParentGoal.categoryTitle || "");
    }
  }, [selectedParentGoal]);

  const selectedParentGoalOptions = parentGoals
    .filter((pg) => !goal || pg._id !== goal._id)
    .map(parentGoal => ({
      value: parentGoal._id,
      label: parentGoal.title,
      categoryTitle: getCategoryTitle(parentGoal.category)
    }));
  //console.log("Parent goals: ", parentGoals);

  if (isParentGoalFixed && parentGoal && !selectedParentGoal) {
    return <p>Loading parent goal...</p>;
  }

  return (
    <div>
      <h2>{isEditing ? "Update Goal" : "Set a New Goal"}</h2>
      {error && <p>{error}</p>}
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
          <label htmlFor="category">Category:</label>
          <input
            id="category"
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={Boolean(selectedParentGoal)}
            list="category-options"
          />
          <datalist id="category-options">
            {categories.map((categoryOption) => (
              <option key={categoryOption._id} value={categoryOption.title} />
            ))}
          </datalist>
          {selectedParentGoal && (
            <p>Category is inherited from the parent goal.</p>
          )}
        </div>
        <div>
          <label htmlFor="targetCompletionDate">Target Completion Date:</label>
          <DateTimePicker
            value={targetCompletionDate}
            onChange={setTargetCompletionDate}
          />
        </div>
        <div>
            <label htmlFor="goal">Parent Goal:</label>
            <Select options={selectedParentGoalOptions}
                    value={selectedParentGoal}
                    onChange={(option) => setSelectedParentGoal(option)}
                    isDisabled={isParentGoalFixed || loading}
                    placeholder={loading ? "Loading goals..." : "Optional parent goal"}/>
            {!loading && parentGoals.length === 0 && (
              <p>No parent goals yet. This goal will be top-level.</p>
            )}
        </div>
        <button type="submit">{isEditing ? "Update Goal" : "Set Goal"}</button>
      </form>
    </div>
  );
};

export default GoalForm;
