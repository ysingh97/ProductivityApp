import React from 'react';
import { Link } from "react-router-dom";

const GoalView = ({ goal }) => {

    console.log("rendering goalview goal: ", goal);

    if (!goal) {
        return <p>Loading goal...</p>;
    }

    return (
        <div>
            <p>Goal test</p>
            <p>Goal: {goal.title}</p>
            <p>Description: {goal.description}</p>
            <Link
                to="/createGoalPage"
                state={{ parentGoal: goal, isParentGoalFixed: true }}
            >Create Sub-Goal</Link>
            <Link to="/">Back to Taskboard</Link>
        </div>
    )
}

export default GoalView;