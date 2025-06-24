import React, { useState, useEffect } from 'react';
import { fetchGoalById } from '../services/goalService';
import { Link } from "react-router-dom";

const GoalView = ({ goal }) => {
    const [parentGoal, setParentGoal] = useState(null);
    console.log("rendering goalview goal: ", goal);

    useEffect(() => {
        console.log("goal view useeffect: goal", goal);
        if (goal && goal.parentGoal) {
            const loadData = async() => {
                try {
                    const parentGoal = await fetchGoalById(goal.parentGoal);
                    setParentGoal(parentGoal);
                } catch (err) {
                    console.error(err.message);
                }
            }
            loadData();
        }
    }, [goal]);

    if (!goal) {
        return <p>Loading goal...</p>;
    }

    return (
        <div>
            <p>Goal test</p>
            <p>Goal: {goal.title}</p>
            <p>Description: {goal.description}</p>
            {parentGoal && <p>Parent Goal: {parentGoal.title}</p>}
            <Link
                to="/createGoalPage"
                state={{ parentGoal: goal, isParentGoalFixed: true }}
            >Create Sub-Goal</Link>
            <Link to="/">Back to Taskboard</Link>
        </div>
    )
}

export default GoalView;