import React, { useState, useEffect } from "react";
import { fetchLists } from '../lists/listService';
import { fetchGoals } from '../goals/goalService';
import Select from 'react-select';
import { useLocation } from "react-router-dom";

const TaskForm = ({ onSubmit }) => {
  const [lists, setLists] = useState([]);
  const [parentGoals, setParentGoals] = useState([]);

  const location = useLocation();
  const listId = location.state?.listId || null;
  const isListFixed = location.state?.isListFixed || false;
  const parentGoal = location.state?.parentGoal || null;
  const isParentGoalFixed = location.state?.isParentGoalFixed || false;
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedList, setSelectedList] = useState(null);
  const [selectedParentGoal, setSelectedParentGoal] = useState(null);
  const [error, setError] = useState(null);

  //console.log("Task Form - listId: ", listId, ". isFixed: ", isListFixed, ". selectedList: ", selectedList);
  
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent page reload
    console.log(`handle submit: title: ${title} - description: ${description} - list: ${selectedList?.value} - parentGoal: ${selectedParentGoal?.value}`)
    const taskData = {
        title,
        description,
        listId: selectedList?.value,
        parentGoalId: selectedParentGoal?.value
    };
    onSubmit(taskData);
    setTitle("");
    setDescription("");
  };

  useEffect(() => {
      //console.log("taskForm useEffect");
      const loadLists = async () => {
        try {
          const [listResponse, goalResponse] = await Promise.all([
              fetchLists(),
              fetchGoals()
          ]);
          setLists(listResponse);
          setParentGoals(goalResponse);
        } catch (err) {
          setError('Failed to load tasks');
          console.error(err.message);
        } 
      };
      loadLists();
    }, []);

  useEffect(() => {
    var defaultSelectedList = null;
    if (listId && isListFixed) {
      var list = lists.find(list => list._id === listId);
      //console.log("list with listId: ", list);
      defaultSelectedList = list ? { value: listId, label: list.title } : null;
      setSelectedList(defaultSelectedList);
    }
    //console.log("defaultselectedlist: ", defaultSelectedList);
  }, [lists, listId, isListFixed]);

  useEffect(() => {
      // If goal page is entered from another goal, provide parent goal as default parent goal
      var defaultParentGoal = (parentGoal && isParentGoalFixed) ? { value: parentGoal._id, label: parentGoal.title } : null;
      setSelectedParentGoal(defaultParentGoal);
      console.log("default parent goal: ", defaultParentGoal);
    }, [parentGoal, isParentGoalFixed]);

  var selectedListOptions = lists.map(list => ({
    value: list._id,
    label: list.title
  }));

  var selectedParentGoalOptions = parentGoals.map(parentGoal => ({
    value: parentGoal._id,
    label: parentGoal.title
  }));



  //console.log("taskform - options: ", selectedListOptions);
  //console.log("taskform - selectedList: ", selectedList);

  
  // console.log("taskform - defaultselectedlist: ", defaultSelectedList);
  // useEffect(() => {
    
  //   if (defaultSelectedList && selectedList !== defaultSelectedList) {
  //     setSelectedList(defaultSelectedList);
  //   }
  // }, []);

  console.log("parentgoal optionss: ", selectedParentGoalOptions);

  return (
    <div>
      <h2>Add a New Task</h2>
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
            <Select options={selectedListOptions}
                    value={selectedList}
                    onChange={(option) => setSelectedList(option)}
                    isDisabled={isListFixed}/>
        </div>
        <div>
            <label htmlFor="list">Parent Goal:</label>
            <Select options={selectedParentGoalOptions}
                    value={selectedParentGoal}
                    onChange={(option) => setSelectedParentGoal(option)}
                    isDisabled={isParentGoalFixed}/>
        </div>
        <button type="submit">Add Task</button>
      </form>
    </div>
  );
};

export default TaskForm;