import ListForm from './listForm';
import React, { useState } from "react";
import { Link } from 'react-router-dom';
import { createList } from './listService';

const CreateListPage = () => {
    const [lists, setLists] = useState([]);
    const [error, setError] = useState(null);

    const handleListSubmit = async (listData) => {
        setError(null); // Clear any previous errors
    
        try {
          // POST request to the backend
          const response = await createList(listData);
          const createdList = response.data;
          console.log("handleListSubmit - created list: ", createdList);
          setLists((prevLists) => [...prevLists, createdList]); // Update list of lists
        } catch (err) {
          setError(err.message);
        }
    };


    return (
        <div>
        <h1>Create List</h1>
        <ListForm onSubmit={handleListSubmit}/>
        <Link to="/board">Back to Taskboard</Link>
        </div>
    );
};

export default CreateListPage;
