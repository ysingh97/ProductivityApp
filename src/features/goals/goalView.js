import React, { useState, useEffect } from 'react';
import { fetchGoalById } from './goalService';
import { Link } from "react-router-dom";

const GoalView = ({ goal }) => {
    const [parentGoal, setParentGoal] = useState(null);
    //console.log("rendering goalview goal: ", goal);

    useEffect(() => {
        //console.log("goal view useeffect: goal", goal);
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
            {goal.targetCompletionDate && (
                <p>Target Completion: {new Date(goal.targetCompletionDate).toLocaleString()}</p>
            )}
            {parentGoal && <p>Parent Goal: {parentGoal.title}</p>}
            <Link to={`/goal/${goal._id}/edit`}>Edit Goal</Link>
            <Link
                to="/goal/new"
                state={{ parentGoal: goal, isParentGoalFixed: true }}
            >Create Sub-Goal</Link>
            <Link to={`/task/new?goalId=${goal._id}`}>Create Sub-Task</Link>
            <Link to="/board">Back to Taskboard</Link>
        </div>
    )
}

export default GoalView;
