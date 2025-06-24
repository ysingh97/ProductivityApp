import React, { useState, useEffect } from "react";
import { fetchGoals } from '../services/goalService'
import Select from 'react-select';
import { useLocation } from "react-router-dom";

const GoalForm = ({ onSubmit }) => {
  const [parentGoals, setParentGoals] = useState([]);

  const location = useLocation();
  const parentGoal = location.state?.parentGoal || null;
  const isParentGoalFixed = location.state?.isParentGoalFixed || false;
  console.log("isParentGoalFixed: ", isParentGoalFixed);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // const [selectedList, setSelectedList] = useState(null);
  const [selectedParentGoal, setSelectedParentGoal] = useState(null);
  const [error, setError] = useState(null);

  // console.log("Goal Form - listId: ", listId, ". isFixed: ", isListFixed, ". selectedList: ", selectedList);
  
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent page reload
    const goalData = {
        title,
        description,
        parentGoal: selectedParentGoal?.value
        // listId: selectedList.value
    };
    onSubmit(goalData);
    setTitle("");
    setDescription("");
  };

  useEffect(() => {
      console.log("goalForm useEffect");   
      const loadData = async () => {
        try {
          const [goalResponse] = await Promise.all([
            // fetchLists(),
            fetchGoals()
          ]);
          // setLists(listResponse);
          setParentGoals(goalResponse);
          // console.log("goal form use effect response: ", goalResponse);
        } catch (err) {
          setError('Failed to load goals');
          console.error(err.message);
        } 
      };
      loadData();
    }, []);

  useEffect(() => {
    // If goal page is entered from another goal, provide parent goal as default parent goal
    var defaultParentGoal = (parentGoal && isParentGoalFixed) ? { value: parentGoal._id, label: parentGoal.title } : null;
    setSelectedParentGoal(defaultParentGoal);
    console.log("default parent goal: ", defaultParentGoal);
  }, [parentGoal, isParentGoalFixed]);

  var selectedParentGoalOptions = parentGoals.map(parentGoal => ({
    value: parentGoal._id,
    label: parentGoal.title
  }));
  console.log("Parent goals: ", parentGoals);

  if (isParentGoalFixed && !selectedParentGoal) {
    return <p>Loading parent goal...</p>;
  }

  if (parentGoals.length === 0) {
    return <p>Loading goals...</p>;
  }

  return (
    <div>
      <h2>Set a New Goal</h2>
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
            <label htmlFor="goal">Parent Goal:</label>
            <Select options={selectedParentGoalOptions}
                    value={selectedParentGoal}
                    onChange={(option) => setSelectedParentGoal(option)}
                    isDisabled={isParentGoalFixed}/>
        </div>
        <button type="submit">Set Goal</button>
      </form>
    </div>
  );
};

export default GoalForm;