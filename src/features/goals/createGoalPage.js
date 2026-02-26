import GoalForm from './goalForm';
import React, { useEffect, useState } from "react";
import { Link, useParams } from 'react-router-dom';
import { createGoal, updateGoal, fetchGoalById } from './goalService';

const CreateGoalPage = () => {
    const [goals, setGoals] = useState([]);
    const [error, setError] = useState(null);
    const { goalId } = useParams();
    const [goal, setGoal] = useState(null);
    const [loading, setLoading] = useState(false);
    const isEditing = Boolean(goalId);

    useEffect(() => {
        if (!isEditing) {
            setGoal(null);
            return;
        }

        setLoading(true);
        const loadGoal = async () => {
            try {
                const goalData = await fetchGoalById(goalId);
                setGoal(goalData);
            } catch (err) {
                setError('Failed to load goal');
                console.error(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadGoal();
    }, [goalId, isEditing]);

    const handleGoalSubmit = async (goalData) => {
        setError(null); // Clear any previous errors
    
        try {
          if (isEditing && goal) {
            const updatedGoal = await updateGoal(goal._id, goalData);
            setGoals((prevGoals) =>
              prevGoals.map((g) => (g._id === updatedGoal._id ? updatedGoal : g))
            );
          } else {
            const newGoal = await createGoal(goalData);
            setGoals((prevGoals) => [...prevGoals, newGoal]);
          }
        } catch (err) {
          setError(err.message);
        }
    };


    return (
        <div>
        <h1>{isEditing ? "Update Goal" : "Create Goal"}</h1>
        {error && <p>{error}</p>}
        {loading ? (
          <p>Loading goal...</p>
        ) : (
          <GoalForm goal={goal} isEditing={isEditing} onSubmit={handleGoalSubmit}/>
        )}
        <Link to="/board">Back to Taskboard</Link>
        </div>
    );
};

export default CreateGoalPage;
