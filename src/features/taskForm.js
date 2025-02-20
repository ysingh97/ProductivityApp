import React, { useState, useEffect } from "react";
import { fetchLists } from '../services/listService';
import Select from 'react-select';
import { useLocation } from "react-router-dom";

const TaskForm = ({ onSubmit }) => {
  const [lists, setLists] = useState([]);

  const location = useLocation();
  const listId = location.state?.listId || null;
  const isListFixed = location.state?.isListFixed || false;
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedList, setSelectedList] = useState(null);
  const [error, setError] = useState(null);

  console.log("Task Form - listId: ", listId, ". isFixed: ", isListFixed, ". selectedList: ", selectedList);
  
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent page reload
    const taskData = {
        title,
        description,
        listId: selectedList.value
    };
    onSubmit(taskData);
    setTitle("");
    setDescription("");
  };

  useEffect(() => {
      const loadLists = async () => {
        try {
          const response = await fetchLists();
          const listData = response.data;
          setLists(listData);
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
      console.log("list with listId: ", list);
      defaultSelectedList = list ? { value: listId, label: list.title } : null;
      setSelectedList(defaultSelectedList);
    }
    console.log("defaultselectedlist: ", defaultSelectedList);
  }, [lists, listId, isListFixed]);

  var options = lists.map(list => ({
    value: list._id,
    label: list.title
  }));

  console.log("taskform - options: ", options);
  console.log("taskform - selectedList: ", selectedList);

  
  // console.log("taskform - defaultselectedlist: ", defaultSelectedList);
  // useEffect(() => {
    
  //   if (defaultSelectedList && selectedList !== defaultSelectedList) {
  //     setSelectedList(defaultSelectedList);
  //   }
  // }, []);

  

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
            <Select options={options}
                    value={selectedList}
                    onChange={(option) => setSelectedList(option)}
                    isDisabled={isListFixed}/>
        </div>
        <button type="submit">Add Task</button>
      </form>
    </div>
  );
};

export default TaskForm;