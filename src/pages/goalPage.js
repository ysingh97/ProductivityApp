import React, { useState, useEffect } from 'react';
import { deleteGoal, fetchGoalById } from '../services/goalService';
import GoalView from '../features/goalView';
import { Link, useParams } from "react-router-dom";

const GoalPage = () => {
  const [goal, setGoal] = useState(null);
  const { goalId } = useParams();

  console.log("GoalPage is rendering", goalId);

  useEffect(() => {
    console.log("useEffect is running", goalId);
    const loadGoal = async () => {
    try {
        const goalData = await fetchGoalById(goalId)
        setGoal(goalData);
    } catch (err) {
        console.error(err.message);
    }
   };

    loadGoal();
  }, [goalId]);
  console.log("goalPage goal: ", goal);
  return (
    <div>
        <GoalView goal={goal}/>
      {/* <p>Goal Page for {goalId}</p> */}
    </div>
  );
};

export default GoalPage;