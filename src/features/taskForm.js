import React, { useState, useEffect } from "react";
import { fetchLists } from '../services/listService';
import Select from 'react-select';

const TaskForm = ({ onSubmit }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedList, setSelectedList] = useState(null);
  const [lists, setLists] = useState([]);
  const [error, setError] = useState(null); // State to track errors

  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent page reload
    const taskData = {
        title,
        description,
        listId: selectedList.value
    };
    onSubmit(taskData); // Pass form data to parent
    setTitle(""); // Clear the form fields
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
      loadLists(); // Call the function on component mount
    }, []); // Empty dependency array ensures it runs once on mount

//   var options = [
//     { value: 'chocolate', label: 'Chocolate' },
//     { value: 'strawberry', label: 'Strawberry' },
//     { value: 'vanilla', label: 'Vanilla' }
//   ]

  var options = lists.map(list => ({
    value: list._id,
    label: list.title
  }));

  console.log(lists);
  console.log(options);

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
                    value = {selectedList}
                    onChange = {(option) => setSelectedList(option)} />
        </div>
        <button type="submit">Add Task</button>
      </form>
    </div>
  );
};

export default TaskForm;