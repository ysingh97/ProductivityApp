import ListForm from '../features/listForm';
import React, { useState } from "react";
import { Link } from 'react-router-dom';
import axios from 'axios';
import { createList } from '../services/listService';

const CreateListPage = () => {
    const [lists, setLists] = useState([]);
    const [error, setError] = useState(null);

    const handleListSubmit = async (listData) => {
        setError(null); // Clear any previous errors
    
        try {
          // POST request to the backend
          const response = await createList(listData);
          const createdList = response.data;

          // const response = await fetch("http://localhost:5000/api/lists", {
          //   method: "POST",
          //   headers: {
          //     "Content-Type": "application/json",
          //   },
          //   body: JSON.stringify(listData),
          // });
    
          // if (!response.ok) {
          //   throw new Error("Failed to add list");
          // }
    
          // const newList = await response.json();
          setLists((prevLists) => [...prevLists, createdList]); // Update list of lists
        } catch (err) {
          setError(err.message);
        }
    };


    return (
        <div>
        <h1>Create List</h1>
        <ListForm onSubmit={handleListSubmit}/>
        <Link to="/">Back to Taskboard</Link>
        </div>
    );
};

export default CreateListPage;